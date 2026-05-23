import json


import sys
import os

# Add parent directory to path to import backend modules if needed
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.LLM.providers.base import LLMProvider

# Agent 3: Context Understanding
def analyze_context(transcript: str, llm_provider: LLMProvider = None) -> dict:
    """
    Analyzes the transcript to extract topic, subtopics, key concepts, and intent.
    """
    print(f"[ContextAgent] Analyzing context...")
    
    if not llm_provider:
        return {"error": "No LLM provider provided."}
    
    if not transcript or len(transcript) < 50:
        return {"topic": "Unknown", "subtopics": [], "key_points": [], "intent": "Unknown"}

    prompt = f"""
    Analyze the following educational video transcript and extract structured context.
    Return ONLY a JSON object with the following keys:
    - "topic": String (Main topic)
    - "subtopics": List of Strings
    - "key_points": List of Strings (Core concepts taught)
    - "intent": String (e.g., "Lecture", "Tutorial", "Vlog", "News")

    Transcript (first 15000 chars):
    {transcript[:15000]}
    """
    
    try:
        content = llm_provider.generate(
            prompt=prompt,
            system_message="You are an educational AI assistant. Output valid JSON only.",
            temperature=0.3
        )

        if content.startswith("```json"):
            content = content.replace("```json", "").replace("```", "")
        if content.startswith("```"):
            content = content.replace("```", "")
            
        return json.loads(content)
    except Exception as e:
        print(f"[ContextAgent] Error: {e}")
        return {"error": str(e)}

