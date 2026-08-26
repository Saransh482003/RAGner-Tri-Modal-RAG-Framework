import re
import os
from typing import List, Dict, Any
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

def clean_text(text: str) -> str:
    """
    Cleans the input text by removing unwanted characters and formatting.
    Args:
        text (str): The text to clean.
    """
    text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL)
    text = " ".join(text.split())
    return text
def initialize_llm_client():
    """Initializes the Groq client."""
    try:
        return Groq()
    
    except Exception as e:
        print(f"Failed to initialize Groq client. Did you set GROQ_API_KEY? Error: {e}")
        return None

def build_prompt(query: str, retrieved_chunks: List[Dict[str, Any]]) -> str:
    """
    Constructs the prompt by combining the user's query with the retrieved context.
    """
    context_texts = []

    for i, chunk in enumerate(retrieved_chunks):
        source = chunk['metadata'].get('source', 'Unknown')
        page = chunk['metadata'].get('page_number', 'Unknown')
        chunk_type = chunk['metadata'].get('chunk_type', 'text')
        
        if chunk_type == 'table':
            context_texts.append(f"--- Data Table {i+1} (Source: {source}, Page: {page}) ---\n{chunk['text']}")
        else:
            context_texts.append(f"--- Document Excerpt {i+1} (Source: {source}, Page: {page}) ---\n{chunk['text']}")
    
    formatted_context = "\n\n".join(context_texts)
    prompt = f"""You are helpful bot that reads the context given to it, and answers the question based on the provided context. 
Your goal is to answer the user's question accurately using ONLY the context provided.

CRITICAL INSTRUCTIONS:
1. You MUST answer the question using ONLY the information provided in the "Context" section below.
2. If the Context does not contain the answer, you MUST state exactly: "I cannot answer this question based on the provided documents." Do not guess.
3. If you find the answer, you MUST cite the Source and Page Number provided in the context snippet (e.g., "[sample.pdf, Page 13]").
4. Your answers should be complete, don't fall into the trap of providing partial answers. Example: Not giving complete names, or not providing all the details requested in the question.
5. You are highly encouraged to synthesize, compare, and connect information across different excerpts to form a complete answer.
6. If the context contains Markdown tables, read the rows and columns carefully to extract the correct data.

Very Important: Only give the answer. Do not provide any additional commentary, explanations, or information outside of the context. NO THINKING OUT LOUD. NO ADDITIONAL INFORMATION. NO GUESSING. NO EXTERNAL KNOWLEDGE. STRICTLY STICK TO THE CONTEXT.
=========================================
Context:
{formatted_context}
=========================================

User Question: {query}

Answer:"""
    return prompt

def generate_answer(client: Groq, query: str, retrieved_chunks: List[Dict[str, Any]], model_name: str = "llama-3.1-8b-instant") -> str:
    """
    Takes the query and the context, builds the prompt, and calls the Groq LLM.
    """
    if not retrieved_chunks:
         return "I'm sorry, I couldn't find any relevant information in the database to answer your question."
         
    if not client:
        return "LLM Client is not initialized. Please check your Groq API key."

    prompt = build_prompt(query, retrieved_chunks)
    
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a precise, grounded document-answering assistant."
                },
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model=model_name,
            temperature=0.0, 
            max_tokens=1024,
        )

        model_response = clean_text(chat_completion.choices[0].message.content)
        return model_response
        
    except Exception as e:
         print(f"Error during LLM generation: {e}")
         return "I encountered an error while trying to generate an answer."

if __name__ == "__main__":
    import os
    import sys
    from pathlib import Path
    root_dir = Path(__file__).resolve().parent.parent
    sys.path.append(str(root_dir))
    from db.qdrant_embedder import get_qdrant_client
    from services.retrieval_vector import retrieve_vector_context
    
    llm_client = initialize_llm_client()
    q_client = get_qdrant_client()
    COLLECTION_NAME = "targaryen_collection"
    
    test_query = "What is the seat of House Targaryen?"
    
    print(f"\nUser Question: {test_query}")

    results = retrieve_vector_context(q_client, COLLECTION_NAME, test_query, bi_encoder_top_k=15, cross_encoder_top_k=3)
    
    if llm_client:
        answer = generate_answer(llm_client, test_query, results)
        print(f"Generated Answer: {answer}")