import os
import json
import re
import hashlib
from time import time
import time as time_module
from typing import List, Dict, Any, Optional
from rapidfuzz import fuzz
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

# Caching mechanism to avoid redundant processing of chunks
def get_chunk_hash(text: str) -> str:
    """Creates a unique ID for a chunk based on its text."""
    return hashlib.md5(text.encode('utf-8')).hexdigest()


def get_neo4j_driver():
    """Initializes and returns the Neo4j database driver."""
    try:
        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        driver.verify_connectivity()
        return driver
    except Exception as e:
        print(f"Failed to connect to Neo4j. Is the database docker running? Error: {e}")
        return None

def generate_domain_ontology(llm_client, document_summary: str) -> List[str]:
    """
    Analyzes the document summary to generate a custom relationship schema.
    This prevents the graph from shattering into millions of synonyms.
    """
    print("Generating custom relationship schema (Ontology)...")
    prompt = f"""You are an expert Ontology Architect.
Read the following document summary and define the 15 most important, distinct types of relationships (predicates) that exist between entities in this domain.

CRITICAL INSTRUCTIONS:
- Return ONLY a JSON object with a single key 'relations' containing a list of atmost 15 strings.
- Relationships must be concise (1-2 words), generic, and snake_case (e.g., "owns", "competitor_of", "causes").

Document Summary:
{document_summary}
"""
    try:
        response = llm_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=os.getenv("GENERATION_MODEL", "thinkingmachines/inkling-small:free"),
            temperature=0.0,
            response_format={"type": "json_object"}
        )
        ontology = json.loads(response.choices[0].message.content).get("relations", [])
        print(f"Generated Ontology: {ontology[:5]}")
        return ontology
    except Exception as e:
        print(f"Ontology generation failed: {e}")
        return ["connected_to", "part_of", "caused", "created", "owned_by"] # Genetic fallback ontology

def extract_triplets(llm_client, text: str, ontology: List[str], max_retries: int = 3) -> List[Dict[str, str]]:
    """
    Extracts triplets enforcing the custom ontology and resolving pronouns.
    """
    ontology_str = ", ".join(ontology)

    prompt = f"""You are a strict Knowledge Graph extraction engine.
Extract relationships from the text into a JSON list of triplets.

CRITICAL INSTRUCTIONS:
1. NEVER extract pronouns (he, she, they). Resolve pronouns to the specific proper noun using context.
2. Use the most complete version of a name (e.g., "Albert Einstein" instead of "Einstein").
3. You MUST choose relationships ONLY from this list: {ontology_str}

Text: {text}

Output format:
{{"triplets": [{{"source": "Entity1", "relation": "chosen_relation", "target": "Entity2"}}]}}
"""
    for attempt in range(max_retries):
        try:
            response = llm_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=os.getenv("GENERATION_MODEL", "thinkingmachines/inkling-small:free"),
                temperature=0.0,
                response_format={"type": "json_object"}
            )
            triplets = json.loads(response.choices[0].message.content).get("triplets", [])
            return triplets
        except Exception as e:
            error_msg = str(e).lower()
            if "rate limit" in error_msg or "429" in error_msg:
                wait_time = 10 * (attempt + 1)
                print(f"[GraphRAG] Rate limit hit! Sleeping for {wait_time}s...")
                time_module.sleep(wait_time)
            else:
                print(f"[GraphRAG] Extraction failed: {e}")
                break
    return []

