import os
import requests
from typing import Optional, Dict, Any

class APIGenerator:
    def __init__(self, model="google/gemini-2.5-flash"):
        self.api_key = os.getenv("OPEN_ROUTER_API_KEY")
        self.model = model

    def generate(
        self, 
        prompt: str, 
        temperature: float = 0.0, 
        max_tokens: int = 1024,
        is_json: bool = False
    ) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        # Only enforce JSON structure when explicitly requested (e.g. graph triplets)
        if is_json:
            payload["response_format"] = {"type": "json_object"}

        try:
            response = requests.post(self.url, headers=headers, json=payload)
            
            if response.status_code != 200:
                print(f"[APIGenerator Error] Status: {response.status_code} | Detail: {response.text}")
                return ""

            data = response.json()
            raw_content = data.get("choices", [{}])[0].get("message", {}).get("content")
            
            # Guard against 'None' content returns
            return raw_content.strip() if raw_content else ""

        except Exception as e:
            print(f"[APIGenerator Exception] Failed to execute request: {e}")
            return ""

class APIEmbedder:
    def __init__(self, model="openai/text-embedding-3-small"):
        self.api_key = os.getenv("OPEN_ROUTER_API_KEY")
        self.model = model

    def embed_query(self, text: str) -> list:
        return self.embed_documents([text])[0]

    def embed_documents(self, texts: list) -> list:
        url = "https://openrouter.ai/api/v1/embeddings"
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        payload = {"model": self.model, "input": texts}
        
        response = requests.post(url, headers=headers, json=payload)
        if response.status_code != 200:
            return [[0.0] * 1536] * len(texts)
        return [item["embedding"] for item in response.json().get("data", [])]

class APIReranker:
    def __init__(self, model="cohere/rerank-v3.5"):
        self.api_key = os.getenv("OPEN_ROUTER_API_KEY")
        self.model = model

    def predict(self, pairs: list) -> list:
        url = "https://api.cohere.ai/v1/rerank" 
        query = pairs[0][0]
        documents = [p[1] for p in pairs]
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        payload = {"model": self.model, "query": query, "documents": documents, "top_n": len(documents)}
        
        response = requests.post(url, headers=headers, json=payload)
        if response.status_code != 200:
            return [0.0] * len(pairs)
            
        results = response.json().get("results", [])
        scores = [0.0] * len(pairs)
        for rank_data in results:
            # Map the sorted API results back to the original index positions
            scores[rank_data["index"]] = rank_data["relevance_score"]
        return scores