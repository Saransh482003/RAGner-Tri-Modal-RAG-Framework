import streamlit as st
import requests
import json

st.set_page_config(page_title="RAGner.ai", page_icon="🕸️", layout="wide")

# Connect to our FastAPI backend
API_URL = "http://localhost:8000/api/v1"

if "messages" not in st.session_state:
    st.session_state.messages = []

def display_sources(sources):
    """Helper function to cleanly format and display retrieved chunks/edges."""
    if not sources:
        st.info("No sources retrieved.")
        return
        
    with st.expander(f"View Retrieved Context ({len(sources)} sources)"):
        for i, src in enumerate(sources):
            meta = src.get("metadata", {})
            chunk_type = meta.get("chunk_type", "unknown")
            
            # Format the score
            score = src.get("cross_encoder_score", "N/A")
            if isinstance(score, float):
                score = f"{score:.4f}"
                
            # Use specific colors based on chunk type to mimic our React UI logic
            if chunk_type == "graph_edge" or chunk_type == "graph_chunk":
                st.markdown(f"🟣 **Source {i+1} | Type: `KNOWLEDGE GRAPH` | Score: `{score}`**")
            elif "raptor" in chunk_type:
                st.markdown(f"🟢 **Source {i+1} | Type: `RAPTOR TREE` | Score: `{score}`**")
            else:
                st.markdown(f"🔵 **Source {i+1} | Type: `VANILLA CHUNK` | Score: `{score}`**")
                
            st.info(src.get("text", ""))
            st.caption(f"Source: {meta.get('source', 'N/A')} | Page: {meta.get('page_number', 'N/A')}")
            st.divider()

with st.sidebar:
    st.title("🕸️ RAGner.ai")
    st.markdown("Enterprise Multi-Strategy RAG Pipeline")
    
    st.header("1. Document Ingestion")
    uploaded_file = st.file_uploader("Upload a PDF", type=["pdf"])
    
    use_advanced = st.checkbox(
        "Enable Advanced Pipeline", 
        value=True, 
        help="Builds RAPTOR semantic tree and extracts Neo4j Graph relationships asynchronously."
    )
    
    if st.button("Process Document", type="primary"):
        if uploaded_file is not None:
            with st.spinner("Uploading and indexing base chunks to Qdrant..."):
                try:
                    # FastAPI expects the file as multipart/form-data and use_advanced as form data
                    files = {"file": (uploaded_file.name, uploaded_file.getvalue(), "application/pdf")}
                    data = {"use_advanced": "true" if use_advanced else "false"}
                    
                    response = requests.post(f"{API_URL}/upload", files=files, data=data)
                    
                    if response.status_code == 200:
                        res_data = response.json()
                        st.success(res_data.get("message", "Upload successful!"))
                        st.info(res_data.get("status", ""))
                    else:
                        st.error(f"Upload failed: {response.text}")
                except Exception as e:
                    st.error(f"Connection error. Is FastAPI running? Details: {e}")
        else:
            st.warning("Please upload a file first.")
            
    st.divider()
    
    st.header("2. Retrieval Strategy")
    strategy = st.radio(
        "Select Routing Engine:",
        options=["auto", "vanilla", "raptor", "graph"],
        format_func=lambda x: {
            "auto": "🤖 Auto (LLM Router)",
            "vanilla": "📄 Vanilla RAG",
            "raptor": "🌲 RAPTOR Tree",
            "graph": "🕸️ GraphRAG"
        }.get(x, x)
    )
    
    if st.button("Clear Chat"):
        st.session_state.messages = []
        st.rerun()

st.title("RAGner Engineering Workspace")
st.markdown("Test your routing, entity extraction, and multi-hop reasoning. Ensure FastAPI (`main.py`) is running on port 8000.")

# Display existing chat messages
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])
        if "sources" in msg:
            display_sources(msg["sources"])

if prompt := st.chat_input("Ask a factual, thematic, or relational question..."):
    # Append and render user message
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    # Render assistant response
    with st.chat_message("assistant"):
        message_placeholder = st.empty()
        with st.spinner("Routing, Retrieving, and Reasoning..."):
            try:
                response = requests.post(
                    f"{API_URL}/query", 
                    json={"query": prompt, "strategy": strategy}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    answer = data.get("answer", "No answer generated.")
                    sources = data.get("sources", [])
                    strat_used = data.get("strategy_used", strategy)
                    
                    full_response = f"*(Routed via **{strat_used.upper()}**)*\n\n{answer}"
                    message_placeholder.markdown(full_response)
                    display_sources(sources)
                    
                    st.session_state.messages.append({
                        "role": "assistant", 
                        "content": full_response,
                        "sources": sources
                    })
                else:
                    err_msg = f"API Error: {response.status_code} - {response.text}"
                    message_placeholder.error(err_msg)
                    st.session_state.messages.append({"role": "assistant", "content": err_msg})
            except Exception as e:
                err_msg = f"Connection Error: Ensure your FastAPI server is running (`uvicorn main:app --reload`).\n\nDetails: {e}"
                message_placeholder.error(err_msg)
                st.session_state.messages.append({"role": "assistant", "content": err_msg})