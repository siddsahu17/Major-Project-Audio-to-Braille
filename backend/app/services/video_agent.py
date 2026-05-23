"""
VideoAgent — Direct pipeline for generating study material from video/audio/PDF.
Runs steps in sequence: transcribe → summarize → notes → flashcards → timestamps.
Uses asyncio.gather for parallel LLM calls where possible.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import tempfile

from openai import AsyncOpenAI

logger = logging.getLogger("sparshvaani.video_agent")

_NOTES_PROMPT = """You are an expert educational content creator. Generate comprehensive, structured study notes in {language} from the following transcript.

Return ONLY valid JSON with exactly these keys:
- summary: A 3-5 sentence overview of the entire content
- key_points: An array of 6-10 concise key takeaways (each a full sentence)
- detailed_notes: A thorough multi-paragraph explanation of all major concepts, suitable for a student studying for an exam. Minimum 400 words. Use clear paragraphs separated by newlines.

Transcript:
{transcript}"""

_FLASHCARDS_PROMPT = """Generate {num_cards} high-quality question-answer flashcards in {language} for active recall from this educational content. Cover the most important concepts.

Return ONLY valid JSON: {{"flashcards": [{{"question": "...", "answer": "..."}}]}}

Content:
{transcript}"""

_TIMESTAMPS_PROMPT = """Identify 5-8 key topic sections with estimated timestamps in {language} from this transcript. Base timestamps on approximate position in the text (beginning, quarter, middle, etc.).

Return ONLY valid JSON: {{"timestamps": [{{"topic": "...", "time": "MM:SS", "description": "One sentence description"}}]}}

Transcript:
{transcript}"""


class VideoAgent:
    def __init__(self, openai_api_key: str, transcription_service=None) -> None:
        self.client = AsyncOpenAI(api_key=openai_api_key)
        self.transcription_service = transcription_service

    async def process(self, input_data: dict, language: str = "en") -> dict:
        """
        input_data: {"url": "..."} | {"transcript": "..."} | {"pdf_text": "..."}
        Returns full VideoNotesResult dict.
        """
        # Step 1: Acquire transcript
        transcript = await self._acquire_transcript(input_data, language)
        if not transcript.strip():
            return self._empty_result()

        # Truncate for LLM context (keep first ~12,000 chars ≈ ~3,000 tokens)
        truncated = transcript[:12000]

        # Step 2: Run all generation tasks in parallel
        notes_task = self._generate_notes(truncated, language)
        flashcards_task = self._generate_flashcards(truncated, language, num_cards=10)
        timestamps_task = self._generate_timestamps(truncated, language)

        notes, flashcards, timestamps = await asyncio.gather(
            notes_task, flashcards_task, timestamps_task, return_exceptions=True
        )

        # Graceful fallback if any task failed
        if isinstance(notes, Exception):
            logger.error(f"Notes generation failed: {notes}")
            notes = {"summary": "Notes could not be generated.", "key_points": [], "detailed_notes": ""}
        if isinstance(flashcards, Exception):
            logger.error(f"Flashcards generation failed: {flashcards}")
            flashcards = []
        if isinstance(timestamps, Exception):
            logger.error(f"Timestamps generation failed: {timestamps}")
            timestamps = []

        return {
            "transcript": transcript,
            "summary": notes.get("summary", ""),
            "key_points": notes.get("key_points", []),
            "detailed_notes": notes.get("detailed_notes", ""),
            "flashcards": flashcards,
            "timestamps": timestamps,
        }

    async def _acquire_transcript(self, input_data: dict, language: str) -> str:
        if "transcript" in input_data and input_data["transcript"].strip():
            return input_data["transcript"].strip()

        if "pdf_text" in input_data and input_data["pdf_text"].strip():
            return input_data["pdf_text"].strip()

        if "url" in input_data and input_data["url"].strip():
            return await self._youtube_to_transcript(input_data["url"], language)

        return ""

    async def _youtube_to_transcript(self, url: str, language: str) -> str:
        try:
            import yt_dlp
            tmp = tempfile.mkdtemp()
            audio_path = os.path.join(tmp, "audio.mp3")
            opts = {
                "format": "bestaudio/best",
                "outtmpl": os.path.join(tmp, "audio.%(ext)s"),
                "postprocessors": [{
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "mp3",
                    "preferredquality": "128",
                }],
                "quiet": True,
                "no_warnings": True,
            }
            with yt_dlp.YoutubeDL(opts) as ydl:
                ydl.download([url])

            if not os.path.exists(audio_path):
                # yt-dlp may produce a different filename
                for f in os.listdir(tmp):
                    if f.endswith((".mp3", ".m4a", ".webm", ".ogg")):
                        audio_path = os.path.join(tmp, f)
                        break

            if not os.path.exists(audio_path):
                raise RuntimeError("Audio file not found after yt-dlp extraction.")

            if self.transcription_service:
                result = await self.transcription_service.transcribe_audio_file(audio_path, language)
                return result.get("text", "")

            with open(audio_path, "rb") as f:
                resp = await self.client.audio.transcriptions.create(
                    model="whisper-1",
                    file=f,
                    language=None if language == "auto" else language,
                )
            return resp.text
        except Exception as e:
            logger.error(f"YouTube transcript extraction failed: {e}")
            raise RuntimeError(f"Could not extract audio from YouTube URL: {e}")

    async def _generate_notes(self, transcript: str, language: str) -> dict:
        lang_name = {"en": "English", "hi": "Hindi", "mr": "Marathi"}.get(language, "English")
        prompt = _NOTES_PROMPT.format(language=lang_name, transcript=transcript)
        resp = await self.client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2000,
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        data = json.loads(resp.choices[0].message.content or "{}")
        return {
            "summary": data.get("summary", ""),
            "key_points": data.get("key_points", []),
            "detailed_notes": data.get("detailed_notes", ""),
        }

    async def _generate_flashcards(self, transcript: str, language: str, num_cards: int = 10) -> list:
        lang_name = {"en": "English", "hi": "Hindi", "mr": "Marathi"}.get(language, "English")
        prompt = _FLASHCARDS_PROMPT.format(
            num_cards=num_cards, language=lang_name, transcript=transcript
        )
        resp = await self.client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1500,
            temperature=0.4,
            response_format={"type": "json_object"},
        )
        data = json.loads(resp.choices[0].message.content or "{}")
        return data.get("flashcards", [])

    async def _generate_timestamps(self, transcript: str, language: str) -> list:
        lang_name = {"en": "English", "hi": "Hindi", "mr": "Marathi"}.get(language, "English")
        prompt = _TIMESTAMPS_PROMPT.format(language=lang_name, transcript=transcript)
        resp = await self.client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=600,
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        data = json.loads(resp.choices[0].message.content or "{}")
        return data.get("timestamps", [])

    @staticmethod
    def _empty_result() -> dict:
        return {
            "transcript": "",
            "summary": "No content provided.",
            "key_points": [],
            "detailed_notes": "",
            "flashcards": [],
            "timestamps": [],
        }
