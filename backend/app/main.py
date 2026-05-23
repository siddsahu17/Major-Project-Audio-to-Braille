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
from app.api.deps import get_transcription_service, get_tts_service


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

    yield

    logger.info("Shutting down Sparsh Vaani API.")


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
        allow_origins=[
            "http://localhost:5173",
            "http://localhost:3000",
            "https://your-app.vercel.app",
            "*"
        ],
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
    # Legacy routes kept intact
    app.include_router(image.router, prefix="/image", tags=["Image Analysis"])
    app.include_router(chat.router, prefix="/chat", tags=["Chat (Legacy)"])

    return app


app = create_app()
