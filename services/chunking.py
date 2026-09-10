import re
from typing import List, Dict, Any
from langchain_text_splitters import RecursiveCharacterTextSplitter
from dotenv import load_dotenv

load_dotenv()

def advanced_chunking(elements: List[Dict[str, Any]], chunk_size: int = 1000, chunk_overlap: int = 400) -> List[Dict[str, Any]]:
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
    current_source = None
    current_page = None

    def flush_text_block(text_block: str, source: str, page: Any):
        if not text_block.strip():
            return
        split_texts = text_splitter.split_text(text_block)
        for split in split_texts:
            chunks.append({
                "text": split.strip(),
                "metadata": {
                    "source": source or "unknown",
                    "page_number": page if page is not None else 1,
                    "chunk_type": "text"
                }
            })

    for el in elements:
        text = el.get("text", "")
        el_type = el.get("type", "")
        metadata = el.get("metadata", {})
        el_source = metadata.get("filename", metadata.get("source", "unknown"))
        el_page = metadata.get("page_number", 1)

        if current_source is None:
            current_source = el_source
            current_page = el_page

        # Flush block if page or source transitions to preserve accurate chunk attribution
        if (el_source != current_source or el_page != current_page) and current_text_block.strip():
            flush_text_block(current_text_block, current_source, current_page)
            current_text_block = ""
            current_source = el_source
            current_page = el_page
        
        if el_type in ["Table", "TableChunk"]:
            table_context = ""
            # Added 1-2 senetences of context before the table for better understanding
            if current_text_block.strip():
                sentences = re.split(r'(?<=[.!?])\s+', current_text_block.strip())
                table_context = " ".join(sentences[-2:]) if len(sentences) >= 2 else sentences[0]

            # Flushing accumulated text BEFORE the table
            if current_text_block.strip():
                flush_text_block(current_text_block, current_source, current_page)
                current_text_block = ""

            table_content = el.get("table_markdown")
            if not table_content:
                 table_content = metadata.get("text_as_html") or text
            
            if table_content:
                table_content = f"**Context preceding table:**\n{table_context}\n\n**Table Data:**\n{table_content}"
                chunks.append({
                    "text": table_content,
                    "metadata": {
                        "source": el_source,
                        "page_number": el_page,
                        "chunk_type": "table"
                    }
                })
            continue

        elif el_type == "Title":
            # Formating Titles as Markdown headers
            current_text_block += f"\n\n# {text}\n\n"

        elif el_type in ["CompositeElement", "NarrativeText", "Text", "ListItem"]:
             current_text_block += f"{text} \n"

    if current_text_block.strip():
        flush_text_block(current_text_block, current_source, current_page)
        
    return chunks
