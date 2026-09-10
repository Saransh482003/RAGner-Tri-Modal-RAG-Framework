![RAGner Logo](./assets/RAGner%20Logo.png)

[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/) [![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/) [![Next.js](https://img.shields.io/badge/Next.js-black?style=flat&logo=next.js)](https://nextjs.org/) [![Neo4j](https://img.shields.io/badge/Neo4j-018bff?style=flat&logo=neo4j)](https://neo4j.com/) [![Qdrant](https://img.shields.io/badge/Qdrant-FE4155?style=flat&logo=qdrant)](https://qdrant.tech/) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**RAGner** is a modular, production-ready framework designed to instantly transform any corpus of documents into a highly accurate, queryable AI agent. 

Rather than relying on basic semantic search, RAGner utilizes an **Agentic Auto-Router** that dynamically evaluates incoming queries and routes them through specialized retrieval engines: Vanilla Vector (with Two-Stage Reranking), RAPTOR (hierarchical summarization), and a Neo4j Knowledge Graph. 

By simply swapping out the source documents, RAGner can be instantly customized and deployed for any new client, use case, or industry.

---

## 🚀 Production Showcase: Scaler ChatBOT

To demonstrate the framework's capabilities, I deployed a customized instance of RAGner ingested specifically with technical documentation and course brochures from [Scaler](https://www.scaler.com/). 

* **Live Demo:** [🔗 scaler-chatbot-ragner.vercel.app](https://scaler-chatbot-ragner.vercel.app/)

---

## 🧠 Architectural Thought Process

Building a robust RAG system goes beyond wrapping an API call in a UI. RAGner was built to solve the core challenges of modern AI deployments: **Context Fragmentation**, **Multi-hop Reasoning**, and **Cloud Infrastructure Costs**.

### 1. Decoupled Ingestion & Retrieval
To keep cloud hosting costs near zero while maintaining high performance, the system architecture physically separates the ingestion pipeline from the retrieval API. Heavy libraries (like `unstructured`, `scikit-learn` and `umap-learn`) are used locally to parse PDFs, build RAPTOR trees, and extract graph entities. Once the vectors and graphs are pushed to the cloud, the production backend runs a highly optimized, lightweight environment, saving gigabytes of RAM.

### 2. Tri-Modal Retrieval Engines
Not all queries are created equal. RAGner utilizes three distinct retrieval methodologies:
* **Vanilla Vector Search (with Reranking):** For direct, factual queries (e.g., *"What is the duration of the course?"*). It uses a two-stage process: initial dense retrieval via Qdrant, followed by strict cross-encoder reranking.
* **Knowledge Graph (Neo4j):** For multi-hop reasoning across entities (e.g., *"Which instructors teach module X, and what companies are they from?"*).
* **RAPTOR (Tree-Organized Retrieval):** For holistic, thematic questions that span multiple documents (e.g., *"Summarize the core philosophy of the AI curriculum."*).

### 3. Agentic Routing & Graph Ontology
RAGner employs a smart routing layer that uses an LLM to classify user intent and direct the query to the correct retrieval engine. For Graph RAG, it dynamically generates a custom domain ontology during ingestion, ensuring the Knowledge Graph remains structured and queryable rather than shattering into synonymous relationships.

---

## 🏗️ System Architecture & Data Flow

```mermaid
%%{init: {
  'theme': 'default',
  'themeVariables': {
    'darkMode': false,
    'background': '#ffffff',
    'primaryTextColor': '#000000',
    'edgeLabelBackground': '#ffffff',
    'lineColor': '#475569',
    'textColor': '#000000'
  }
}}%%
graph TD
    %% Define crisp color palettes for the different layers
    classDef frontend fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#0369a1;
    classDef backend fill:#ccfbf1,stroke:#0d9488,stroke-width:2px,color:#0f766e;
    classDef database fill:#e0e7ff,stroke:#4f46e5,stroke-width:2px,color:#4338ca;
    classDef inference fill:#ffe4e6,stroke:#e11d48,stroke-width:2px,color:#be123c;

    subgraph ClientApp [Client Application]
        UI[Next.js Interface]:::frontend
    end

    subgraph BackendApp [RAGner Backend]
        API[FastAPI Endpoint]:::backend
        Router{Agentic Auto-Router}:::backend
        Embed[OpenAI text-embedding-3]:::backend
        Rerank[Cohere Reranker v3.5]:::backend
    end

    subgraph DataLayer [Data Layer]
        Qdrant[(Qdrant Vector DB)]:::database
        Neo4j[(Neo4j Graph DB)]:::database
    end
    
    subgraph InferenceLayer [Inference Engine]
        OpenRouter[Gemini 2.5 Flash via OpenRouter]:::inference
    end

    %% Connections
    UI -->|Natural Language Query| API
    API --> Router
    Router -->|Text-to-Vector| Embed
    
    Embed -.->|Dense Search| Qdrant
    Embed -.->|RAPTOR Summary Search| Qdrant
    Router -.->|Cypher Generation| Neo4j
    
    Qdrant -->|Initial Top-K Chunks| Rerank
    Rerank -->|Re-scored Top-N Chunks| OpenRouter
    Neo4j -->|Graph Context Triplets| OpenRouter
    
    OpenRouter -->|Synthesized Response| UI

    %% Subgraph Styling: Soft thematic tints with clean, solid borders matching their nodes
    style ClientApp fill:#f0f9ff,stroke:#7dd3fc,stroke-width:2px
    style BackendApp fill:#f0fdfa,stroke:#5eead4,stroke-width:2px
    style DataLayer fill:#eef2ff,stroke:#a5b4fc,stroke-width:2px
    style InferenceLayer fill:#fff1f2,stroke:#fda4af,stroke-width:2px
```

---

## ⚙️ Models & Technologies Used

RAGner utilizes a state-of-the-art API stack to completely offload heavy ML workloads from the application server, allowing the backend to run on highly efficient, low-memory cloud tiers while delivering top-tier AI reasoning.

* **Frontend:** [Next.js (React)](https://nextjs.org/) customized for seamless chat interactions.
* **Backend:** [FastAPI](https://fastapi.tiangolo.com/) for high-throughput, asynchronous routing.
* **Embedding Model:** `openai/text-embedding-3-small` – Selected for highly semantic, cost-effective, and dimensionally optimized text vectorization.
* **Reranking Model:** `cohere/rerank-v3.5` – Implemented to cross-encode and re-score the initial vector retrieval, drastically improving context precision before passing it to the generator.
* **Generation Model:** `google/gemini-2.5-flash` (via OpenRouter) – Selected for its massive context window, blazing-fast inference speed, and high reasoning capabilities on complex/multi-hop tasks.
* **Vector Database:** [Qdrant Cloud](https://qdrant.tech/) with custom payload indexing for instant metadata filtering.
* **Graph Database:** [Neo4j AuraDB](https://neo4j.com/) utilizing Cypher query generation for dynamic entity traversal.

---

## 🛠️ A Peek into Usage (For Clients)

While this framework is designed to be highly customizable, the core usage pipeline is simple and plug-and-play:

1. **Data Drop:** Raw documents (PDFs) are ingested using high-resolution parsing to preserve tables and document structure.
2. **Intelligent Chunking:** The pipeline utilizes advanced recursive character splitting, explicitly keeping Markdown tables intact for pristine data retrieval.
3. **Multi-Dimensional Processing:**
    - Embeddings are generated and pushed to Qdrant.
    - The RAPTOR engine clusters (via K-Means or GMM) and summarizes the text into a hierarchical tree.
    - The Knowledge Graph builder uses fuzzy logic and canonicalization to extract clean Entity-Relationship triplets into Neo4j.


4. **Deploy:** The backend and frontend spin up, immediately ready to answer complex queries about the newly ingested corpus with strict hallucination guardrails.
---

***If you are interested in deploying a custom instance of RAGner for your enterprise data, please reach out via the contact information below.***


## 👨‍💻 Developer

**Saransh Saini** | *AI Engineer*
[![Email](https://img.shields.io/badge/Email-D14836?style=flat&logo=gmail&logoColor=white)](mailto:saransh.saini.ai@gmail.com) 
[![Phone](https://img.shields.io/badge/Phone-25D366?style=flat&logo=whatsapp&logoColor=white)](tel:+918178703402)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/saranshsaini48/) 
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white)](https://github.com/Saransh482003) 
[![Portfolio](https://img.shields.io/badge/Website-Portfolio-2563EB?style=flat)](https://www.saranshsaini.in/) 
