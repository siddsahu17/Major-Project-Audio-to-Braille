import streamlit as st
import os
import numpy as np
import soundfile as sf
from modules.input_handler import get_uploaded_audio, get_recorded_audio
from modules.transcriber import recognize_speech_from_file
from modules.braille_converter import text_to_braille
from modules.whisper_engine import load_whisper_model
from modules.live_processor import render_live_recorder, get_audio_from_queue

# Page Config
st.set_page_config(page_title="Audio to Braille Converter", layout="centered")
st.title("🎙️ Vachak - Audio to Braille & Text")
st.write("Convert Audio, Speech, and Live Voice to Text & Braille")

# Tabs for different modes
tab1, tab2, tab3 = st.tabs(["📂 File Upload", "🎤 Microphone", "🔴 Live Stream"])

with tab1:
    st.header("Upload Audio")
    audio_path = get_uploaded_audio()
    if audio_path:
        st.success("File processing...")
        # Use Google Speech Recognition for file upload
        text = recognize_speech_from_file(audio_path)
        st.text_area("Recognized Text:", text, height=150)
        
        if text and not text.startswith(("❌", "⚠️")):
            braille = text_to_braille(text)
            st.text_area("Braille:", braille, height=150)
        
        # Cleanup
        try:
            os.remove(audio_path)
        except:
            pass

with tab2:
    st.header("Record Speech")
    audio_path = get_recorded_audio()
    if audio_path:
        st.success("Recording processing...")
        text = recognize_speech_from_file(audio_path)
        st.text_area("Recorded Text:", text, height=150)
        
        if text and not text.startswith(("❌", "⚠️")):
            braille = text_to_braille(text)
            st.text_area("Braille:", braille, height=150)
        
        try:
            os.remove(audio_path)
        except:
            pass

with tab3:
    st.header("Live Whisper Transcription")
    st.write("Real-time transcription using OpenAI Whisper.")
    
    # Render WebRTC 
    ctx = render_live_recorder()
    
    if ctx.state.playing:
        model = load_whisper_model("base")
        text_placeholder = st.empty()
        transcript = ""
        buffer = np.array([], dtype=np.float32)

        # Simplified loop for demo purposes - in production, this should be more robust
        # This will only update when the script reruns or via callback interaction loop which Streamlit handles uniquely.
        # Ideally, we process chunks in a background thread or a weird Streamlit loop.
        # For this refactor, we provide the UI. True real-time loop in main thread blocks UI in Streamlit.
        # User needs to click "Process Live" to grab buffer?
        # Actually `live.py` had a button "Start Live Transcription". Let's mimic that.
        
        if st.button("Start Processing Stream"):
            st.info("Listening... (Press Stop on recorder to end)")
            while ctx.state.playing:
                chunk = get_audio_from_queue()
                if chunk is not None:
                    buffer = np.concatenate([buffer, chunk])
                    
                    # Process every 5 seconds (approx 16k sample rate * 5)
                    # Note: Sample rate depends on WebRTC source, often 48k or 16k.
                    # Assuming 48k for WebRTC usually, but let's check buffer size.
                    if len(buffer) > 100000: 
                        sf.write("temp_live.wav", buffer, 16000)
                        result = model.transcribe("temp_live.wav")
                        transcript += " " + result["text"]
                        text_placeholder.text_area("Live Transcript:", transcript)
                        buffer = np.array([], dtype=np.float32)
