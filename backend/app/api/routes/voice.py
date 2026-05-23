"""
Voice Tutor Routes
POST /voice/tutor  — audio + session context → Whisper → TutorAgent (function calling) → streaming TTS
DELETE /voice/tutor/session/{session_id} — clear tutor session history
"""

from __future__ import annotations

import logging
from urllib.parse import quote

from typing import Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse

from app.api.deps import (
    get_transcription_service,
    get_tts_service,
    get_tutor_agent,
)
from app.utils.audio_utils import convert_to_wav
from app.utils.file_utils import cleanup_file, save_upload_file

logger = logging.getLogger("sparshvaani.routes.voice")
router = APIRouter()


@router.post("/tutor")
async def voice_tutor(
    session_id: str = Form(...),
    page_num: int = Form(...),
    page_text: str = Form(default=""),
    total_pages: int = Form(default=1),
    language: str = Form(default="auto"),
    class_number: Optional[int] = Form(default=None),
    audio: UploadFile = File(...),
):
    """
    Full PDF-aware agentic voice tutor pipeline:
    audio upload → Whisper STT → TutorAgent (function calling) → OpenAI TTS-1 stream
    Metadata returned in CORS-exposed response headers.
    """
    transcription_svc = get_transcription_service()
    agent = get_tutor_agent()
    tts_svc = get_tts_service()

    file_path = ""
    wav_path = ""
    try:
        file_path = await save_upload_file(audio)
        wav_path = file_path + ".wav"
        await run_in_threadpool(convert_to_wav, file_path, wav_path)

        # 1. STT
        stt_result = await transcription_svc.transcribe_audio_file(wav_path, language)
        user_text: str = stt_result["text"]
        detected_lang: str = stt_result.get("language", "en")
        
        if language == "auto" or detected_lang in ("auto-detected", "unknown", "auto"):
            from app.utils.lang_detector import detect_devanagari_language
            detected_lang = detect_devanagari_language(user_text)
            
        lang = detected_lang if detected_lang in ("en", "hi", "mr") else "en"

        if not user_text.strip():
            raise HTTPException(
                status_code=400,
                detail="Could not transcribe speech. Please speak clearly and try again.",
            )

        # 2. TutorAgent agentic loop
        result = await agent.chat(
            user_text=user_text,
            session_id=session_id,
            page_num=page_num,
            page_text=page_text,
            language=lang,
            total_pages=total_pages,
            class_number=class_number,
        )
        response_text: str = result["response"]
        should_scroll: bool = result["should_scroll"]
        scroll_to_page = result.get("scroll_to_page")
        
        load_pdf = result.get("load_pdf", False)
        pdf_session_id = result.get("pdf_session_id")
        pdf_file_name = result.get("pdf_file_name")
        pdf_class_number = result.get("pdf_class_number")
        pdf_total_pages = result.get("pdf_total_pages")

        # 3. Streaming TTS
        tts_stream = tts_svc.stream_openai_tts(response_text, lang)

        expose = "X-Transcription,X-Response,X-Should-Scroll,X-Language,X-Scroll-To-Page,X-Load-PDF,X-PDF-Session-Id,X-PDF-Filename,X-PDF-Class,X-PDF-Total-Pages"
        headers = {
            "X-Transcription": quote(user_text, safe=" "),
            "X-Response": quote(response_text, safe=" "),
            "X-Should-Scroll": "true" if should_scroll else "false",
            "X-Language": lang,
            "X-Scroll-To-Page": str(scroll_to_page) if scroll_to_page is not None else "",
            "X-Load-PDF": "true" if load_pdf else "false",
            "X-PDF-Session-Id": str(pdf_session_id) if pdf_session_id is not None else "",
            "X-PDF-Filename": str(pdf_file_name) if pdf_file_name is not None else "",
            "X-PDF-Class": str(pdf_class_number) if pdf_class_number is not None else "",
            "X-PDF-Total-Pages": str(pdf_total_pages) if pdf_total_pages is not None else "",
            "Access-Control-Expose-Headers": expose,
        }

        return StreamingResponse(
            content=tts_stream,
            media_type="audio/mpeg",
            headers=headers,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Voice tutor error (session={session_id}): {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cleanup_file(file_path)
        cleanup_file(wav_path)


@router.delete("/tutor/session/{session_id}", status_code=204)
async def clear_tutor_session(session_id: str):
    """Clear the conversation history for a tutor session."""
    agent = get_tutor_agent()
    agent.clear_session(session_id)