def resolve_entities(triplets: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """
    Uses Levenshtein distance (RapidFuzz) and substring matching to merge 
    variations of the same entity (e.g., "Aegon" and "Aegon Targaryen").
    """
    print("Running Fuzzy Entity Canonicalization...")
    all_entities = set()
    for t in triplets:
        if t.get("source"): all_entities.add(t["source"].strip())
        if t.get("target"): all_entities.add(t["target"].strip())

    sorted_entities = sorted(list(all_entities), key=len, reverse=True)
    entity_map = {}

    for entity in sorted_entities:
        mapped = False
        for canonical in set(entity_map.values()):
            # Substring Match
            if re.search(r'\b' + re.escape(entity.lower()) + r'\b', canonical.lower()):
                entity_map[entity] = canonical
                mapped = True
                break

            # Fuzzy Match via RapidFuzz
            if fuzz.ratio(entity.lower(), canonical.lower()) > 85.0:
                entity_map[entity] = canonical
                mapped = True
                break
                
        if not mapped:
            entity_map[entity] = entity

    normalized_triplets = []
    for t in triplets:
        src, rel, trg = t["source"].strip(), t["relation"].strip(), t["target"].strip()
        normalized_triplet = t.copy()
        normalized_triplet["source"] = entity_map.get(src, src)
        normalized_triplet["target"] = entity_map.get(trg, trg)
        normalized_triplets.append(normalized_triplet)
    return normalized_triplets

def build_knowledge_graph(chunks: List[Dict[str, Any]], llm_client, document_name: Optional[str] = None):
    """
    Orchestrates extraction, canonicalization, and ingestion into Neo4j.
    Now includes robust Checkpointing to survive API crashes!
    """
    driver = get_neo4j_driver()
    if not driver:
        return

    checkpoint_file = f"checkpoint_{hashlib.md5((document_name or 'global').encode('utf-8')).hexdigest()}.json"

    # Load Checkpoint Cache
    extracted_cache = {}
    if os.path.exists(checkpoint_file):
        try:
            with open(checkpoint_file, "r") as f:
                extracted_cache = json.load(f)
            print(f"[Checkpoint] Resuming from saved state. Found {len(extracted_cache)} previously extracted chunks.")
        except Exception:
            print("[Checkpoint] Failed to read cache. Starting fresh.")

    matches = [c["text"] for c in chunks if c["metadata"].get("chunk_type") == "raptor_root_summary"]
    root_summary = matches[0] if matches else None
    if not root_summary:
        root_summary = " ".join([c["text"] for c in chunks[:3]])

    ontology = generate_domain_ontology(llm_client, root_summary)

    summary_chunks = [c for c in chunks if "summary" in c["metadata"].get("chunk_type", "")]
    if not summary_chunks:
        print("No summary chunks found for triplet extraction. Using first 10 chunks as fallback.")
        summary_chunks = chunks[:10] 

    all_raw_triplets = []
    for i, chunk in enumerate(summary_chunks):
        chunk_text = chunk["text"]
        chunk_hash = get_chunk_hash(chunk_text)
        chunk_source = chunk["metadata"].get("source", document_name or "unknown")

        if chunk_hash in extracted_cache:
            print(f"Skipping chunk {i+1}/{len(summary_chunks)} (Already processed in checkpoint)...")
            all_raw_triplets.extend(extracted_cache[chunk_hash])
            continue

        print(f"Extracting triplets from chunk {i+1}/{len(summary_chunks)}...")
        triplets = extract_triplets(llm_client, chunk_text, ontology)
        for t in triplets:
            t["source_text"] = chunk_text
            t["source_doc"] = chunk_source

        # Save to Checkpoint Cache
        extracted_cache[chunk_hash] = triplets
        with open(checkpoint_file, "w") as f:
            json.dump(extracted_cache, f)
            print(f"[Checkpoint] Saved progress after processing chunk {i+1}/{len(summary_chunks)}.")

        all_raw_triplets.extend(triplets)
        time_module.sleep(2.5)

    normalized_triplets = resolve_entities(all_raw_triplets)

    print(f"Pushing {len(normalized_triplets)} normalised triplets to Neo4j...")
    with driver.session() as session:
        session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE")
        for t in normalized_triplets:
            # Generic 'CONNECTED_TO' Edge to store relation
            cypher_query = """
            MERGE (s:Entity {id: $source})
            MERGE (t:Entity {id: $target})
            MERGE (s)-[r:CONNECTED_TO {type: $relation}]->(t)
            ON CREATE SET r.source_text = $source_text
            """
            session.run(
                cypher_query, 
                source=t["source"], 
                target=t["target"], 
                relation=t["relation"], 
                source_text=t.get("source_text", ""),
                source_doc=t.get("source_doc", "unknown")
            )
            
    driver.close()
    print("Graph successfully built in Neo4j!")


    if os.path.exists(checkpoint_file):
        os.remove(checkpoint_file)
        
    print("Graph successfully built in Neo4j!")