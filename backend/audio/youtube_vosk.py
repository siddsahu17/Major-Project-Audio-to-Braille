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
MODEL_BASE_DIR = os.path.join(AUDIO_DIR, "model")

POSSIBLE_MODEL_DIRS = [
    MODEL_BASE_DIR,
    os.path.join(AUDIO_DIR, "models"),
    os.path.join(AUDIO_DIR, "..", "modules", "model"),
    os.path.join(AUDIO_DIR, "..", "model"),
]

VOSK_MODEL_URL = "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip"

def download_vosk_model():
    """Downloads and extracts the Vosk model to the model directory."""
    print(f"Downloading Vosk model from {VOSK_MODEL_URL}...")
    if not os.path.exists(MODEL_BASE_DIR):
        os.makedirs(MODEL_BASE_DIR)
        
    try:
        response = requests.get(VOSK_MODEL_URL)
        response.raise_for_status()
        
        zip_path = os.path.join(MODEL_BASE_DIR, "model.zip")
        with open(zip_path, "wb") as f:
            f.write(response.content)
            
        print("Extracting model...")
        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            zip_ref.extractall(MODEL_BASE_DIR)
            
        os.remove(zip_path)
        print("Model downloaded and extracted successfully.")
        return MODEL_BASE_DIR
    except Exception as e:
        raise RuntimeError(f"Failed to download Vosk model: {e}")

def transcribe_with_vosk(youtube_url: str):
    try:
        # Step 1: Check Model
        model_dir = None
        for d in POSSIBLE_MODEL_DIRS:
            if os.path.exists(d) and os.listdir(d):
                # Check if it has actual model files (conf/model.conf etc) directly or in subdir
                model_dir = d
                break
        
        if not model_dir:
             print("Vosk model not found. Attempting to download...")
             download_vosk_model()
             model_dir = MODEL_BASE_DIR # Use the one we just created
        
        # Step 2: Stream Audio
        audio_io = stream_youtube_audio(youtube_url)
        
        print(f"Loading Vosk model from: {model_dir}")
        model_path = model_dir
        subdirs = [d for d in os.listdir(model_dir) if os.path.isdir(os.path.join(model_dir, d))]
        if subdirs:
            # Usually extracting zip creates a folder like 'vosk-model-small-en-us-0.15'
             model_path = os.path.join(model_dir, subdirs[0])
             
        model = Model(model_path)
        
        # Step 3: Open Audio from BytesIO
        wf = wave.open(audio_io, "rb")
        
        rec = KaldiRecognizer(model, wf.getframerate())
        
        print(f"Transcribing with Vosk (In-Memory)...")
        
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
        error_msg = f"Error in Vosk module: {e}"
        print(error_msg)
        return error_msg
