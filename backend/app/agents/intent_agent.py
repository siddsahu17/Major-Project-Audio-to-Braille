import json
import logging
from typing import Optional, Dict, Any
from openai import AsyncOpenAI

logger = logging.getLogger("sparshvaani.intent_agent")

class IntentAgent:
    def __init__(self, openai_api_key: str) -> None:
        self.client = AsyncOpenAI(api_key=openai_api_key)

    async def detect_intent(self, user_text: str, detected_language: str = "en") -> Dict[str, Any]:
        """
        Detect student intent and extract class number (3-10) and textbook topic.
        Support English, Hindi, and Marathi inputs by utilizing the detected language context.
        """
        system_prompt = f"""You are an intent detection agent for a voice-first educational app
for visually impaired students. Extract the class number and topic
from the student's voice input.
The student is speaking in language context: {detected_language} (either 'en', 'hi', or 'mr').

Analyze the transcribed text carefully. For Hindi ('hi') and Marathi ('mr'), pay close attention to Devanagari words for class numbers:
- Class 10: "दसवीं", "दहावी", "दाहावी", "10"
- Class 9: "नौवीं", "नववी", "नऊवी", "9"
- Class 8: "आठवीं", "आठवी", "8"
- Class 7: "सातवीं", "सातवी", "7"
- Class 6: "छठी", "सहावी", "6"
- Class 5: "पांचवीं", "पाचवी", "5"
- Class 4: "चौथी", "च चौथी", "4"
- Class 3: "तीसरी", "तिसरी", "3"

Return ONLY a valid JSON object with these fields:
- intent: 'load_chapter' if student wants to study a specific topic, chapter, or load textbook content.
          'ask_question' if student is asking about currently open content, explaining pages, or general learning questions.
          'navigate' if student wants to scroll, move to next/prev page, or go to a page number.
          'other' for anything else (greetings, off-topic chat).
- class_number: integer 3-10 if mentioned or implied (e.g. "दसवीं" -> 10), null if not mentioned.
- topic: the topic or chapter name in English (translate Hindi/Marathi topic terms to English, e.g. "प्रजनन" -> "reproduction", "प्रकाश संश्लेषण" -> "photosynthesis"), null if not clear.
- raw_query: the original input unchanged.

Examples:
Input: 'Class 10 mein reproduction chahiye'
Output: {{"intent": "load_chapter", "class_number": 10, "topic": "reproduction", "raw_query": "Class 10 mein reproduction chahiye"}}

Input: 'photosynthesis explain karo'
Output: {{"intent": "load_chapter", "class_number": null, "topic": "photosynthesis", "raw_query": "photosynthesis explain karo"}}

Input: 'अगला पेज'
Output: {{"intent": "navigate", "class_number": null, "topic": null, "raw_query": "अगला पेज"}}

Input: 'ye page aur explain karo'
Output: {{"intent": "ask_question", "class_number": null, "topic": null, "raw_query": "ye page aur explain karo"}}
"""

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_text}
                ],
                response_format={"type": "json_object"},
                temperature=0.0,
            )
            content = response.choices[0].message.content or "{}"
            result = json.loads(content)
            
            intent = result.get("intent", "other")
            class_num = result.get("class_number")
            topic = result.get("topic")
            
            # Normalize class_number
            if class_num is not None:
                try:
                    class_num = int(class_num)
                    if not (3 <= class_num <= 10):
                        class_num = None
                except (ValueError, TypeError):
                    class_num = None
                    
            logger.info(f"Intent detected: {intent} (class={class_num}, topic={topic}) for text='{user_text}'")
            return {
                "intent": intent,
                "class_number": class_num,
                "topic": topic,
                "raw_query": user_text
            }
        except Exception as e:
            logger.error(f"Intent detection failed for text='{user_text}': {e}")
            return {
                "intent": "other",
                "class_number": None,
                "topic": None,
                "raw_query": user_text
            }
