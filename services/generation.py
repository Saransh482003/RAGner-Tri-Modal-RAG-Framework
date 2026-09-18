import re
import os
from typing import List, Dict, Any
from openai import OpenAI
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
    """Initializes the OpenAI client."""
    try:
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=os.getenv("OPEN_ROUTER_API_KEY"),
        )
        return client
        # return Groq()
    
    except Exception as e:
        # print(f"Failed to initialize Groq client. Did you set GROQ_API_KEY? Error: {e}")
        print(f"Failed to initialize OpenAI client. Did you set OPEN_ROUTER_API_KEY? Error: {e}")
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
    prompt = f"""You are a specialized AI knowledge agent. Your goal is to extract information from document context to answer the user's question, even when documents contain messy OCR, fragmented text, or flattened infographics.

INSTRUCTIONS:
1. Fragment Reconstruction: The context was extracted from visual PDFs, tables, and infographics. Words, numbers, and company names may appear out of order (e.g., "$4B aE Microsoft $2.5B Acquired..."). You MUST actively piece together adjacent entities and dollar amounts based on proximity and context.
2. Handling Ambiguity: If an exact relationship isn't 100% explicitly stated but strong contextual clues exist, provide your best deduction. Start your response with: "**[Educated Guess]**" and clearly explain the connection (e.g., state which figures and company names appear together in the excerpt).
3. Grounding: Do not bring in facts from outside the provided text. Every entity, metric, or figure you mention MUST physically exist within the Context below.
4. Hard Fallback: ONLY if the context has absolutely zero mention of the entities, concepts, or figures in the question should you state: "The provided documents do not contain information regarding [topic]."
5. Citations: Cite the source document and page number for every claim made (e.g., "[FDE_Brochure_.pdf, Page 4]").

=========================================
Context:
{formatted_context}
=========================================

User Question: {query}

Answer:"""
    return prompt

def generate_answer(client: OpenAI, query: str, retrieved_chunks: List[Dict[str, Any]], model_name: str = "openrouter/free") -> str:
    """
    Takes the query and the context, builds the prompt, and calls the OpenAI LLM.
    """
    if not retrieved_chunks:
         return "I'm sorry, I couldn't find any relevant information in the database to answer your question."
         
    if not client:
        return "LLM Client is not initialized. Please check your OpenRouter API key."

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
        raw_content = chat_completion.choices[0].message.content
        if raw_content is None:
            return "The model failed to generate a response. It may have encountered an internal error or triggered a content filter on the provider's end."
        
        model_response = clean_text(raw_content)
        return model_response
        
    except Exception as e:
         print(f"Error during LLM generation: {e}")
         return "I encountered an error while trying to generate an answer."

