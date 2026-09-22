from typing import List, Dict, Any, Optional
from qdrant_client.models import Filter, FieldCondition, MatchValue
from services.builder_raptor import build_raptor_tree
from services.builder_graph import build_knowledge_graph
from db.qdrant_embedder import upsert_chunks

def get_existing_chunks_from_qdrant(
    q_client, 
    master_collection: str,
    project_name: str, 
    doc_name: Optional[str] = None, 
    chunk_type: Optional[str] = None
) -> List[Dict[str, Any]]:
    filter_conditions = [FieldCondition(key="project_name", match=MatchValue(value=project_name))]
    if doc_name:
        filter_conditions.append(FieldCondition(key="source", match=MatchValue(value=doc_name)))
    if chunk_type:
        filter_conditions.append(FieldCondition(key="chunk_type", match=MatchValue(value=chunk_type)))

    q_filter = Filter(must=filter_conditions) if filter_conditions else None
    points, _ = q_client.scroll(
        collection_name=master_collection, scroll_filter=q_filter, limit=1000, with_payload=True, with_vectors=False
    )
    return [{"text": p.payload.get("text", ""), "metadata": p.payload} for p in points]

def execute_pipeline_stages(
    doc_chunks_map: Dict[str, List[Dict[str, Any]]],
    embedder, llm_client, q_client, master_collection: str, project_name: str,
    build_raptor: bool = True, build_graph: bool = True
):
    for doc_name, base_chunks in doc_chunks_map.items():
        summary_chunks = []
        if build_raptor:
            try:
                collapsed_tree = build_raptor_tree(base_chunks, embedder, llm_client)
                summary_chunks = [c for c in collapsed_tree if c["metadata"].get("chunk_type") in ["raptor_summary", "raptor_root_summary"]]
                if summary_chunks:
                    upsert_chunks(q_client, master_collection, project_name, summary_chunks, embedder)
            except Exception as e:
                print(f"[Stage: RAPTOR Failed] {e}")
                
        if build_graph:
            try:
                if not summary_chunks:
                    existing = get_existing_chunks_from_qdrant(q_client, master_collection, project_name, doc_name, "raptor_summary")
                    summary_chunks = existing if existing else base_chunks
                build_knowledge_graph(summary_chunks, llm_client, document_name=doc_name, project_name=project_name)
            except Exception as e:
                print(f"[Stage: GraphRAG Failed] {e}")