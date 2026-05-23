"""
PDF Routes
POST /pdf/upload        — upload a PDF, extract all pages, return session_id + total_pages
GET  /pdf/page/{session_id}/{page_num} — return extracted text for a specific page
POST /pdf/notes         — upload a PDF and generate full study notes directly
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from typing import List

from pydantic import BaseModel

from app.api.deps import get_pdf_service, get_video_agent

logger = logging.getLogger("sparshvaani.routes.pdf")
router = APIRouter()


class Flashcard(BaseModel):
    question: str
    answer: str


class Timestamp(BaseModel):
    topic: str
    time: str
    description: str


class VideoNotesResponse(BaseModel):
    transcript: str
    summary: str
    key_points: List[str]
    detailed_notes: str
    flashcards: List[Flashcard]
    timestamps: List[Timestamp]


class LoadChapterRequest(BaseModel):
    file_name: str
    class_number: int


@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload a PDF, extract all page text, return session_id + total_pages."""
    content_type = file.content_type or ""
    filename = file.filename or "upload.pdf"

    if not (content_type.startswith("application/pdf") or filename.lower().endswith(".pdf")):
        raise HTTPException(status_code=422, detail="Only PDF files are accepted.")

    try:
        content = await file.read()
        svc = get_pdf_service()
        result = await svc.upload_pdf(content, filename)
        return result
    except Exception as e:
        logger.error(f"PDF upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{class_number}/{file_name}")
async def serve_textbook(class_number: int, file_name: str):
    """Serves the raw textbook PDF file directly to the frontend viewer."""
    try:
        from app.services.chapter_finder import get_pdf_path
        pdf_path = get_pdf_path(class_number, file_name)
        if not pdf_path.exists():
            raise HTTPException(status_code=404, detail="Textbook PDF not found")
        return FileResponse(pdf_path, media_type="application/pdf")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving textbook: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/load-chapter")
async def load_chapter(req: LoadChapterRequest):
    """Loads a textbook chapter by filename and class, parsing it into the tutor's session cache."""
    try:
        from app.services.chapter_finder import get_pdf_path
        pdf_path = get_pdf_path(req.class_number, req.file_name)
        if not pdf_path.exists():
            raise HTTPException(status_code=404, detail="Textbook PDF not found")

        with open(pdf_path, "rb") as f:
            content = f.read()

        svc = get_pdf_service()
        result = await svc.upload_pdf(content, f"{req.file_name}.pdf")
        return result
    except Exception as e:
        logger.error(f"Error loading chapter {req.file_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/page/{session_id}/{page_num}")
async def get_page(session_id: str, page_num: int):
    """Return the extracted text for a specific page (1-indexed)."""
    try:
        svc = get_pdf_service()
        text = svc.get_page_text(session_id, page_num)
        return {"session_id": session_id, "page": page_num, "text": text}
    except KeyError:
        raise HTTPException(status_code=404, detail="Page not found")
    except Exception as e:
        logger.error(f"PDF page fetch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/notes", response_model=VideoNotesResponse)
async def pdf_notes(
    file: UploadFile = File(...),
    language: str = "en",
):
    """
    Upload a PDF and generate comprehensive study notes, flashcards, and timestamps.
    Extracts all text from the PDF, then runs the VideoAgent pipeline.
    """
    content_type = file.content_type or ""
    filename = file.filename or ""

    if not (content_type.startswith("application/pdf") or filename.lower().endswith(".pdf")):
        raise HTTPException(status_code=422, detail="Only PDF files are accepted.")

    try:
        content = await file.read()
        svc = get_pdf_service()

        # Extract all page text from the PDF
        result = await svc.upload_pdf(content, filename)
        session_id = result["session_id"]
        total_pages = result["total_pages"]

        full_text_parts = []
        for page_num in range(1, total_pages + 1):
            try:
                text = svc.get_page_text(session_id, page_num)
                if text.strip():
                    full_text_parts.append(f"[Page {page_num}]\n{text}")
            except KeyError:
                continue

        full_text = "\n\n".join(full_text_parts)

        if not full_text.strip():
            raise HTTPException(
                status_code=422,
                detail="Could not extract text from this PDF. It may be scanned/image-based."
            )

        agent = get_video_agent()
        notes = await agent.process({"pdf_text": full_text}, language=language)
        return VideoNotesResponse(**notes)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PDF notes generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
