"""
PDF Service
Extracts text page-by-page from uploaded PDFs.
Primary: PyMuPDF (fitz). Fallback for blank pages: pdfplumber.
Extracted pages are cached in-memory by session_id (LRU, max 20 sessions).
"""

from __future__ import annotations

import io
import logging
import uuid
from collections import OrderedDict
from typing import Optional

logger = logging.getLogger("sparshvaani.pdf")

_MAX_SESSIONS = 20


class _LRUCache:
    """Fixed-capacity LRU cache backed by OrderedDict."""

    def __init__(self, capacity: int) -> None:
        self._cap = capacity
        self._data: OrderedDict = OrderedDict()

    def __contains__(self, key: str) -> bool:
        return key in self._data

    def __getitem__(self, key: str):
        self._data.move_to_end(key)
        return self._data[key]

    def __setitem__(self, key: str, value) -> None:
        if key in self._data:
            self._data.move_to_end(key)
        self._data[key] = value
        if len(self._data) > self._cap:
            evicted = next(iter(self._data))
            del self._data[evicted]
            logger.debug(f"LRU evicted PDF session {evicted}")


# session_id → {0: "page 1 text", 1: "page 2 text", ...}  (0-indexed)
_pdf_cache: _LRUCache = _LRUCache(_MAX_SESSIONS)
# session_id → raw PDF bytes (for vision tool)
_pdf_bytes: _LRUCache = _LRUCache(_MAX_SESSIONS)


class PDFService:

    async def upload_pdf(self, file_bytes: bytes, filename: str, session_id: Optional[str] = None) -> dict:
        if not session_id:
            session_id = uuid.uuid4().hex
        pages: dict[int, str] = {}

        try:
            import fitz  # PyMuPDF
        except ImportError:
            raise RuntimeError("PyMuPDF is not installed. Run: pip install pymupdf")

        doc = fitz.open(stream=file_bytes, filetype="pdf")
        total = len(doc)

        for i in range(total):
            page = doc[i]
            text = page.get_text("text").strip()

            if not text:
                # Fallback: try pdfplumber for this page
                text = self._extract_page_pdfplumber(file_bytes, i) or ""

            pages[i] = text

        doc.close()
        _pdf_cache[session_id] = pages
        _pdf_bytes[session_id] = file_bytes
        logger.info(
            f"PDF '{filename}' uploaded: {total} pages cached under session {session_id}"
        )
        return {
            "session_id": session_id,
            "total_pages": total,
            "filename": filename,
        }

    def get_page_text(self, session_id: str, page_num: int) -> str:
        """page_num is 1-indexed (as the frontend sends it)."""
        if session_id not in _pdf_cache:
            raise KeyError(f"Session '{session_id}' not found")
        pages = _pdf_cache[session_id]
        zero_idx = page_num - 1
        if zero_idx not in pages:
            raise KeyError(f"Page {page_num} not found in session '{session_id}'")
        return pages[zero_idx]

    def get_raw_bytes(self, session_id: str) -> bytes:
        if session_id not in _pdf_bytes:
            raise KeyError(f"Session '{session_id}' not found")
        return _pdf_bytes[session_id]

    @staticmethod
    def _extract_page_pdfplumber(file_bytes: bytes, page_index: int) -> Optional[str]:
        try:
            import pdfplumber  # type: ignore
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                if page_index >= len(pdf.pages):
                    return None
                text = pdf.pages[page_index].extract_text()
                return (text or "").strip() or None
        except Exception as e:
            logger.warning(f"pdfplumber fallback failed for page {page_index}: {e}")
            return None
