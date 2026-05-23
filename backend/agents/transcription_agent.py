import sys
import os

# Add parent directory to path to import backend modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

# Import existing modules
from backend.audio import youtube_speech, youtube_whisper
from backend.audio import hindi_speech, hindi_whisper
# from backend.audio import youtube_vosk, hindi_vosk
from backend.audio import marathi_speech, marathi_whisper

# Agent 2: Transcription
def transcribe_video(youtube_url: str, language: str) -> dict:
    """
    Transcribes the video using the best available engine for the detected language.
    Prioritizes Whisper for accuracy.
    """
    print(f"[TranscriptionAgent] Transcribing URL: {youtube_url} in Language: {language}")
    
    transcript = ""
    engine_used = ""
    
    try:
        if language == "en":
            # Default to Whisper for best quality
            transcript = youtube_whisper.transcribe_with_whisper(youtube_url)
            engine_used = "whisper_en"
            
        elif language == "hi":
            transcript = hindi_whisper.transcribe_with_hindi_whisper(youtube_url)
            engine_used = "whisper_hi"
            
        elif language == "mr":
            transcript = marathi_whisper.transcribe_with_marathi_whisper(youtube_url)
            engine_used = "whisper_mr"
            
        else:
            # Fallback to English Whisper
            print(f"[TranscriptionAgent] Language '{language}' not explicitly supported. Fallback to English.")
            transcript = youtube_whisper.transcribe_with_whisper(youtube_url)
            engine_used = "whisper_en_fallback"

        return {
            "transcript": transcript,
            "language": language,
            "engine": engine_used
        }

    except Exception as e:
        print(f"[TranscriptionAgent] Error: {e}")
        return {"transcript": "", "error": str(e)}
