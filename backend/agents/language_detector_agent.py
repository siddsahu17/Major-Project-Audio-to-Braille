import os
import subprocess
import json


# Agent 1: Language Detection
# derived from video metadata to avoid potentially long audio downloads just for detection

def get_video_metadata(youtube_url: str):
    """Fetches video title and description using yt-dlp."""
    cmd = [
        sys.executable,
        "-m", "yt_dlp",
        "--dump-json",
        "--skip-download",
        "--no-warnings",
        "--no-playlist",
        youtube_url
    ]
    try:
        output = subprocess.check_output(cmd).decode("utf-8")
        data = json.loads(output)
        return {
            "title": data.get("title", ""),
            "description": data.get("description", "")[:500] # Limit description length
        }
    except Exception as e:
        print(f"Error fetching metadata: {e}")
        return {"title": "", "description": ""}

import sys
import os

# Add parent directory to path to import backend modules if needed
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.LLM.providers.base import LLMProvider

def detect_language(youtube_url: str, llm_provider: LLMProvider = None) -> dict:
    """
    Detects the primary language of the YouTube video.
    Returns: {"language": "en" | "hi" | "mr", "confidence": float}
    """
    print(f"[LanguageDetector] Analyzing: {youtube_url}")
    
    metadata = get_video_metadata(youtube_url)
    text_sample = f"Title: {metadata['title']}\nDescription: {metadata['description']}"
    
    if not text_sample.strip():
         return {"language": "en", "confidence": 0.0} # Fallback

    if not llm_provider:
        print("[LanguageDetector] Warning: No LLM provider passed. Defaulting to 'en'.")
        return {"language": "en", "confidence": 0.0}
    
    prompt = f"""
    Analyze the following YouTube video metadata and detect the primary spoken language.
    Return ONLY a JSON object with keys: "language" (one of: 'en', 'hi', 'mr', 'other') and "confidence" (0.0 to 1.0).
    Default to 'en' if unsure.
    
    Metadata:
    {text_sample}
    """
    
    try:
        content = llm_provider.generate(
            prompt=prompt,
            system_message="You are a language detection system. Output valid JSON only.",
            temperature=0.0
        )
        
        # Handle code blocks if present
        if content.startswith("```json"):
            content = content.replace("```json", "").replace("```", "")
        if content.startswith("```"): # Handle generic code block
            content = content.replace("```", "")
            
        result = json.loads(content)
        return result
    except Exception as e:
        print(f"[LanguageDetector] Error: {e}")
        return {"language": "en", "confidence": 0.0}

