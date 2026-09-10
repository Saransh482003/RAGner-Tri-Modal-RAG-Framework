import json
import os
from dotenv import load_dotenv

load_dotenv()

def route_query(llm_client, query: str) -> str:
    """
    Uses OpenRouter's fast LLM to reason about the user's intent and output a strict JSON routing decision.
    """
    prompt = f"""You are an intelligent routing assistant for an advanced Retrieval-Augmented Generation (RAG) system.
Your job is to read the user's query and decide which retrieval strategy to use.

Strategies:
1. "vanilla": 
- Use this for specific facts, numbers, exact quotes, or highly localized information.
- Examples: "What was the revenue in Q3?", "Who is the CEO?", "What is the duration of the course?"

2. "raptor": 
- Use this for broad themes, summaries, chronological overviews, or conceptual syntheses.
- Examples: "What are the main themes of this document?", "Summarize the history of the company.", "What is the core philosophy of the curriculum?"

3. "graph":
- Use this for multi-hop reasoning, finding relationships between entities, or discovering how different people, companies, or concepts are connected.
- Examples: "Which instructors teach the AI module, and what companies do they work for?", "How is entity A connected to entity B?", "What are all the prerequisites related to this project?"

Output ONLY a valid JSON object with a single key "route" and the value either "vanilla", "raptor", or "graph". Do not include markdown formatting like ```json.

User Query: {query}
"""

    try:
        print(f"Asking LLM Router for decision...")
        chat_completion = llm_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=os.getenv("GENERATION_MODEL", "openrouter/free"),
            temperature=0.0,
            response_format={"type": "json_object"},
            max_tokens=20
        )
        
        raw_output = chat_completion.choices[0].message.content.strip()
        decision = json.loads(raw_output)
        
        route = decision.get("route", "vanilla").lower()
        print(f"LLM Router Decision: {route.upper()}")
        
        if route in ["raptor", "vanilla", "graph"]:
            return route
        return "vanilla"
        
    except Exception as e:
        print(f"Routing failed, defaulting to vanilla. Error: {e}")
        return "vanilla"