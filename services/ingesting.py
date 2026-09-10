import os
from typing import Dict, List, Any
import json
from unstructured.partition.pdf import partition_pdf
from unstructured.cleaners.core import clean, replace_unicode_quotes
from markdownify import markdownify as md
from dotenv import load_dotenv

load_dotenv()

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
    Parses a PDF document and returns a list of dictionaries containing the text content.
    Args:
        file_path (str): The path to the PDF file.
        strategy (str): The parsing strategy to use.
    """
    elements = partition_pdf(
        filename=file_path,
        strategy=strategy,
        chunking_strategy="by_title",
        multipage_sections=True,
        max_characters=2000,
        new_after_n_chars=1500,
        combine_text_under_n_chars=500,
        skip_infer_table_types=[],
        infer_table_structure=True
    )

    extracted_content = []
    for element in elements:
        element_type = type(element).__name__

        if element_type in ["Image", "FigureCaption"]:
            continue

        element.apply(replace_unicode_quotes)

        element_dict = element.to_dict()
        element_dict["text"] = clean_text(element_dict["text"])

        if "Table" in element_type:
            html_table = element_dict.get("metadata", {}).get("text_as_html", "")
            if html_table:
                element_dict["table_html"] = html_table
                element_dict["table_markdown"] = md(html_table) # Converting the HTML table to Markdown format; it is better while chunking

        extracted_content.append(element_dict)

    return extracted_content

