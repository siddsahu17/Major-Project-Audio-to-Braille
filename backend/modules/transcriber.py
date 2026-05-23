import speech_recognition as sr
import os
from pydub import AudioSegment

# Initialize recognizer
recognizer = sr.Recognizer()

# Ensure FFmpeg is in PATH (if needed for pydub to find it, though usually it checks system PATH)
# Pydub relies on PATH or explicit configuration. Assuming the main app sets up environment or system has it.
# We can re-assert the path here if needed, but usually better in central config or assumed from env.
# For robustness based on previous file, let's keep the path addition if it was critical.
if r"C:\ffmpeg\ffmpeg-8.0-full_build\bin" not in os.environ["PATH"]:
     os.environ["PATH"] += os.pathsep + r"C:\ffmpeg\ffmpeg-8.0-full_build\bin"

def convert_to_wav(input_path):
    """Convert any uploaded audio file to WAV format for SpeechRecognition."""
    try:
        sound = AudioSegment.from_file(input_path)  
    except Exception as e:
        raise RuntimeError(f"Could not decode audio file: {e}")

    wav_path = os.path.splitext(input_path)[0] + ".wav"
    sound.export(wav_path, format="wav")
    return wav_path

def recognize_speech_from_file(audio_file_path):
    """Recognize speech from audio file"""
    try:
        wav_path = convert_to_wav(audio_file_path)  # ensure WAV
        with sr.AudioFile(wav_path) as source:
            audio = recognizer.record(source)
        
        text = recognizer.recognize_google(audio, language="en-IN")
        return text
    except sr.UnknownValueError:
        return "❌ Could not understand the audio."
    except sr.RequestError as e:
        return f"⚠️ Recognition error: {e}"
    except Exception as e:
        return f"⚠️ Error: {e}"
