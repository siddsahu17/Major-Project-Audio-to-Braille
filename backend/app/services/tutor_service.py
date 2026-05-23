"""
Tutor Service
PDF-aware conversational tutor using GPT-4o.
Injects the current PDF page content into the system prompt.
Detects [SCROLL_DOWN] intent token in model output.
Per-session history trimmed to 10 turns.
"""

from __future__ import annotations

import logging
import uuid
from collections import defaultdict

from openai import AsyncOpenAI

logger = logging.getLogger("sparshvaani.tutor")

# session_id → list of {"role": ..., "content": ...}
_tutor_sessions: dict[str, list[dict]] = defaultdict(list)
_MAX_HISTORY = 10  # max turns (user + assistant pairs)

_SYSTEM_TEMPLATES: dict[str, str] = {
    "en": (
        "You are Sparsh Vaani, a patient AI tutor for visually impaired students. "
        "The student is reading page {page_num} of their PDF. The page content is:\n\n"
        "{page_text}\n\n"
        "Answer questions clearly in 2-4 sentences. "
        "Never use markdown, bullet points, or any formatting — responses are spoken aloud. "
        "If the student asks to move forward, go to next page, scroll down, or continue, "
        "include the token [SCROLL_DOWN] at the very START of your response, "
        "then give a brief introduction to the next topic. "
        "Respond in English."
    ),
    "hi": (
        "आप स्पर्श वाणी हैं, एक धैर्यशील AI शिक्षक जो दृष्टिबाधित छात्रों की मदद करते हैं। "
        "छात्र अपनी PDF के पृष्ठ {page_num} को पढ़ रहा है। पृष्ठ की सामग्री:\n\n"
        "{page_text}\n\n"
        "प्रश्नों का उत्तर 2-4 वाक्यों में स्पष्ट रूप से दें। "
        "कोई markdown, bullet points या formatting का उपयोग न करें — उत्तर जोर से पढ़े जाएंगे। "
        "यदि छात्र आगे बढ़ने, अगले पृष्ठ पर जाने, या जारी रखने के लिए कहता है, "
        "तो अपने उत्तर की शुरुआत में [SCROLL_DOWN] token शामिल करें, "
        "फिर अगले विषय का संक्षिप्त परिचय दें। "
        "हिंदी में उत्तर दें।"
    ),
    "mr": (
        "तुम्ही स्पर्श वाणी आहात, दृष्टिहीन विद्यार्थ्यांसाठी एक संयमी AI शिक्षक. "
        "विद्यार्थी त्यांच्या PDF च्या {page_num} व्या पृष्ठाचे वाचन करत आहे. पृष्ठाची सामग्री:\n\n"
        "{page_text}\n\n"
        "प्रश्नांची उत्तरे 2-4 वाक्यांमध्ये स्पष्टपणे द्या. "
        "कोणतेही markdown, bullet points किंवा formatting वापरू नका — उत्तरे मोठ्याने वाचली जातील. "
        "जर विद्यार्थ्याने पुढे जाण्यास, पुढील पृष्ठावर जाण्यास, किंवा सुरू ठेवण्यास सांगितले, "
        "तर उत्तराच्या अगदी सुरुवातीला [SCROLL_DOWN] token समाविष्ट करा, "
        "नंतर पुढील विषयाचा संक्षिप्त परिचय द्या. "
        "मराठीत उत्तर द्या."
    ),
}


class TutorService:
    def __init__(self, openai_api_key: str) -> None:
        self.client = AsyncOpenAI(api_key=openai_api_key)

    async def chat_with_page(
        self,
        user_text: str,
        session_id: str,
        page_num: int,
        page_text: str,
        language: str = "en",
    ) -> dict:
        lang = language if language in _SYSTEM_TEMPLATES else "en"

        system_content = _SYSTEM_TEMPLATES[lang].format(
            page_num=page_num,
            page_text=page_text or "(No text extracted for this page)",
        )

        history = _tutor_sessions[session_id]
        history.append({"role": "user", "content": user_text})
        self._trim(history)

        messages = [{"role": "system", "content": system_content}] + history

        try:
            completion = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                max_tokens=300,
                temperature=0.5,
            )
            response_text = completion.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"GPT-4o tutor error (session={session_id}): {e}")
            fallbacks = {
                "en": "I'm sorry, I'm having trouble responding right now. Please try again.",
                "hi": "मुझे खेद है, अभी जवाब देने में परेशानी हो रही है। कृपया पुनः प्रयास करें।",
                "mr": "मला माफ करा, आत्ता उत्तर देण्यात अडचण येत आहे. कृपया पुन्हा प्रयत्न करा.",
            }
            response_text = fallbacks.get(lang, fallbacks["en"])

        should_scroll = response_text.startswith("[SCROLL_DOWN]")
        clean_text = response_text.replace("[SCROLL_DOWN]", "").strip()

        history.append({"role": "assistant", "content": clean_text})
        self._trim(history)

        return {"response": clean_text, "should_scroll_down": should_scroll}

    def clear_session(self, session_id: str) -> None:
        _tutor_sessions.pop(session_id, None)

    def new_session_id(self) -> str:
        return str(uuid.uuid4())

    @staticmethod
    def _trim(history: list) -> None:
        limit = _MAX_HISTORY * 2
        if len(history) > limit:
            del history[: len(history) - limit]
