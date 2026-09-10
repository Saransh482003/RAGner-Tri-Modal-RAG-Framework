import time
import numpy as np
import umap
import os
from sklearn.mixture import GaussianMixture
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from typing import List, Dict, Any
from collections import defaultdict
from tqdm import tqdm

from services.generation import initialize_llm_client
from dotenv import load_dotenv

load_dotenv()

def get_optimal_clusters_gmm(embeddings: np.ndarray, max_clusters: int = 50, random_state: int = 42) -> int:
    """
    Determines the optimal number of clusters for a given set of embeddings 
    using the Bayesian Information Criterion (BIC).
    """
    max_clusters = min(max_clusters, len(embeddings) // 2)
    if max_clusters <= 1:
        return 1

    bics = []
    n_clusters_range = np.arange(1, max_clusters + 1)
    
    for n in n_clusters_range:
        gmm = GaussianMixture(n_components=n, random_state=random_state)
        gmm.fit(embeddings)
        bics.append(gmm.bic(embeddings))
        
    optimal_n = n_clusters_range[np.argmin(bics)]
    return optimal_n

def get_optimal_clusters_kmeans(embeddings: np.ndarray, max_clusters: int = 50, random_state: int = 42) -> int:
    """
    Determines the optimal number of clusters for K-Means using the Silhouette Score.
    """
    max_clusters = min(max_clusters, len(embeddings) - 1)
    if max_clusters < 2:
        return 1

    best_k = 2
    best_score = -1.0
    
    for n in range(2, max_clusters + 1):
        kmeans = KMeans(n_clusters=n, init='k-means++', random_state=random_state, n_init='auto')
        labels = kmeans.fit_predict(embeddings)
        
        if len(set(labels)) > 1:
            score = silhouette_score(embeddings, labels)
            if score > best_score:
                best_score = score
                best_k = n   
    return best_k


def perform_clustering(embeddings: np.ndarray, dim: int = 10, algo: str = "kmeans") -> List[int]:
    """
    Reduces dimensionality with UMAP and clusters with K-Means++ or GMM.
    Returns a list of cluster labels corresponding to the input embeddings.
    """
    num_samples = len(embeddings)

    if num_samples <= 3:
        return [0] * num_samples

    # UMAP requires n_neighbors to be less than or equal to the number of samples
    n_neighbors = min(10, num_samples - 1)
    n_components = min(dim, num_samples - 2)

    if n_components >= 2 and num_samples > 10:
        # UMAP is non-linear, which is best for embeddings; PCA is linear hence we don't use it here.
        reducer = umap.UMAP(
            n_neighbors=n_neighbors, 
            n_components=n_components, 
            metric="cosine", 
            random_state=42
        )
        reduced_embeddings = reducer.fit_transform(embeddings)
    else:
        reduced_embeddings = embeddings

    if algo == "kmeans":
        optimal_clusters = get_optimal_clusters_kmeans(reduced_embeddings)
        model = KMeans(n_clusters=optimal_clusters, init='k-means++', random_state=42, n_init='auto')
        labels = model.fit_predict(reduced_embeddings)
    else:
        optimal_clusters = get_optimal_clusters_gmm(reduced_embeddings)
        model = GaussianMixture(n_clusters=optimal_clusters, random_state=42)
        labels = model.fit_predict(reduced_embeddings)
    
    return labels.tolist()

def summarize_cluster(llm_client, texts: List[str], is_root: bool = False, max_retries: int = 3) -> str:
    """
    Prompts the LLM to generate a strict, continuous narrative summary.
    Dynamically switches prompts based on whether it is an intermediate or root summary.
    """
    combined_text = "\n\n---\n\n".join(texts)
    
    if is_root:
        prompt = f"""You are an expert executive summarizer.
Read the following high-level summaries representing an entire document.
Write a final, comprehensive executive overview of the entire file.

CRITICAL CONSTRAINTS:
- HIGHLIGHT IMPORTANT INFO: While providing a high-level overview, you MUST explicitly extract and highlight the most critical information, key metrics, major conclusions, or pivotal events found in the text. Do not write a vague summary.
- Write strictly in continuous paragraphs.
- DO NOT use bullet points, numbered lists, or markdown formatting.
- Do not include any preamble, introductions, or conversational filler. 
- Output ONLY the raw factual narrative summary.

Document Summaries:
{combined_text}
"""
    else:
        prompt = f"""You are an expert research synthesizer. 
Read the following excerpts which have been clustered together because they share a semantic theme.
Write a comprehensive summary that captures the main themes, key details, and important relationships between these texts.

CRITICAL CONSTRAINTS:
- PRESERVE SPECIFICS: Do not generalize away specific numbers, proper nouns, or rare, unique details. If a rare entity, edge case, or highly specific detail is mentioned in the text, you MUST include it in the summary.
- Write strictly in continuous paragraphs.
- DO NOT use bullet points, numbered lists, or markdown formatting.
- Do not include any preamble, introductions, or conversational filler. 
- Output ONLY the raw factual narrative summary.

Excerpts:
{combined_text}
"""
    for attempt in range(max_retries):
        try:
            chat_completion = llm_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=os.getenv("GENERATION_MODEL", "openrouter/free"),
                temperature=0.0, 
                max_tokens=500,
            )
            return chat_completion.choices[0].message.content.strip()
        except Exception as e:
            error_msg = str(e).lower()
            if "rate limit" in error_msg or "429" in error_msg:
                wait_time = 10 * (attempt + 1)
                print(f"[RAPTOR] Rate limit hit! Sleeping for {wait_time}s (Attempt {attempt+1}/{max_retries})...")
                time.sleep(wait_time)
            else:
                print(f"[RAPTOR] Error during cluster summarization: {e}")
                break

