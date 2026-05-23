import whisper
import streamlit as st

@st.cache_resource
def load_whisper_model(model_name="base"):
    """Load Whisper model with caching."""
    return whisper.load_model(model_name)

def transcribe_with_whisper(model, audio_path):
    """Transcribe audio file using Whisper model."""
    result = model.transcribe(audio_path, language="en")
    return result["text"]
