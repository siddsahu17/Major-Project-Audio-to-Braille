"""
Transcription Service
- Whisper model loaded once as a singleton (avoids ~2s reload per request)
- Supports English, Hindi, and Marathi via Whisper's multilingual model
- YouTube audio extracted in-memory via yt-dlp (no temp files)
- Falls back to OpenAI Whisper API if local model unavailable
"""

from __future__ import annotations

import asyncio
import io
import logging
import os
import tempfile
import uuid
from functools import lru_cache
from pathlib import Path
from typing import Optional
from app.services.sarvam_client import sarvam_transcribe

import numpy as np

logger = logging.getLogger("sparshvaani.transcription")

# Language code mapping: our API codes → Whisper language codes
LANG_MAP = {
    "en": "en",
    "hi": "hi",
    "mr": "mr",
    "auto": None,  # None tells Whisper to auto-detect
}


@lru_cache(maxsize=1)
def _load_whisper_model(model_size: str):
    """Load Whisper model once and cache it for the process lifetime."""
    try:
        import whisper  # type: ignore
        logger.info(f"Loading Whisper model '{model_size}'...")
        model = whisper.load_model(model_size)
        logger.info("Whisper model loaded and cached.")
        return model
    except Exception as e:
        logger.warning(f"Could not load local Whisper model: {e}")
        return None


class TranscriptionService:
    def __init__(self, model_size: str = "base", openai_api_key: Optional[str] = None):
        self.model_size = model_size
        self.openai_api_key = openai_api_key
        # Pre-warm the model on service init (runs once at server startup)
        self._model = _load_whisper_model(model_size)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def transcribe_audio_file(
        self, file_path: str, language: str = "auto"
    ) -> dict:
        """
        Transcribe an audio file. Runs Whisper in a thread pool to avoid
        blocking the asyncio event loop during CPU-intensive inference.
        """
        # NEW: Route Indian languages to Sarvam
        if language in ["hi", "mr"]:
            with open(file_path, "rb") as f:
                audio_bytes = f.read()
            text = await sarvam_transcribe(audio_bytes, language)
            return {
                "text": text,
                "language": language,
                "source": "sarvam-stt",
            }

        lang_code = LANG_MAP.get(language)
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None, self._transcribe_local, file_path, lang_code
        )
        return result

    async def transcribe_youtube(self, url: str, language: str = "auto") -> dict:
        """
        Download YouTube audio in-memory via yt-dlp, then transcribe.
        No permanent files are written to disk.
        """
        lang_code = LANG_MAP.get(language)
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None, self._transcribe_youtube_sync, url, lang_code
        )
        return result

    # ------------------------------------------------------------------
    # Internal helpers (synchronous — intended for thread pool)
    # ------------------------------------------------------------------

    def _transcribe_local(self, file_path: str, lang_code: Optional[str]) -> dict:
        if self._model is not None:
            return self._whisper_local(file_path, lang_code)
        return self._whisper_api(file_path, lang_code)

    def _whisper_local(self, file_path: str, lang_code: Optional[str]) -> dict:
        try:
            options: dict = {"fp16": False}
            if lang_code:
                options["language"] = lang_code
            result = self._model.transcribe(file_path, **options)
            return {
                "text": result["text"].strip(),
                "language": result.get("language", lang_code or "unknown"),
                "source": "whisper-local",
            }
        except Exception as e:
            logger.error(f"Local Whisper error: {e}")
            raise RuntimeError(f"Transcription failed: {e}") from e

    def _whisper_api(self, file_path: str, lang_code: Optional[str]) -> dict:
        if not self.openai_api_key:
            raise RuntimeError(
                "Local Whisper model unavailable and OPENAI_API_KEY not set."
            )
        try:
            from openai import OpenAI  # type: ignore

            client = OpenAI(api_key=self.openai_api_key)
            kwargs: dict = {"model": "whisper-1"}
            if lang_code:
                kwargs["language"] = lang_code
            with open(file_path, "rb") as f:
                transcript = client.audio.transcriptions.create(file=f, **kwargs)
            return {
                "text": transcript.text.strip(),
                "language": lang_code or "auto-detected",
                "source": "whisper-api",
            }
        except Exception as e:
            logger.error(f"OpenAI Whisper API error: {e}")
            raise RuntimeError(f"API transcription failed: {e}") from e

    def _transcribe_youtube_sync(self, url: str, lang_code: Optional[str]) -> dict:
        """Download YouTube audio to a temp file, transcribe, then delete."""
        tmp_path = Path(tempfile.gettempdir()) / f"sv_yt_{uuid.uuid4().hex}.wav"
        try:
            self._download_youtube_audio(url, str(tmp_path))
            return self._transcribe_local(str(tmp_path), lang_code)
        finally:
            if tmp_path.exists():
                tmp_path.unlink(missing_ok=True)

    @staticmethod
    def _download_youtube_audio(url: str, output_path: str) -> None:
        """Use yt-dlp to extract and download audio as WAV."""
        try:
            import yt_dlp  # type: ignore
        except ImportError:
            raise RuntimeError(
                "yt-dlp is not installed. Run: pip install yt-dlp"
            )

        ydl_opts = {
            "format": "bestaudio/best",
            "outtmpl": output_path.replace(".wav", ""),
            "postprocessors": [
                {
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "wav",
                    "preferredquality": "192",
                }
            ],
            "quiet": True,
            "no_warnings": True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
