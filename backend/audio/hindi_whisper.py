import os
import whisper
import numpy as np
import io
import soundfile as sf
from .youtube_audio_stream import stream_youtube_audio

# Define output file path
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "hindi_whisper_output.txt")

def transcribe_with_hindi_whisper(youtube_url: str):
    try:
        # Step 1: Stream Audio
        audio_io = stream_youtube_audio(youtube_url)
        
        print("Loading Whisper model (base)...")
        model = whisper.load_model("base")
        
        print(f"Transcribing Hindi with Whisper (In-Memory)...")
        
        # Step 3: Convert BytesIO wav to float32 numpy array
        audio_data, sample_rate = sf.read(audio_io)
        
        # Convert to float32
        audio_data = audio_data.astype(np.float32)
        
        # Transcribe with language='hi', force fp16=False for CPU
        result = model.transcribe(audio_data, language="hi", fp16=False)
        text = result["text"]
        
        # Step 4: Save Output
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            f.write(text)
            
        return text

    except Exception as e:
        error_msg = f"Error in Hindi Whisper module: {e}"
        print(error_msg)
        return error_msg
