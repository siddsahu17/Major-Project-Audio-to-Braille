
import json

import sys
import os

# Add parent directory to path to import backend modules if needed
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.LLM.providers.base import LLMProvider

# Agent 6: Q&A / Exam Prep
def generate_qa(transcript: str, context: dict, llm_provider: LLMProvider = None) -> dict:
    """
    Generates Q&A pairs for exam preparation.
    """
    print(f"[QAAgent] Generating Q&A...")
    
    if not llm_provider:
        return {"questions": [], "error": "No LLM Provider provided"}

    topic = context.get("topic", "General")
    
    prompt = f"""
    Generate 5 important exam-style questions and answers based on the transcript about "{topic}".
    Return ONLY a JSON object with a key "questions" containing a list of objects, each with "question" and "answer" keys.
    
    Transcript (truncated):
    {transcript[:15000]}
    """
    
    try:
        content = llm_provider.generate(
            prompt=prompt,
            system_message="You are a teacher creating an exam. Output valid JSON only.",
            temperature=0.5
        )

        if content.startswith("```json"):
            content = content.replace("```json", "").replace("```", "")
        if content.startswith("```"):
            content = content.replace("```", "")
            
        return json.loads(content)
    except Exception as e:
        print(f"[QAAgent] Error: {e}")
        return {"questions": [], "error": str(e)}

