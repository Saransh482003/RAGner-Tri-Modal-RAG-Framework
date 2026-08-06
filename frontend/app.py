import streamlit as st
import requests
import os

API_URL = "http://localhost:8000/api/v1"

st.set_page_config(page_title="RAGner Dashboard", page_icon="🧠", layout="wide")

st.title("🧠 Multi-Strategy RAG Engine")
st.markdown("Upload a document and ask questions about it.")

# Sidebar for File Upload
with st.sidebar:
    st.header("Document Ingestion")
    uploaded_file = st.file_uploader("Upload a PDF", type=["pdf"])

    use_raptor = st.checkbox("Enable RAPTOR Processing", value=True, help="Clusters and summarizes chunks for deep contextual understanding. Takes longer to process.")
    
    if st.button("Process Document"):
        if uploaded_file is not None:
            with st.spinner("Processing (this may take a minute for high-res parsing and LLM clustering)..."):
                files = {"file": (uploaded_file.name, uploaded_file.getvalue(), "application/pdf")}
                data = {"use_raptor": "true" if use_raptor else "false"}
                try:
                    response = requests.post(f"{API_URL}/upload", files=files, data=data)
                    if response.status_code == 200:
                        st.success(f"Success! {response.json().get('chunks_created')} chunks added to database.")
                    else:
                        st.error(f"Error: {response.json().get('detail')}")
                except requests.exceptions.ConnectionError:
                    st.error("Could not connect to backend. Is FastAPI running?")
        else:
            st.warning("Please upload a file first.")

if "messages" not in st.session_state:
    st.session_state.messages = []

for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

st.write("### Query Configuration")

STRATEGIES = {
    "vanilla": "Vanilla RAG (Raw Leaf Chunks Only)",
    "raptor": "RAPTOR (Collapsed Tree: Leaves + Summaries)"
}

strategy_option = st.radio(
    "Retrieval Strategy", 
    options=list(STRATEGIES.keys()), 
    format_func=lambda x: STRATEGIES[x],
    horizontal=True,
    index=0
)

if prompt := st.chat_input("Ask a question about your documents..."):
    st.chat_message("user").markdown(prompt)
    st.session_state.messages.append({"role": "user", "content": prompt})

    with st.chat_message("assistant"):
        message_placeholder = st.empty()
        with st.spinner("Thinking (Retrieving & Reranking)..."):
            try:
                response = requests.post(f"{API_URL}/query", json={"query": prompt, "strategy": strategy_option})
                if response.status_code == 200:
                    data = response.json()
                    answer = data.get("answer", "No answer generated.")
                    sources = data.get("sources", [])
                    message_placeholder.markdown(answer)
                    
                    if sources:
                        with st.expander(f"View Retrieved Context (Top {len(sources)} Reranked)"):
                            for i, source in enumerate(sources):
                                st.markdown(f"**Source {i+1}: Page {source['metadata']['page_number']}** (Reranker Score: {source['cross_encoder_score']:.2f})")
                                st.code(source['text'][:500] + "..." if len(source['text']) > 500 else source['text'])
                    st.session_state.messages.append({"role": "assistant", "content": answer})
                else:
                    st.error(f"Error: {response.json().get('detail')}")
                    
            except requests.exceptions.ConnectionError:
                st.error("Could not connect to backend. Is FastAPI running on port 8000?")