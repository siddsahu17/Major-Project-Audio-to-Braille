from streamlit_webrtc import webrtc_streamer, WebRtcMode, AudioProcessorBase
import av
import numpy as np
import queue
import streamlit as st

# Shared queue to push audio chunks
audio_queue = queue.Queue()

class AudioProcessor(AudioProcessorBase):
    def recv_audio(self, frame: av.AudioFrame) -> av.AudioFrame:
        # Convert audio frame to numpy
        audio = frame.to_ndarray()
        audio = audio.astype(np.float32) / 32768.0  # normalize to -1.0 to 1.0
        audio.flatten()
        
        # We put the raw float data into the queue
        # Note: In a real module we might want to manage queues per session or instance, 
        # but for this simple refactor using a module-level queue works for single-user local apps.
        audio_queue.put(audio.flatten())
        return frame

def render_live_recorder():
    """Renders the WebRTC streamer component."""
    return webrtc_streamer(
        key="live-speech",
        mode=WebRtcMode.SENDONLY,
        audio_receiver_size=256,
        rtc_configuration={"iceServers": [{"urls": ["stun:stun.l.google.com:19302"]}]},
        media_stream_constraints={"audio": True, "video": False},
        audio_processor_factory=AudioProcessor,
    )

def get_audio_from_queue():
    """Retrieve audio chunk from queue if available."""
    try:
        return audio_queue.get(timeout=1)
    except queue.Empty:
        return None
