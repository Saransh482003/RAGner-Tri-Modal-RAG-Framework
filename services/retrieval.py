import os
from typing import List, Dict, Any
from qdrant_client import QdrantClient
from langchain_huggingface import HuggingFaceEmbeddings
from sentence_transformers import CrossEncoder

embedder = HuggingFaceEmbeddings(model_name="BAAI/bge-small-en-v1.5")
reranker = CrossEncoder("BAAI/bge-reranker-base")

def retrieve_context(client: QdrantClient, collection_name: str, query: str, bi_encoder_top_k: int = 15, cross_encoder_top_k: int = 3) -> List[Dict[str, Any]]:
    """
    Takes a user query, embeds it, and searches Qdrant for the most similar chunks.
    Returns the payload (text and metadata) of those chunks.
    """
    query_embedding = embedder.embed_query(query)

    search_results = client.query_points(
        collection_name=collection_name,
        query=query_embedding,
        limit=bi_encoder_top_k,
        with_payload=True
    )

    pairs = []
    for hit in search_results.points:
        chunk_text = hit.payload.get("text", "")
        pairs.append([query, chunk_text])

    scores = reranker.predict(pairs) # Scores for each pair of (query, chunk_text)

    scored_results = []
    for i, hit in enumerate(search_results.points):
        payload = hit.payload
        scored_results.append({
            "bi_encoder_score": hit.score,
            "cross_encoder_score": float(scores[i]),
            "text": payload.get("text"),
            "metadata": {
                "page_number": payload.get("page_number"),
                "source": payload.get("source"),
                "chunk_type": payload.get("chunk_type")
            }
        })

    scored_results.sort(key=lambda x: x["cross_encoder_score"], reverse=True)
    retrieved_chunks = scored_results[:cross_encoder_top_k]
    return retrieved_chunks


if __name__ == "__main__":
    import sys
    from pathlib import Path
    root_dir = Path(__file__).resolve().parent.parent
    sys.path.append(str(root_dir))

    from db.qdrant_embedder import get_qdrant_client
    
    COLLECTION_NAME = "resume_project"
    
    try:
        q_client = get_qdrant_client()
        
        test_query = "What was the Net income in 2024?"
        results = retrieve_context(q_client, COLLECTION_NAME, test_query, bi_encoder_top_k=15, cross_encoder_top_k=3)
        
        print("\n--- Retrieval Results ---")
        for i, res in enumerate(results):
            print(f"\nResult {i+1} (Cross-Encoder Score: {res['cross_encoder_score']:.4f}) [Page {res['metadata']['page_number']}]:")
            print("-" * 40)
            print(res["text"])
            print("-" * 40)
            
    except Exception as e:
        print(f"Error during retrieval: {e}")