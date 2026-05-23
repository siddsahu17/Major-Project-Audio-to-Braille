"""
Voice Assistant Routes
POST /assistant/chat/voice — audio upload → STT → LLM → TTS → audio URL
POST /assistant/chat/text  — text message → LLM → TTS → audio URL
POST /assistant/session/new — create new session
DELETE /assistant/session/{session_id} — clear session memory
"""

from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from app.api.deps import (
    get_assistant_service,
    get_transcription_service,
    get_tts_service,
)
from app.utils.file_utils import save_upload_file, cleanup_file
from app.utils.audio_utils import convert_to_wav

logger = logging.getLogger("sparshvaani.routes.assistant")
router = APIRouter()


class TextChatRequest(BaseModel):
    session_id: str
    message: str
    language: str = "en"


class AssistantResponse(BaseModel):
    session_id: str
    transcription: str
    response: str
    audio_filename: str
    language: str


class NewSessionResponse(BaseModel):
    session_id: str


# ---------------------------------------------------------------------------

@router.post("/session/new", response_model=NewSessionResponse)
async def new_session():
    """Create and return a fresh conversation session ID."""
    return NewSessionResponse(session_id=str(uuid.uuid4()))


@router.delete("/session/{session_id}", status_code=204)
async def clear_session(session_id: str):
    """Clear conversation history for a session."""
    svc = get_assistant_service()
    svc.clear_session(session_id)


@router.post("/chat/voice", response_model=AssistantResponse)
async def chat_voice(
    session_id: str = Form(...),
    language: str = Form(default="auto"),
    audio: UploadFile = File(...),
):
    """
    Full voice pipeline: upload audio → Whisper STT → GPT-4o → gTTS.
    Returns the text response and a URL to the synthesized audio file.
    """
    transcription_svc = get_transcription_service()
    assistant_svc = get_assistant_service()
    tts_svc = get_tts_service()

    file_path = ""
    wav_path = ""
    try:
        file_path = await save_upload_file(audio)
        wav_path = file_path + ".wav"
        await run_in_threadpool(convert_to_wav, file_path, wav_path)

        # 1. Speech → Text
        stt_result = await transcription_svc.transcribe_audio_file(wav_path, language)
        user_text = stt_result["text"]
        detected_lang = stt_result.get("language", "en")
        
        if language == "auto" or detected_lang in ("auto-detected", "unknown", "auto"):
            from app.utils.lang_detector import detect_devanagari_language
            detected_lang = detect_devanagari_language(user_text)
            
        lang = detected_lang if detected_lang in ("en", "hi", "mr") else "en"

        if not user_text:
            raise HTTPException(
                status_code=422,
                detail="Could not transcribe any speech from the audio. Please speak clearly.",
            )

        # 2. LLM
        response_text = await assistant_svc.chat(user_text, session_id, lang)

        # 3. Text → Speech
        audio_filename = await tts_svc.synthesize(response_text, lang)

        return AssistantResponse(
            session_id=session_id,
            transcription=user_text,
            response=response_text,
            audio_filename=audio_filename,
            language=lang,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Voice chat error (session={session_id}): {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cleanup_file(file_path)
        cleanup_file(wav_path)


@router.post("/chat/text", response_model=AssistantResponse)
async def chat_text(body: TextChatRequest):
    """
    Text-only pipeline: text message → GPT-4o → gTTS.
    Useful when the browser's Web Speech API does STT client-side.
    """
    assistant_svc = get_assistant_service()
    tts_svc = get_tts_service()

    lang = body.language if body.language in ("en", "hi", "mr") else "en"
    try:
        response_text = await assistant_svc.chat(body.message, body.session_id, lang)
        audio_filename = await tts_svc.synthesize(response_text, lang)

        return AssistantResponse(
            session_id=body.session_id,
            transcription=body.message,
            response=response_text,
            audio_filename=audio_filename,
            language=lang,
        )
    except Exception as e:
        logger.error(f"Text chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
