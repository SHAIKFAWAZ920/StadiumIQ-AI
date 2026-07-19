# 🌲 Enterprise Vector DB Upgrade Guide (Local RAG to Pinecone/Weaviate)

This document provides instructions and code templates to migrate StadiumIQ AI's local vector indexing to enterprise-grade Vector Databases like **Pinecone** or **Weaviate** for high-concurrency production deployments.

---

## Option A: Upgrading to Pinecone

### 1. Requirements Update
Add the Pinecone python client to `backend/requirements.txt`:
```
pinecone-client>=3.1.0
```

### 2. Environment Configurations
Configure the following API keys in Google Cloud Secret Manager:
```env
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX_NAME=stadium-iq-faqs
```

### 3. Implementation Code Template
Replace `backend/ai/rag_engine.py` with this production-grade template:

```python
import os
import logging
from pinecone import Pinecone, ServerlessSpec
from backend.ai.gemini_client import client as gemini_client

logger = logging.getLogger("stadium_iq.rag")

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "stadium-iq-faqs")

pc = None
index = None

if PINECONE_API_KEY:
    try:
        pc = Pinecone(api_key=PINECONE_API_KEY)
        # Create index if it does not exist
        if PINECONE_INDEX_NAME not in pc.list_indexes().names():
            pc.create_index(
                name=PINECONE_INDEX_NAME,
                dimension=768, # Dimension of google's text-embedding-004
                metric="cosine",
                spec=ServerlessSpec(cloud="aws", region="us-east-1")
            )
        index = pc.Index(PINECONE_INDEX_NAME)
        logger.info("Pinecone Index loaded successfully.")
    except Exception as e:
        logger.error(f"Pinecone init failure: {e}")

class RAGEngine:
    @staticmethod
    def get_context(query: str, limit: int = 3) -> str:
        """
        Retrieves matching context chunks from Pinecone using Gemini Embeddings.
        """
        if not index or not gemini_client:
            logger.warning("Pinecone offline. Using fallback mock content.")
            return "Fallback: Proceed to nearest Gate B for accessible support."
            
        try:
            # 1. Generate query embedding from Gemini API
            emb_resp = gemini_client.models.embed_content(
                model="text-embedding-004",
                contents=query
            )
            query_vector = emb_resp.embeddings[0].values
            
            # 2. Query Pinecone
            query_results = index.query(
                vector=query_vector,
                top_k=limit,
                include_metadata=True
            )
            
            # 3. Compile context matching payloads
            chunks = []
            for match in query_results.get("matches", []):
                metadata = match.get("metadata", {})
                title = metadata.get("title", "FAQ Document")
                content = metadata.get("content", "")
                chunks.append(f"[{title}]: {content}")
                
            return "\n\n".join(chunks)
        except Exception as e:
            logger.error(f"Pinecone query failed: {e}")
            return ""
```

---

## Option B: Upgrading to Weaviate

### 1. Requirements Update
Add the Weaviate client to `backend/requirements.txt`:
```
weaviate-client>=4.5.0
```

### 2. Environment Configurations
```env
WEAVIATE_URL=https://your-weaviate-instance.weaviate.network
WEAVIATE_API_KEY=your-weaviate-api-key
```

### 3. Implementation Code Template
```python
import os
import weaviate
from backend.ai.gemini_client import client as gemini_client

WEAVIATE_URL = os.getenv("WEAVIATE_URL")
WEAVIATE_API_KEY = os.getenv("WEAVIATE_API_KEY")

w_client = None

if WEAVIATE_URL:
    auth_config = weaviate.AuthApiKey(api_key=WEAVIATE_API_KEY) if WEAVIATE_API_KEY else None
    w_client = weaviate.Client(
        url=WEAVIATE_URL,
        auth_client_info=auth_config
    )

class RAGEngine:
    @staticmethod
    def get_context(query: str, limit: int = 3) -> str:
        if not w_client or not gemini_client:
            return "Fallback: Proceed to Gate A."
            
        try:
            # 1. Generate query embedding
            emb_resp = gemini_client.models.embed_content(
                model="text-embedding-004",
                contents=query
            )
            query_vector = emb_resp.embeddings[0].values
            
            # 2. Perform Vector search in Weaviate Class 'StadiumFAQ'
            response = (
                w_client.query
                .get("StadiumFAQ", ["title", "content"])
                .with_near_vector({"vector": query_vector})
                .with_limit(limit)
                .do()
            )
            
            items = response.get("data", {}).get("Get", {}).get("StadiumFAQ", [])
            chunks = [f"[{item['title']}]: {item['content']}" for item in items]
            return "\n\n".join(chunks)
        except Exception as e:
            return ""
```
