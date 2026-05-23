import os
import speech_recognition as sr
from .youtube_audio_stream import stream_youtube_audio

def transcribe_with_hindi_speech_recognition(youtube_url: str):
    try:
        # Step 1: Stream Audio (BytesIO)
        audio_io = stream_youtube_audio(youtube_url)
        
        # Step 2: Initialize Recognizer
        recognizer = sr.Recognizer()
        
        print(f"Transcribing Hindi with SpeechRecognition (In-Memory)...")
        
        # Step 3: Transcribe from BytesIO
        with sr.AudioFile(audio_io) as source:
            audio_data = recognizer.record(source)
            try:
                # Specify language='hi-IN' for Hindi
                text = recognizer.recognize_google(audio_data, language="hi-IN")
            except sr.UnknownValueError:
                text = "[Error: Speech was unintelligible]"
            except sr.RequestError as e:
                text = f"[Error: Request failed; {e}]"
        
        return text

    except Exception as e:
        error_msg = f"Error in Hindi SpeechRecognition module: {e}"
        print(error_msg)
        return error_msg
