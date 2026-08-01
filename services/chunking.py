import re
from typing import List, Dict, Any
from langchain_text_splitters import RecursiveCharacterTextSplitter

def advanced_chunking(elements: List[Dict[str, Any]], chunk_size: int = 1000, chunk_overlap: int = 300) -> List[Dict[str, Any]]:
    """
    Combines text elements and splits them using LangChain's RecursiveCharacterTextSplitter.
    Handles CompositeElements by extracting their text and splitting it recursively.
    Preserves document structure by formatting Titles as Markdown headers.
    Keeps Tables as isolated, independent chunks, preferring Markdown format.
    """
    
    text_splitter = RecursiveCharacterTextSplitter(
        separators=["\n\n", "\n", ". ", "? ", "! ", " ", ""],
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
    )

    chunks = []
    current_text_block = ""
    current_metadata = {}

    for el in elements:
        text = el.get("text", "")
        el_type = el.get("type", "")
        metadata = el.get("metadata", {})

        if not current_metadata:
            current_metadata = {
                "source": metadata.get("filename", metadata.get("source", "unknown")),
                "page_number": metadata.get("page_number")
            }
        
        if el_type in ["Table", "TableChunk"]:
            table_context = ""
            if current_text_block.strip():
                sentences = re.split(r'(?<=[.!?])\s+', current_text_block.strip())
                table_context = " ".join(sentences[-2:]) if len(sentences) >= 2 else sentences[0]

            # Flushing accumulated text BEFORE the table
            if current_text_block.strip():
                split_texts = text_splitter.split_text(current_text_block)
                for split in split_texts:
                    chunks.append({
                        "text": split.strip(),
                        "metadata": {
                            **current_metadata,
                            "chunk_type": "text"
                        }
                    })
                current_text_block = ""
                current_metadata = {
                    "source": metadata.get("filename", metadata.get("source", "unknown")),
                    "page_number": metadata.get("page_number")
                }

            table_content = el.get("table_markdown")
            if not table_content:
                 table_content = metadata.get("text_as_html") or text
            
            if table_content:
                table_content = f"**Context preceding table:**\n{table_context}\n\n**Table Data:**\n{table_content}"
                chunks.append({
                    "text": table_content,
                    "metadata": {
                        **current_metadata,
                        "chunk_type": "table"
                    }
                })
            
            current_metadata = {}
            continue

        elif el_type == "Title":
            # Formating Titles as Markdown headers
            current_text_block += f"\n\n# {text}\n\n"

        elif el_type in ["CompositeElement", "NarrativeText", "Text", "ListItem"]:
             current_text_block += f"{text} \n"


    if current_text_block.strip():
        split_texts = text_splitter.split_text(current_text_block)
        for split in split_texts:
            chunks.append({
                "text": split.strip(),
                "metadata": {
                    **current_metadata,
                    "chunk_type": "text"
                }
            })
        
    return chunks


if __name__ == "__main__":
    import json
    with open("sample-hi-res.json", "r", encoding="utf-8") as f:
            mock_elements = json.load(f)
            
    print("--- Advanced Recursive Chunking (Testing with Composite Elements) ---")
    advanced_chunks = advanced_chunking(mock_elements, chunk_size=1000, chunk_overlap=300)

    with open("advanced_chunks.json", "w", encoding="utf-8") as f:
        json.dump(advanced_chunks, f, ensure_ascii=False, indent=4)
    
    for i, chunk in enumerate(advanced_chunks):
        print(f"--- Chunk {i+1} [Type: {chunk['metadata'].get('chunk_type')}, Page: {chunk['metadata'].get('page_number')}] ---")
        print(f"{chunk['text'][:200]}...\n" if len(chunk['text']) > 200 else f"{chunk['text']}\n\n")
