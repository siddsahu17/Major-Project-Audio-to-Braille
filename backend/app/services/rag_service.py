"""
RAG Service — Pinecone-backed semantic search for NCERT textbook content.
- Embeds PDF pages with OpenAI text-embedding-3-small
- Indexes into a Pinecone serverless index on upload
- Provides semantic search used by the TutorAgent's semantic_search tool
- Provides chapter-level search used by find_and_load_chapter
"""

from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger("sparshvaani.rag")


class RAGService:
    def __init__(self, pinecone_api_key: str, index_name: str, openai_api_key: str) -> None:
        self._pinecone_api_key = pinecone_api_key
        self._index_name = index_name
        self._openai_api_key = openai_api_key
        self._index = None

    def _get_index(self):
        if self._index is not None:
            return self._index
        try:
            from pinecone import Pinecone, ServerlessSpec  # type: ignore
            pc = Pinecone(api_key=self._pinecone_api_key)
            existing = [i.name for i in pc.list_indexes()]
            if self._index_name not in existing:
                pc.create_index(
                    name=self._index_name,
                    dimension=1024,
                    metric="cosine",
                    spec=ServerlessSpec(cloud="aws", region="us-east-1"),
                )
                logger.info(f"Created Pinecone index '{self._index_name}'")
            self._index = pc.Index(self._index_name)
            logger.info(f"Connected to Pinecone index '{self._index_name}'")
        except Exception as e:
            logger.warning(f"Pinecone unavailable: {e}")
            return None
        return self._index

    def _embed(self, texts: list[str]) -> list[list[float]]:
        from openai import OpenAI  # type: ignore
        client = OpenAI(api_key=self._openai_api_key)
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=texts,
            dimensions=1024,
        )
        return [item.embedding for item in response.data]

    async def index_pdf_pages(
        self,
        session_id: str,
        filename: str,
        pages: dict[int, str],
        class_number: Optional[int] = None,
    ) -> None:
        """Embed and upsert all non-empty pages into Pinecone. Fire-and-forget."""
        index = self._get_index()
        if index is None:
            return

        nonempty = [(i, t) for i, t in pages.items() if t.strip()]
        if not nonempty:
            return

        batch_size = 50
        try:
            for start in range(0, len(nonempty), batch_size):
                batch = nonempty[start:start + batch_size]
                page_indices, texts = zip(*batch)
                # Truncate to ~8000 chars per page to stay within token limits
                truncated = [t[:8000] for t in texts]
                embeddings = self._embed(list(truncated))
                vectors = [
                    {
                        "id": f"{session_id}__p{page_indices[j]}",
                        "values": embeddings[j],
                        "metadata": {
                            "session_id": session_id,
                            "page_num": page_indices[j] + 1,  # 1-indexed for display
                            "filename": filename,
                            "class_number": class_number or 0,
                            "text_snippet": truncated[j][:500],
                        },
                    }
                    for j in range(len(batch))
                ]
                index.upsert(vectors=vectors)
                logger.info(
                    f"Indexed pages {page_indices[0]+1}–{page_indices[-1]+1} of '{filename}' (session={session_id})"
                )
        except Exception as e:
            logger.error(f"Pinecone upsert failed for session {session_id}: {e}")

    def search_pages(
        self,
        query: str,
        session_id: str,
        top_k: int = 3,
    ) -> list[dict]:
        """Semantic search within a specific PDF session. Returns page metadata."""
        index = self._get_index()
        if index is None:
            return []
        try:
            embedding = self._embed([query])[0]
            results = index.query(
                vector=embedding,
                top_k=top_k,
                filter={"session_id": {"$eq": session_id}},
                include_metadata=True,
            )
            return [
                {
                    "page_num": int(m.metadata.get("page_num", 0)),
                    "score": round(m.score, 3),
                    "snippet": m.metadata.get("text_snippet", ""),
                }
                for m in results.matches
            ]
        except Exception as e:
            logger.error(f"Pinecone search error: {e}")
            return []

    def find_chapter(
        self,
        query: str,
        class_number: Optional[int] = None,
        top_k: int = 5,
    ) -> list[dict]:
        """Find chapters across all indexed textbooks that match a topic query."""
        index = self._get_index()
        if index is None:
            return []
        try:
            embedding = self._embed([query])[0]
            filter_dict: dict = {}
            if class_number:
                filter_dict["class_number"] = {"$eq": class_number}
            results = index.query(
                vector=embedding,
                top_k=top_k,
                filter=filter_dict if filter_dict else None,
                include_metadata=True,
            )
            return [
                {
                    "filename": m.metadata.get("filename", ""),
                    "class_number": int(m.metadata.get("class_number", 0)),
                    "page_num": int(m.metadata.get("page_num", 1)),
                    "score": round(m.score, 3),
                    "snippet": m.metadata.get("text_snippet", ""),
                }
                for m in results.matches
            ]
        except Exception as e:
            logger.error(f"Pinecone chapter search error: {e}")
            return []
