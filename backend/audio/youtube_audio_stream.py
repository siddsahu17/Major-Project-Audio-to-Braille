import os
import subprocess
import io
import shutil
from pathlib import Path

# Add FFmpeg to PATH if likely missing
FFMPEG_PATH = r"C:\ffmpeg\ffmpeg-8.0-full_build\bin"
if os.path.exists(FFMPEG_PATH) and FFMPEG_PATH not in os.environ["PATH"]:
    os.environ["PATH"] += os.pathsep + FFMPEG_PATH

def stream_youtube_audio(youtube_url: str) -> io.BytesIO:
    """
     streams audio from YouTube via yt-dlp (get-url) and converts it to WAV (16kHz, mono) in-memory using ffmpeg.
     Returns a BytesIO object containing the WAV data.
    """
    print(f"Streaming audio from: {youtube_url}")
    
    # Check if ffmpeg is available
    if not shutil.which("ffmpeg"):
         raise RuntimeError("ffmpeg not found in PATH")

    # 1. Get Direct URL using yt-dlp
    # -f bestaudio : Best audio
    # --get-url : Output only the URL
    import sys
    cmd_yt_url = [
        sys.executable,
        "-m", "yt_dlp",
        "-f", "bestaudio/best",
        "--get-url",
        "--quiet",
        "--no-warnings",
        "--no-playlist",
        youtube_url
    ]

    try:
        # Get the URL
        direct_url = subprocess.check_output(cmd_yt_url).decode("utf-8").strip()
        if not direct_url:
            raise RuntimeError("yt-dlp failed to extract a valid URL")

        print(f"Direct Audio URL extracted. Streaming to memory...")

        # 2. ffmpeg command to read from URL and write wav to stdout
        # -i <url> : Read from URL
        # -f wav : Format wav
        # -ar 16000 : 16kHz
        # -ac 1 : Mono
        # pipe:1 : Write to stdout
        cmd_ffmpeg = [
            "ffmpeg",
            "-i", direct_url, 
            "-f", "wav",
            "-ar", "16000",
            "-ac", "1",
            "-v", "error", # quiet logs
            "pipe:1"
        ]
        
        # Popen ffmpeg
        p_ffmpeg = subprocess.Popen(
            cmd_ffmpeg, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE
        )
        
        # Get output
        wav_data, stderr_ffmpeg = p_ffmpeg.communicate()
        
        if p_ffmpeg.returncode != 0:
            raise RuntimeError(f"FFmpeg failed: {stderr_ffmpeg.decode('utf-8', errors='ignore')}")
            
        return io.BytesIO(wav_data)

    except subprocess.CalledProcessError as e:
         raise RuntimeError(f"yt-dlp failed to get URL: {e}")
    except Exception as e:
        raise RuntimeError(f"Streaming failed: {e}")