def build_raptor_tree(leaf_chunks: List[Dict[str, Any]], embedder, llm_client, max_levels: int = 3, clustering_algo: str = "kmeans") -> List[Dict[str, Any]]:
    """
    The core RAPTOR algorithm. 
    Recursively clusters chunks, summarizes them, and adds the summaries to the tree.
    Returns the "Collapsed Tree" (Leaves + ALL Summary Nodes) ready for Vector DB insertion.
    """
    if not leaf_chunks:
        return []

    print(f"\n--- Starting RAPTOR Tree Construction ({len(leaf_chunks)} leaf nodes) ---")

    collapsed_tree = list(leaf_chunks)
    current_level_nodes = list(leaf_chunks)
    last_processed_level = 0

    for level in range(1, max_levels + 1):
        if len(current_level_nodes) <= 3:
            print(f"Level {level}: 3 or fewer nodes remaining. Stopping recursion.")
            break 

        last_processed_level = level
        print(f"\nProcessing Level {level}...")

        texts = [node["text"] for node in current_level_nodes]
        print(f"Embedding {len(texts)} nodes...")
        embeddings = embedder.embed_documents(texts)
        emb_array = np.array(embeddings)

        labels = perform_clustering(emb_array, dim=10, algo=clustering_algo)

        clusters = defaultdict(list)
        for index, label in enumerate(labels):
            clusters[label].append(current_level_nodes[index])

        next_level_nodes = []
        for cluster_id, nodes in tqdm(clusters.items(), desc=f"Summarizing Level {level}"):
            if len(nodes) == 1:
                next_level_nodes.append(nodes[0])
                continue
            cluster_texts = [node["text"] for node in nodes]
            summary_text = summarize_cluster(llm_client, cluster_texts, is_root=False)
            if not summary_text:
                continue

            summary_node = {
                "text": summary_text,
                "metadata": {
                    "chunk_type": "raptor_summary",
                    "raptor_level": level,
                    "source": nodes[0]["metadata"].get("source", "unknown"),
                    "page_number": "Multiple Pages (Summary)"
                }
            }
            next_level_nodes.append(summary_node)
            collapsed_tree.append(summary_node)

            time.sleep(2)

        current_level_nodes = next_level_nodes

    if len(current_level_nodes) > 1:
        root_level = last_processed_level + 1
        print(f"\n--- Generating Final Root Document Summary (Level {root_level}) ---")
        final_texts = [node["text"] for node in current_level_nodes]
        root_summary_text = summarize_cluster(llm_client, final_texts, is_root=True)

        if root_summary_text:
            root_node = {
                "text": root_summary_text,
                "metadata": {
                    "chunk_type": "raptor_root_summary",
                    "raptor_level": root_level,
                    "source": current_level_nodes[0]["metadata"].get("source", "unknown"),
                    "page_number": "Global Document Summary"
                }
            }
            collapsed_tree.append(root_node)
    return collapsed_tree
