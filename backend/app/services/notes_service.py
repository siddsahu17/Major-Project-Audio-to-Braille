"""
Notes Service
Generates structured study notes from a lecture transcript using GPT-4o.
Returns: summary, key_points[], detailed_notes
"""

from __future__ import annotations

import json
import logging

from openai import AsyncOpenAI

logger = logging.getLogger("sparshvaani.notes")

_SYSTEM_PROMPTS: dict[str, str] = {
    "en": (
        "You are an educational assistant. Given a lecture transcript, produce "
        "structured study notes as valid JSON with exactly these keys: "
        "\"summary\" (2-3 sentence overview), "
        "\"key_points\" (list of 5-8 concise bullet strings), "
        "\"detailed_notes\" (comprehensive paragraph for review). "
        "Respond ONLY with the JSON object, no markdown fences, no extra text."
    ),
    "hi": (
        "आप एक शैक्षिक सहायक हैं। दिए गए लेक्चर ट्रांसक्रिप्ट से structured अध्ययन नोट्स बनाएं। "
        "केवल valid JSON object के रूप में उत्तर दें जिसमें ये keys हों: "
        "\"summary\" (2-3 वाक्यों का अवलोकन), "
        "\"key_points\" (5-8 संक्षिप्त बुलेट स्ट्रिंग्स की सूची), "
        "\"detailed_notes\" (समीक्षा के लिए व्यापक पैराग्राफ)। "
        "केवल JSON object दें, कोई markdown fences या अतिरिक्त टेक्स्ट नहीं।"
    ),
    "mr": (
        "तुम्ही एक शैक्षणिक सहाय्यक आहात. दिलेल्या लेक्चर ट्रान्सक्रिप्टमधून structured अभ्यास नोट्स तयार करा. "
        "फक्त valid JSON object म्हणून उत्तर द्या ज्यात या keys असतील: "
        "\"summary\" (2-3 वाक्यांचा आढावा), "
        "\"key_points\" (5-8 संक्षिप्त bullet strings ची यादी), "
        "\"detailed_notes\" (आढाव्यासाठी सर्वसमावेशक परिच्छेद). "
        "फक्त JSON object द्या, कोणतेही markdown fences किंवा अतिरिक्त मजकूर नको."
    ),
}


class NotesService:
    def __init__(self, openai_api_key: str) -> None:
        self.client = AsyncOpenAI(api_key=openai_api_key)

    async def generate_notes(self, transcript: str, language: str = "en") -> dict:
        lang = language if language in _SYSTEM_PROMPTS else "en"
        system_prompt = _SYSTEM_PROMPTS[lang]

        try:
            completion = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Transcript:\n\n{transcript}"},
                ],
                max_tokens=1000,
                temperature=0.3,
            )
            raw = completion.choices[0].message.content.strip()
            return json.loads(raw)
        except json.JSONDecodeError:
            logger.warning("GPT-4o returned non-JSON for notes; wrapping as summary.")
            return {
                "summary": raw,
                "key_points": [],
                "detailed_notes": "",
            }
        except Exception as e:
            logger.error(f"Notes generation error: {e}")
            raise RuntimeError(f"Failed to generate notes: {e}") from e
