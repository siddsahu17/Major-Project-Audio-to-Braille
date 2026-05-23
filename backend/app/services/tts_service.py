"""
Text-to-Speech Service
- Uses gTTS for English, Hindi, and Marathi
- Generates MP3 files served via FastAPI StaticFiles
- Auto-cleans files older than 10 minutes to prevent disk bloat
- Async-safe: IO and gTTS run in a thread pool executor
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
import uuid
from pathlib import Path
from typing import AsyncGenerator, Optional

logger = logging.getLogger("sparshvaani.tts")

# gTTS language codes for our supported languages
GTTS_LANG_MAP = {
    "en": "en",
    "hi": "hi",
    "mr": "mr",
}

# Fallback if gTTS fails: use pyttsx3 (offline, no language restriction)
_pyttsx3_engine = None


def _get_pyttsx3():
    global _pyttsx3_engine
    if _pyttsx3_engine is None:
        try:
            import pyttsx3  # type: ignore
            _pyttsx3_engine = pyttsx3.init()
        except Exception:
            pass
    return _pyttsx3_engine


class TTSService:
    def __init__(self, audio_dir: str):
        self.audio_dir = Path(audio_dir)
        self.audio_dir.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def synthesize(self, text: str, language: str = "en") -> str:
        """
        Convert text to speech. Returns the filename (not full path) so the
        frontend can construct the URL: GET /audio/<filename>
        """
        if language in ["hi", "mr"]:
            from app.services.sarvam_client import sarvam_tts
            audio_bytes = await sarvam_tts(text, language)
            filename = f"tts_{uuid.uuid4().hex}.wav"
            output_path = self.audio_dir / filename
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, lambda: output_path.write_bytes(audio_bytes))
            asyncio.create_task(self._cleanup_old_files())
            return filename

        lang_code = GTTS_LANG_MAP.get(language, "en")
        filename = f"tts_{uuid.uuid4().hex}.mp3"
        output_path = self.audio_dir / filename

        loop = asyncio.get_running_loop()
        await loop.run_in_executor(
            None, self._generate_gtts, text, lang_code, str(output_path)
        )

        # Non-blocking cleanup of stale files
        asyncio.create_task(self._cleanup_old_files())

        return filename

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _generate_gtts(text: str, lang: str, output_path: str) -> None:
        try:
            from gtts import gTTS  # type: ignore

            tts = gTTS(text=text, lang=lang, slow=False)
            tts.save(output_path)
            logger.info(f"TTS generated: {output_path} (lang={lang})")
        except Exception as e:
            logger.error(f"gTTS error (lang={lang}): {e}")
            # Try offline fallback
            engine = _get_pyttsx3()
            if engine:
                try:
                    engine.save_to_file(text, output_path)
                    engine.runAndWait()
                    logger.info("TTS fallback via pyttsx3 succeeded")
                except Exception as fe:
                    logger.error(f"pyttsx3 fallback also failed: {fe}")
                    raise RuntimeError("All TTS engines failed") from fe
            else:
                raise RuntimeError(f"gTTS failed and pyttsx3 unavailable: {e}") from e

    async def stream_openai_tts(
        self, text: str, language: str = "en"
    ) -> AsyncGenerator[bytes, None]:
        """Stream TTS audio bytes. Uses gTTS for English, Sarvam for hi/mr."""
        if language in ["hi", "mr"]:
            from app.services.sarvam_client import sarvam_tts
            audio_bytes = await sarvam_tts(text, language)
            chunk_size = 4096
            for i in range(0, len(audio_bytes), chunk_size):
                yield audio_bytes[i:i + chunk_size]
            return

        # English: generate via gTTS into a BytesIO buffer, then stream chunks
        import io as _io
        from gtts import gTTS  # type: ignore

        loop = asyncio.get_running_loop()
        buf = _io.BytesIO()

        def _gtts_to_buf() -> bytes:
            tts = gTTS(text=text, lang="en", slow=False)
            tts.write_to_fp(buf)
            return buf.getvalue()

        audio_bytes = await loop.run_in_executor(None, _gtts_to_buf)
        chunk_size = 4096
        for i in range(0, len(audio_bytes), chunk_size):
            yield audio_bytes[i:i + chunk_size]

    async def _cleanup_old_files(self, max_age_seconds: int = 600) -> None:
        """Delete audio files older than max_age_seconds (default 10 min)."""
        now = time.time()
        for f in self.audio_dir.glob("tts_*"):
            try:
                if now - f.stat().st_mtime > max_age_seconds:
                    f.unlink()
                    logger.debug(f"Cleaned up stale TTS file: {f.name}")
            except Exception:
                pass
