import sys
import os

# Add parent directory to path to import backend modules if needed
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.LLM.providers.base import LLMProvider

# Agent 2.5: Text Abstraction
def abstract_text(transcript: str, llm_provider: LLMProvider = None) -> dict:
    """
    Cleans the raw transcript by removing filler words, pauses, and exclamations,
    and abstracts it into a clean, educational text format.
    """
    print(f"[AbstractionAgent] Abstracting and cleaning text...")
    
    if not llm_provider:
        return {"abstracted_text": transcript, "error": "No LLM Provider provided"}

    prompt = f"""
    You are an expert editor for educational content.
    Take the following raw video transcript and rewrite it into a clean, cohesive, and easily readable format.
    You must:
    1. Remove all conversational filler words (e.g., "um", "ah", "like", "you know").
    2. Remove false starts, stutters, and unnecessary exclamations.
    3. Correct grammar and punctuation without changing the original meaning.
    4. Group the text into logical paragraphs.
    
    Do NOT summarize the text. Keep all the original educational information intact, just make it read like a textbook or a clean article.

    Raw Transcript:
    {transcript}
    """
    
    try:
        content = llm_provider.generate(
            prompt=prompt,
            system_message="You are a meticulous text editor. Return only the cleaned text.",
            temperature=0.3
        )
        return {"abstracted_text": content}
    except Exception as e:
        print(f"[AbstractionAgent] Error: {e}")
        return {"abstracted_text": transcript, "error": str(e)}
