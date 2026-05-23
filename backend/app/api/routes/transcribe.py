"""
Transcription Routes
POST /transcribe/audio           — upload audio/video file → text + braille
POST /transcribe/youtube         — YouTube URL → text + braille
POST /transcribe/generate-notes  — transcript or YouTube URL → full study notes
"""

from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from app.api.deps import (
    get_braille_service,
    get_transcription_service,
    get_video_agent,
)
from app.utils.audio_utils import convert_to_wav
from app.utils.file_utils import cleanup_file, save_upload_file

logger = logging.getLogger("sparshvaani.routes.transcribe")
router = APIRouter()

ALLOWED_AUDIO_TYPES = {
    "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/webm",
    "audio/flac", "audio/x-flac", "video/mp4", "video/webm", "video/ogg",
    "video/quicktime", "application/octet-stream",
}


class TranscriptionResponse(BaseModel):
    text: str
    language: str
    braille: str
    source: str


class YouTubeRequest(BaseModel):
    url: str
    language: str = "auto"


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


class NotesRequest(BaseModel):
    url: Optional[str] = None
    transcript: Optional[str] = None
    language: str = "en"


# ---------------------------------------------------------------------------

@router.post("/audio", response_model=TranscriptionResponse, summary="Transcribe audio file")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: str = Form(default="auto"),
):
    if file.content_type and file.content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(status_code=415, detail=f"Unsupported file type: {file.content_type}")

    svc = get_transcription_service()
    braille_svc = get_braille_service()

    file_path = ""
    wav_path = ""
    try:
        file_path = await save_upload_file(file)
        wav_path = file_path + ".wav"
        await run_in_threadpool(convert_to_wav, file_path, wav_path)

        result = await svc.transcribe_audio_file(wav_path, language)
        detected_lang = result.get("language", "en")
        braille_lang = detected_lang if detected_lang in ("en", "hi", "mr") else "en"
        braille = braille_svc.convert(result["text"], braille_lang)

        return TranscriptionResponse(
            text=result["text"],
            language=detected_lang,
            braille=braille,
            source=result.get("source", "whisper"),
        )
    except Exception as e:
        logger.error(f"Audio transcription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cleanup_file(file_path)
        cleanup_file(wav_path)


@router.post("/youtube", response_model=TranscriptionResponse, summary="Transcribe YouTube video")
async def transcribe_youtube(body: YouTubeRequest):
    svc = get_transcription_service()
    braille_svc = get_braille_service()
    try:
        result = await svc.transcribe_youtube(body.url, body.language)
        detected_lang = result.get("language", "en")
        braille_lang = detected_lang if detected_lang in ("en", "hi", "mr") else "en"
        braille = braille_svc.convert(result["text"], braille_lang)

        return TranscriptionResponse(
            text=result["text"],
            language=detected_lang,
            braille=braille,
            source=result.get("source", "whisper"),
        )
    except Exception as e:
        logger.error(f"YouTube transcription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-notes", response_model=VideoNotesResponse, summary="Generate study notes")
async def generate_notes(body: NotesRequest):
    """
    Accepts a YouTube URL or a raw transcript string.
    Returns full study material via VideoAgent pipeline.
    """
    has_url = bool(body.url and body.url.strip())
    has_transcript = bool(body.transcript and body.transcript.strip())

    if not has_url and not has_transcript:
        raise HTTPException(status_code=422, detail="Provide either 'url' or 'transcript'.")

    try:
        agent = get_video_agent()
        input_data: dict = {}
        if has_url:
            input_data["url"] = body.url
        else:
            input_data["transcript"] = body.transcript

        result = await agent.process(input_data, language=body.language)
        return VideoNotesResponse(**result)
    except Exception as e:
        logger.error(f"Notes generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
