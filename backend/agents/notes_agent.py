
import json

import sys
import os

# Add parent directory to path to import backend modules if needed
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.LLM.providers.base import LLMProvider

# Agent 5: Study Notes
def generate_study_notes(transcript: str, context: dict, llm_provider: LLMProvider = None) -> dict:
    """
    Generates structured study notes.
    """
    print(f"[NotesAgent] Generating study notes...")
    
    if not llm_provider:
        return {"notes": [], "error": "No LLM Provider provided"}

    topic = context.get("topic", "General")
    
    prompt = f"""
    Create detailed, bullet-point study notes for the following video transcript about "{topic}".
    Focus on key definitions, processes, and important facts.
    Return ONLY a JSON object with a key "notes" containing a list of strings.
    
    Transcript (truncated):
    {transcript[:15000]}
    """
    
    try:
        content = llm_provider.generate(
            prompt=prompt,
            system_message="You are a study aid generator. Output valid JSON only.",
            temperature=0.5
        )

        if content.startswith("```json"):
            content = content.replace("```json", "").replace("```", "")
        if content.startswith("```"):
            content = content.replace("```", "")
            
        return json.loads(content)
    except Exception as e:
        print(f"[NotesAgent] Error: {e}")
        return {"notes": [], "error": str(e)}

