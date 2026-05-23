import streamlit as st
import sys
import os
from pathlib import Path

# Add backend to sys.path to allow imports
# Structure:
# backend/
#   streamlit/app.py
#   audio/...
# So we need to add the parent dir (backend) to sys.path to import 'audio'
BACKEND_DIR = Path(__file__).parent.parent
sys.path.append(str(BACKEND_DIR))

try:
    from audio import youtube_speech
    from audio import youtube_whisper
    # from audio import youtube_vosk
    from audio import hindi_speech
    from audio import hindi_whisper
    # from audio import hindi_vosk
    from audio import marathi_speech
    from audio import marathi_whisper
    # Vosk has no Marathi model
    # from audio import youtube_audio_stream
except ImportError as e:
    st.error(f"Failed to import backend modules. Ensure directory structure is correct. Error: {e}")
    st.stop()

st.set_page_config(page_title="Vachak: YouTube Transcriber", layout="wide")

st.title("VIDEO TO AUDIO")
st.markdown("Enter a YouTube URL to transcribe it using multiple engines.")

# Language Selection
language = st.radio("Select Language", ["English", "Hindi", "Marathi"], horizontal=True)

youtube_url = st.text_input("YouTube URL", placeholder="https://www.youtube.com/watch?v=...")

if st.button("Transcribe All"):
    if not youtube_url:
        st.warning("Please enter a URL.")
    else:
        st.info("Processing... This may take a while depending on video length and hardware.")
        
        # Create tabs for results
        # tab1, tab2, tab3 = st.tabs(["SpeechRecognition (Google)", "Whisper (Offline)", "Vosk (Offline)"])
        tab1, tab2 = st.tabs(["SpeechRecognition (Google)", "Whisper (Offline)"])
        
        # We run them sequentially for now to avoid threading complexity with shared resources, 
        # though parallel execution is possible.
        
        # 1. Google
        with tab1:
            st.subheader(f"SpeechRecognition ({language})")
            with st.spinner(f"Transcribing {language} with Google..."):
                try:
                    if language == "English":
                        text_google = youtube_speech.transcribe_with_speech_recognition(youtube_url)
                    elif language == "Hindi":
                        text_google = hindi_speech.transcribe_with_hindi_speech_recognition(youtube_url)
                    else: # Marathi
                        text_google = marathi_speech.transcribe_with_marathi_speech_recognition(youtube_url)
                    st.text_area("Result", text_google, height=300)
                    st.success("Done!")
                except Exception as e:
                    st.error(f"Error: {e}")

        # 2. Whisper
        with tab2:
            st.subheader(f"OpenAI Whisper ({language})")
            with st.spinner(f"Transcribing {language} with Whisper..."):
                try:
                    if language == "English":
                        text_whisper = youtube_whisper.transcribe_with_whisper(youtube_url)
                    elif language == "Hindi":
                        text_whisper = hindi_whisper.transcribe_with_hindi_whisper(youtube_url)
                    else: # Marathi
                        text_whisper = marathi_whisper.transcribe_with_marathi_whisper(youtube_url)
                    st.text_area("Result", text_whisper, height=300)
                    st.success("Done!")
                except Exception as e:
                    st.error(f"Error: {e}")

        # 3. Vosk
        # with tab3:
        #     st.subheader(f"Vosk ({language})")
        #     with st.spinner(f"Transcribing {language} with Vosk..."):
        #         try:
        #             if language == "English":
        #                 text_vosk = youtube_vosk.transcribe_with_vosk(youtube_url)
        #             elif language == "Hindi":
        #                 text_vosk = hindi_vosk.transcribe_with_hindi_vosk(youtube_url)
        #             else:
        #                 st.warning("Vosk transcription is not available for Marathi (no official model).")
        #                 st.stop()
        #             
        #             st.text_area("Result", text_vosk, height=300)
        #             st.success("Done!")
        #         except Exception as e:
        #             st.error(f"Error: {e}")
        #             st.info("Ensure the Vosk model is present (it should auto-download).")

st.sidebar.markdown("### Instructions")
st.sidebar.info(
    """
    1. Paste a YouTube Link.
    2. Click 'Transcribe All'.
    3. View results in tabs.
    
    **Note:** 
    - Google API requires internet.
    - Whisper runs locally (offline).
    # - Vosk requires a downloaded model in `backend/modules/model`.
    """
)
