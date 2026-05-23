import logging
from typing import Optional, Dict, Any
from pathlib import Path
from app.services.pdf_service import PDFService
from app.services.rag_service import RAGService
from app.services.chapter_finder import find_chapter, get_pdf_path

logger = logging.getLogger("sparshvaani.auto_loader")

class AutoLoaderService:
    def __init__(self, pdf_service: PDFService, rag_service: RAGService) -> None:
        self.pdf_service = pdf_service
        self.rag_service = rag_service

    async def load_chapter(self, topic: str, class_number: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """
        Auto-load a chapter based on a search topic and optional class number.
        Tries searching specifically with class_number first, and falls back to all classes.
        """
        # 1. Search JSON knowledge maps for matching chapter
        match = find_chapter(topic, class_number)
        if not match and class_number is not None:
            # Fallback: search all classes if specific class check failed
            match = find_chapter(topic, None)
            
        if not match:
            logger.warning(f"No textbook chapter found for topic '{topic}' and class '{class_number}'")
            return None
            
        # Get total pages quickly
        try:
            import fitz
            doc = fitz.open(match["pdf_path"])
            total_pages = len(doc)
            doc.close()
        except Exception as e:
            logger.error(f"Failed to read PDF page count from {match['pdf_path']}: {e}")
            return None

        # Stable session ID format: class{N}_{filename}
        matched_class = match["class"]
        filename = match["file_name"]
        stable_id = f"class{matched_class}_{filename}"
        
        await self.load_chapter_direct(match, stable_id, total_pages)
        
        return {
            "session_id": stable_id,
            "filename": filename,
            "class_number": matched_class,
            "chapter_title": match["title"],
            "total_pages": total_pages,
        }

    async def load_chapter_direct(self, match: Dict[str, Any], stable_id: str, total_pages: int) -> None:
        """
        Loads the PDF into PDF service and conditionally indexes it into Pinecone (if not already indexed).
        Saves time and Pinecone read/write units by using stable fetch.
        """
        filename = match["file_name"]
        matched_class = match["class"]
        title = match["title"]
        pdf_path = Path(match["pdf_path"])
        
        try:
            # 1. Read PDF bytes
            with open(pdf_path, "rb") as f:
                content = f.read()
                
            # 2. Upload to PDF service with custom stable_id
            await self.pdf_service.upload_pdf(content, f"{filename}.pdf", session_id=stable_id)
            
            # 3. Check if already indexed in Pinecone using stable fetch
            already_indexed = False
            index = self.rag_service._get_index()
            if index is not None:
                try:
                    # Fetch specific vector ID (e.g. page 0)
                    fetch_res = index.fetch(ids=[f"{stable_id}__p0"])
                    if fetch_res and fetch_res.get("vectors"):
                        already_indexed = True
                        logger.info(f"Chapter '{title}' (stable_id='{stable_id}') is already indexed in Pinecone. Skipping RAG indexing.")
                except Exception as e:
                    logger.warning(f"Failed to check Pinecone index status using fetch: {e}")
            
            # 4. Index pages if not already indexed
            if not already_indexed:
                logger.info(f"Indexing chapter '{title}' (stable_id='{stable_id}') into Pinecone...")
                pages = {i: self.pdf_service.get_page_text(stable_id, i + 1)
                         for i in range(total_pages)}
                await self.rag_service.index_pdf_pages(
                    session_id=stable_id,
                    filename=f"{filename}.pdf",
                    pages=pages,
                    class_number=matched_class,
                )
                logger.info(f"Indexing completed successfully for stable_id='{stable_id}'")
        except Exception as e:
            logger.error(f"Error loading chapter direct {filename}: {e}")
            raise
