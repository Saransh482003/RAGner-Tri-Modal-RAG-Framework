import os
from typing import Dict, List, Any
import json
from unstructured_client import UnstructuredClient
from unstructured_client.models import shared
from unstructured.cleaners.core import replace_unicode_quotes
from markdownify import markdownify as md
from dotenv import load_dotenv

load_dotenv()

client = UnstructuredClient(
    api_key=os.getenv("UNSTRUCTURED_TRANSFORM_API_KEY"),
    server_url="https://transform.unstructured.io",
)

def clean_text(text: str) -> str:
    """
    Cleans the input text by removing unwanted characters and formatting.
    Args:
        text (str): The text to clean.
    """
    text = " ".join(text.split())
    text = text.replace('\"', '"').replace('’', "'").replace('\\"', '"')
    return text

def parse_pdf_document(file_path: str, strategy: str = "fast") -> List[Dict[str, Any]]:
    """
    Parses a PDF document using the Unstructured API and returns a list of dictionaries containing the text content.
    Args:
        file_path (str): The path to the PDF file.
        strategy (str): The parsing strategy to use.
    """
    print(f"Uploading {os.path.basename(file_path)} to Unstructured API...")

    with open(file_path, "rb") as f:
        files = shared.Files(
            content=f.read(),
            file_name=os.path.basename(file_path),
        )

    req = shared.PartitionParameters(
        files=files,
        strategy=strategy,
        chunking_strategy="by_title",
        multipage_sections=True,
        max_characters=2000,
        new_after_n_chars=1500,
        combine_text_under_n_chars=500,
        pdf_infer_table_structure=True
    )

    try:
        res = client.general.partition(req)
    except Exception as e:
        print(f"❌ Failed to process {file_path} via Unstructured API: {str(e)}")
        raise e

    extracted_content = []
    for element_dict in res.elements:
        element_type = element_dict.get("type", "")

        if element_type in ["Image", "FigureCaption"]:
            continue

        original_text = element_dict.get("text", "")
        element_dict["text"] = clean_text(original_text)

        if "Table" in element_type:
            html_table = element_dict.get("metadata", {}).get("text_as_html", "")
            if html_table:
                element_dict["table_html"] = html_table
                element_dict["table_markdown"] = md(html_table) # Crucial for clean LLM extraction

        extracted_content.append(element_dict)

    print(f"✅ Successfully processed and cleaned {len(extracted_content)} elements.")
    return extracted_content

