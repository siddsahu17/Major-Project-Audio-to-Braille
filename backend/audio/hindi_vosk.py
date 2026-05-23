import os
import wave
import json
import io
import requests
import zipfile
from vosk import Model, KaldiRecognizer
from .youtube_audio_stream import stream_youtube_audio

# Define paths
AUDIO_DIR = os.path.dirname(__file__)
# Store Hindi models in a specific subdirectory or the main model dir?
# Let's use the main model dir but look for the specific hindi folder name
MODEL_BASE_DIR = os.path.join(AUDIO_DIR, "model")

POSSIBLE_MODEL_DIRS = [
    MODEL_BASE_DIR,
    os.path.join(AUDIO_DIR, "models"),
    os.path.join(AUDIO_DIR, "..", "modules", "model"),
    os.path.join(AUDIO_DIR, "..", "model"),
]

# Hindi Model URL
VOSK_MODEL_HI_URL = "https://alphacephei.com/vosk/models/vosk-model-small-hi-0.22.zip"
MODEL_FOLDER_NAME = "vosk-model-small-hi-0.22"

def download_hindi_vosk_model():
    """Downloads and extracts the Hindi Vosk model to the model directory."""
    print(f"Downloading Hindi Vosk model from {VOSK_MODEL_HI_URL}...")
    if not os.path.exists(MODEL_BASE_DIR):
        os.makedirs(MODEL_BASE_DIR)
        
    try:
        response = requests.get(VOSK_MODEL_HI_URL)
        response.raise_for_status()
        
        zip_path = os.path.join(MODEL_BASE_DIR, "model_hi.zip")
        with open(zip_path, "wb") as f:
            f.write(response.content)
            
        print("Extracting Hindi model...")
        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            zip_ref.extractall(MODEL_BASE_DIR)
            
        os.remove(zip_path)
        print("Hindi Model downloaded and extracted successfully.")
        return os.path.join(MODEL_BASE_DIR, MODEL_FOLDER_NAME)
    except Exception as e:
        raise RuntimeError(f"Failed to download Hindi Vosk model: {e}")

def transcribe_with_hindi_vosk(youtube_url: str):
    try:
        # Step 1: Check Model
        model_path = None
        
        # Check standard locations for the specific hindi model folder
        for d in POSSIBLE_MODEL_DIRS:
            if os.path.exists(d):
                # Check if 'vosk-model-small-hi-0.22' exists in 'd'
                candidate = os.path.join(d, MODEL_FOLDER_NAME)
                if os.path.exists(candidate):
                    model_path = candidate
                    break
                # Also check if 'd' IS the model folder (unlikely if shared with English, but possible)
                if MODEL_FOLDER_NAME in os.path.basename(d):
                    model_path = d
                    break

        if not model_path:
             print("Hindi Vosk model not found. Attempting to download...")
             download_hindi_vosk_model()
             model_path = os.path.join(MODEL_BASE_DIR, MODEL_FOLDER_NAME)
        
        print(f"Loading Hindi Vosk model from: {model_path}")
        model = Model(model_path)
        
        # Step 2: Stream Audio
        audio_io = stream_youtube_audio(youtube_url)
        
        # Step 3: Open Audio from BytesIO
        wf = wave.open(audio_io, "rb")
        
        rec = KaldiRecognizer(model, wf.getframerate())
        
        print(f"Transcribing Hindi with Vosk (In-Memory)...")
        
        results = []
        while True:
            data = wf.readframes(4000)
            if len(data) == 0:
                break
            if rec.AcceptWaveform(data):
                part = json.loads(rec.Result())
                results.append(part.get("text", ""))
        
        final_part = json.loads(rec.FinalResult())
        results.append(final_part.get("text", ""))
        
        full_text = " ".join([r for r in results if r])
        return full_text

    except Exception as e:
        error_msg = f"Error in Hindi Vosk module: {e}"
        print(error_msg)
        return error_msg
