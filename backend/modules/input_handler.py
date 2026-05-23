import streamlit as st
import tempfile
import os
from streamlit_mic_recorder import mic_recorder

def get_uploaded_audio():
    """Renders file uploader and returns path to saved temp file."""
    st.subheader("🔼 Upload Audio File")
    uploaded_file = st.file_uploader("Upload an audio file", type=["wav", "mp3"])
    
    if uploaded_file is not None:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp_file:
            tmp_file.write(uploaded_file.read())
            return tmp_file.name
    return None

def get_recorded_audio():
    """Renders mic recorder and returns path to saved temp file."""
    st.subheader("🎤 Record from Microphone")
    audio = mic_recorder(start_prompt="🎙️ Start Recording", stop_prompt="🛑 Stop Recording", key="recorder")
    
    if audio:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp_file:
            tmp_file.write(audio["bytes"])
            return tmp_file.name
    return None
