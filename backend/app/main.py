"""
Sparsh Vaani — FastAPI Backend
Entry point. Run with:
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config.logging import logger
from app.config.settings import settings
from app.api.routes import health, image, chat
from app.api.routes.transcribe import router as transcribe_router
from app.api.routes.braille import router as braille_router
from app.api.routes.assistant import router as assistant_router
from app.api.routes.pdf import router as pdf_router
from app.api.routes.voice import router as voice_router
from app.api.routes.onboarding import router as onboarding_router
from app.api.deps import get_transcription_service, get_tts_service, get_rag_service, get_pdf_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Pre-warm heavy singletons at startup so the first user request isn't slow.
    Whisper model (~140 MB for 'base') is loaded into RAM here.
    """
    logger.info("Starting Sparsh Vaani API — pre-warming services...")
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.TEMP_DIR, exist_ok=True)

    try:
        get_transcription_service()   # Loads Whisper model
        get_tts_service()             # Creates audio temp dir
        logger.info("Services pre-warmed successfully.")
    except Exception as e:
        logger.warning(f"Service pre-warm warning (non-fatal): {e}")

    # Index all pre-loaded textbooks into Pinecone (non-blocking)
    import asyncio as _asyncio
    _asyncio.create_task(_index_all_textbooks())

    yield

    logger.info("Shutting down Sparsh Vaani API.")


async def _index_all_textbooks() -> None:
    """Walk the textbook directory and index all PDFs into Pinecone on startup."""
    try:
        from app.services.chapter_finder import list_all_textbooks  # type: ignore
        textbooks = list_all_textbooks()
    except Exception:
        logger.debug("chapter_finder.list_all_textbooks not available — skipping bulk indexing.")
        return

    if not textbooks:
        return

    try:
        rag = get_rag_service()
        pdf_svc = get_pdf_service()
    except Exception as e:
        logger.warning(f"RAG startup indexing skipped: {e}")
        return

    for tb in textbooks:
        try:
            import aiofiles  # type: ignore
            async with aiofiles.open(tb["pdf_path"], "rb") as f:
                content = await f.read()
            result = await pdf_svc.upload_pdf(content, tb["filename"])
            pages = {i: pdf_svc.get_page_text(result["session_id"], i + 1)
                     for i in range(result["total_pages"])}
            await rag.index_pdf_pages(
                result["session_id"],
                tb["filename"],
                pages,
                class_number=tb.get("class_number"),
            )
            logger.info(f"Indexed textbook: {tb['filename']}")
        except Exception as e:
            logger.warning(f"Failed to index {tb.get('filename', '?')}: {e}")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Sparsh Vaani API",
        description=(
            "Accessible AI backend for blind and visually impaired students. "
            "Supports English, Hindi, and Marathi across all features."
        ),
        version="2.0.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # ── Validation error handler — logs exact field errors for debugging ─
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        errors = exc.errors()
        logger.error(f"Validation error on {request.method} {request.url.path}: {errors}")
        return JSONResponse(
            status_code=422,
            content={"detail": [{"field": e.get("loc", [])[-1], "msg": e.get("msg", "")} for e in errors]},
        )

    # ── CORS ─────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list(),
        allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=[
            "X-Transcription",
            "X-Response",
            "X-Should-Scroll",
            "X-Language",
            "X-Scroll-To-Page",
            "X-Load-PDF",
            "X-PDF-Session-Id",
            "X-PDF-Filename",
            "X-PDF-Class",
            "X-PDF-Total-Pages",
        ],
    )

    # ── Static audio files served at /audio/<filename> ───────────────────
    os.makedirs(settings.TEMP_DIR, exist_ok=True)
    app.mount("/audio", StaticFiles(directory=settings.TEMP_DIR), name="audio")

    # ── Routes ───────────────────────────────────────────────────────────
    app.include_router(health.router, prefix="/health", tags=["Health"])
    app.include_router(transcribe_router, prefix="/transcribe", tags=["Transcription"])
    app.include_router(braille_router, prefix="/braille", tags=["Braille"])
    app.include_router(assistant_router, prefix="/assistant", tags=["Voice Assistant"])
    app.include_router(pdf_router, prefix="/pdf", tags=["PDF Tutor"])
    app.include_router(voice_router, prefix="/voice", tags=["Voice Tutor"])
    app.include_router(onboarding_router, prefix="/api/onboarding", tags=["Onboarding"])
    # Legacy routes kept intact
    app.include_router(image.router, prefix="/image", tags=["Image Analysis"])
    app.include_router(chat.router, prefix="/chat", tags=["Chat (Legacy)"])

    return app


app = create_app()
