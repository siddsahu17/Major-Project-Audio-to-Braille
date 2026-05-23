

import sys
import os

# Add parent directory to path to import backend modules if needed
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.LLM.providers.base import LLMProvider

# Agent 4: Summary Generation
def generate_summary(transcript: str, context: dict, llm_provider: LLMProvider = None) -> dict:
    """
    Generates a concise summary based on the transcript and context.
    """
    print(f"[SummaryAgent] Generating summary...")
    
    if not llm_provider:
        return {"summary": "Error: No LLM Provider", "error": "No LLM Provider provided"}

    # Use context to guide the summary
    topic = context.get("topic", "General")
    intent = context.get("intent", "General")
    
    prompt = f"""
    Generate a comprehensive yet concise summary of the following educational video transcript.
    The video is about "{topic}" and appears to be a "{intent}".
    
    Transcript (truncated):
    {transcript[:15000]}
    """
    
    try:
        content = llm_provider.generate(
            prompt=prompt,
            system_message="You are an expert summarizer. Return a single string summary.",
            temperature=0.5
        )
        return {"summary": content}
    except Exception as e:
        print(f"[SummaryAgent] Error: {e}")
        return {"summary": "Error generating summary.", "error": str(e)}

