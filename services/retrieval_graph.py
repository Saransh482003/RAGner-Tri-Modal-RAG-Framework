import os
import json
from typing import List, Dict, Any
from models.graph_query_templates import GRAPH_TEMPLATES
from services.builder_graph import get_neo4j_driver
from dotenv import load_dotenv

load_dotenv()

def retrieve_graph_context(query: str, llm_client) -> List[Dict[str, Any]]:
    """
    Retrieves the context for the questions, by first determining the type of query and then executing the appropriate graph query.
    """
    driver = get_neo4j_driver()
    if not driver:
        raise ConnectionError("Could not connect to Neo4j. Please ensure the database is running and the connection parameters are correct.")

    template_descriptions = {
        key: val["description"] for key, val in GRAPH_TEMPLATES.items()
    }

    valid_relations = []
    with driver.session() as session:
        try:
            res = session.run("MATCH ()-[r:CONNECTED_TO]->() RETURN DISTINCT r.type AS relation LIMIT 20")
            valid_relations = [record["relation"] for record in res if record["relation"]]
        except Exception as e:
            print(f"Warning: Could not fetch relationships from Neo4j: {e}")

    if not valid_relations:
        raise ValueError("No valid relationships found in the Neo4j database. Please ensure that the graph has been populated with data.")


    prompt = f"""You are a Graph Database Dispatcher.
Your job is to read the user's question, choose the best query template to answer it, and extract the required parameters.

AVAILABLE TEMPLATES:
{json.dumps(template_descriptions, indent=2)}

AVAILABLE RELATIONSHIPS (The Graph Ontology):
{', '.join(valid_relations)}

User Question: "{query}"

CRITICAL INSTRUCTIONS:
1. Choose ONE template ID from the list.
2. Extract the required parameters from the user's question. 
3. If extracting an 'action_verb', you MUST choose the closest matching relationship from the 'AVAILABLE RELATIONSHIPS' list. Do not invent new verbs.
4. Output ONLY a valid JSON object.

Output Format Example:
{{"template_id": "relationship_search", "params": {{"entity": "Albert Einstein", "action_verb": "conquered"}}}}
"""
    try:
        response = llm_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=os.getenv("GENERATION_MODEL", "thinkingmachines/inkling-small:free"),
            temperature=0.0,
            response_format={"type": "json_object"}
        )
        decision = json.loads(response.choices[0].message.content)
        template_id = decision.get("template_id")
        params = decision.get("params", {})
    except Exception as e:
        raise ValueError(f"Extraction failed: {e}")

    if template_id not in GRAPH_TEMPLATES:
        return retrieve_graph_context(query, llm_client) # Try again if the template_id is invalid
    
    selected_query = GRAPH_TEMPLATES[template_id]["cypher"]
    print(f"[Graph Retrieval] Using template '{template_id}' with params: {params}")
    retrieved_edges = []
    with driver.session() as session:
        try:
            result = session.run(selected_query, **params)
            for record in result:
                record_text = record.get("chunk_text") or " | ".join([f"{k}: {v}" for k, v in record.items()])
                retrieved_edges.append({
                    "text": record_text,
                    "metadata": {
                        "source": f"Neo4j Graph (Template: {template_id})",
                        "page_number": "Knowledge Graph",
                        "chunk_type": "graph_edge"
                    },
                    "cross_encoder_score": 1.0 
                })
        except Exception as e:
            raise ValueError(f"[Graph Retrieval] Neo4j Execution Failed: {e}")
        
    driver.close()
    return retrieved_edges