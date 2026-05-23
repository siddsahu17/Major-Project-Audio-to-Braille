import sys
import os
from app.main import app  # Compatibility bridge for uvicorn main:app in Docker/HF


# Import transcription modules from audio package
# Note: Since they are in 'audio' dir and main.py is in 'backend', imports should be 'audio.youtube_...'
# provided 'audio' has an __init__.py or is treated as a package. 
# If 'audio' is not a package, I might need to act accordingly. 
# But 'audio' is a sibling of 'modules' and a subdir of 'backend'. main.py is in 'backend'.
# So 'from audio.youtube_...' should work if python sees 'audio' as a package/namespace.
# I will create an empty __init__.py in audio if it doesn't exist, just in case.

from audio import youtube_speech_recognition
from audio import youtube_whisper
# from audio import youtube_vosk
# pytranscript removed

def main():
    print("="*50)
    print("YouTube Audio Transcription System")
    print("="*50)
    
    # 1. Get YouTube URL
    youtube_url = input("Enter YouTube URL: ").strip()
    if not youtube_url:
        print("Error: URL cannot be empty.")
        return

    # 2. Select Engine
    print("\nSelect Transcription Engine:")
    print("1. SpeechRecognition (Google Web Speech)")
    print("2. Whisper (Offline)")
    # print("3. Vosk (Offline)")
    
    choice = input("Enter choice (1-3): ").strip()
    
    # Map choice to module
    # We call the specific function from the imported module
    
    print(f"\nProcessing...")
    
    try:
        if choice == "1":
            youtube_speech_recognition.transcribe_with_speech_recognition(youtube_url)
        elif choice == "2":
            youtube_whisper.transcribe_with_whisper(youtube_url)
        # elif choice == "3":
        #     youtube_vosk.transcribe_with_vosk(youtube_url)
        else:
            print("Invalid choice. Exiting.")
            return
            
        print("\nProcessing complete. Check 'backend/audio/' for output files.")
        
    except Exception as e:
        print(f"\nAn error occurred: {e}")

if __name__ == "__main__":
    main()
