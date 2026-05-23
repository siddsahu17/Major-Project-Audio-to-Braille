"""
Voice Assistant Service
- Per-session conversation memory (in-process dict, ready for Redis upgrade)
- Async OpenAI chat completion with gpt-4o
- Language-aware: detects language from Whisper output, responds in same language
- Full pipeline: STT → LLM → TTS, all async
"""

from __future__ import annotations

import logging
import os
import uuid
from collections import defaultdict
from typing import Optional

from openai import AsyncOpenAI  # type: ignore

logger = logging.getLogger("sparshvaani.assistant")

# System prompts in each supported language
_SYSTEM_PROMPTS = {
    "en": (
        "You are Sparsh Vaani, a concise, friendly voice assistant for visually impaired students. "
        "Keep responses short (2–3 sentences max), clear, and conversational. "
        "Never use markdown, bullet points, or formatting — responses are read aloud. "
        "Respond in English."
    ),
    "hi": (
        "आप स्पर्श वाणी हैं, एक संक्षिप्त और मैत्रीपूर्ण वॉइस असिस्टेंट जो दृष्टिबाधित छात्रों की मदद करता है। "
        "उत्तर छोटे (2-3 वाक्य), स्पष्ट और बोलचाल की भाषा में रखें। "
        "कोई markdown, bullet points या formatting का उपयोग न करें — उत्तर जोर से पढ़े जाएंगे। "
        "हिंदी में उत्तर दें।"
    ),
    "mr": (
        "तुम्ही स्पर्श वाणी आहात, एक संक्षिप्त आणि मैत्रीपूर्ण व्हॉइस असिस्टंट जो दृष्टिहीन विद्यार्थ्यांना मदत करतो. "
        "उत्तरे लहान (2-3 वाक्ये), स्पष्ट आणि बोलण्याच्या भाषेत ठेवा. "
        "कोणतेही markdown, bullet points किंवा formatting वापरू नका — उत्तरे मोठ्याने वाचली जातील. "
        "मराठीत उत्तर द्या."
    ),
}

# In-memory session store: session_id → list of message dicts
_sessions: dict[str, list[dict]] = defaultdict(list)
_MAX_HISTORY = 10  # max turns (user+assistant) per session


class AssistantService:
    def __init__(self, openai_api_key: str):
        self.client = AsyncOpenAI(api_key=openai_api_key)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def chat(
        self,
        user_text: str,
        session_id: str,
        language: str = "en",
    ) -> str:
        """Send a user message and get an LLM response. Returns response text."""
        lang = language if language in _SYSTEM_PROMPTS else "en"

        history = _sessions[session_id]
        history.append({"role": "user", "content": user_text})
        self._trim(history)

        system = {"role": "system", "content": _SYSTEM_PROMPTS[lang]}
        messages = [system] + history

        try:
            completion = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                max_tokens=200,
                temperature=0.7,
            )
            assistant_text = completion.choices[0].message.content.strip()
            history.append({"role": "assistant", "content": assistant_text})
            self._trim(history)
            return assistant_text
        except Exception as e:
            logger.error(f"OpenAI chat error (session={session_id}): {e}")
            # Return a polite error in the user's language
            fallbacks = {
                "en": "I'm sorry, I'm having trouble responding right now. Please try again.",
                "hi": "मुझे खेद है, मुझे अभी जवाब देने में परेशानी हो रही है। कृपया पुनः प्रयास करें।",
                "mr": "मला माफ करा, मला आत्ता उत्तर देण्यात अडचण येत आहे. कृपया पुन्हा प्रयत्न करा.",
            }
            return fallbacks.get(lang, fallbacks["en"])

    def clear_session(self, session_id: str) -> None:
        _sessions.pop(session_id, None)

    def new_session_id(self) -> str:
        return str(uuid.uuid4())

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _trim(history: list) -> None:
        limit = _MAX_HISTORY * 2
        if len(history) > limit:
            del history[: len(history) - limit]
