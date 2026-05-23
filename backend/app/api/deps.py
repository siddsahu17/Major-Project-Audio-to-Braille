"""
Dependency injection singletons for FastAPI routes.
All heavy objects (Whisper model, OpenAI client) are instantiated once
and reused across all requests.
"""

from __future__ import annotations

from functools import lru_cache

from app.config.settings import settings
from app.services.braille_service import BrailleService
from app.services.transcription_service import TranscriptionService
from app.services.tts_service import TTSService
from app.services.assistant_service import AssistantService
from app.services.pdf_service import PDFService
from app.services.rag_service import RAGService
from app.services.tutor_agent import TutorAgent
from app.services.video_agent import VideoAgent
from app.agents.intent_agent import IntentAgent
from app.services.auto_loader import AutoLoaderService


@lru_cache(maxsize=1)
def get_transcription_service() -> TranscriptionService:
    api_key = settings.OPENAI_API_KEY.strip() if settings.OPENAI_API_KEY else None
    return TranscriptionService(
        model_size=settings.WHISPER_MODEL,
        openai_api_key=api_key,
    )


@lru_cache(maxsize=1)
def get_braille_service() -> BrailleService:
    return BrailleService()


@lru_cache(maxsize=1)
def get_tts_service() -> TTSService:
    return TTSService(audio_dir=settings.TEMP_DIR)


@lru_cache(maxsize=1)
def get_assistant_service() -> AssistantService:
    api_key = settings.OPENAI_API_KEY.strip() if settings.OPENAI_API_KEY else None
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set. The voice assistant requires an OpenAI key.")
    return AssistantService(openai_api_key=api_key)


@lru_cache(maxsize=1)
def get_pdf_service() -> PDFService:
    return PDFService()


@lru_cache(maxsize=1)
def get_rag_service() -> RAGService:
    api_key = settings.OPENAI_API_KEY.strip() if settings.OPENAI_API_KEY else None
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set. RAGService requires an OpenAI key.")
    return RAGService(
        pinecone_api_key=settings.PINECONE_API_KEY,
        index_name=settings.PINECONE_INDEX_NAME,
        openai_api_key=api_key,
    )


@lru_cache(maxsize=1)
def get_tutor_agent() -> TutorAgent:
    api_key = settings.OPENAI_API_KEY.strip() if settings.OPENAI_API_KEY else None
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set. TutorAgent requires an OpenAI key.")
    pdf_svc = get_pdf_service()
    rag_svc = get_rag_service()
    return TutorAgent(openai_api_key=api_key, pdf_service=pdf_svc, rag_service=rag_svc)


@lru_cache(maxsize=1)
def get_video_agent() -> VideoAgent:
    api_key = settings.OPENAI_API_KEY.strip() if settings.OPENAI_API_KEY else None
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set. VideoAgent requires an OpenAI key.")
    transcription_svc = get_transcription_service()
    return VideoAgent(openai_api_key=api_key, transcription_service=transcription_svc)


@lru_cache(maxsize=1)
def get_intent_agent() -> IntentAgent:
    api_key = settings.OPENAI_API_KEY.strip() if settings.OPENAI_API_KEY else None
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set. IntentAgent requires an OpenAI key.")
    return IntentAgent(openai_api_key=api_key)


@lru_cache(maxsize=1)
def get_auto_loader_service() -> AutoLoaderService:
    pdf_svc = get_pdf_service()
    rag_svc = get_rag_service()
    return AutoLoaderService(pdf_service=pdf_svc, rag_service=rag_svc)


# Legacy pipeline dependency kept so existing image/chat routes don't break
def get_pipeline():
    from app.core.pipeline import AssistantPipeline
    return AssistantPipeline()
