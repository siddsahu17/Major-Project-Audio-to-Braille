import httpx
import base64
from app.config.settings import settings

SARVAM_BASE_URL = "https://api.sarvam.ai"


def _get_api_key() -> str:
    return settings.SARVAM_API_KEY.strip()

LANGUAGE_CODE_MAP = {
    "hi": "hi-IN",
    "mr": "mr-IN"
}

async def sarvam_transcribe(audio_file_bytes: bytes, 
                             language: str) -> str:
    """
    Transcribe Hindi or Marathi audio using Sarvam saarika:v2.5 model.
    language: "hi" or "mr"
    Returns transcribed text string.
    """
    language_code = LANGUAGE_CODE_MAP.get(language, "hi-IN")
    
    api_key = _get_api_key()
    if not api_key:
        raise RuntimeError("SARVAM_API_KEY is not set in .env")

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{SARVAM_BASE_URL}/speech-to-text",
            headers={
                "api-subscription-key": api_key
            },
            files={
                "file": ("audio.wav", audio_file_bytes, "audio/wav")
            },
            data={
                "language_code": language_code,
                "model": "saarika:v2.5",
                "with_timestamps": False
            }
        )
        
        if response.status_code != 200:
            raise Exception(
                f"Sarvam STT error {response.status_code}: "
                f"{response.text}"
            )
        
        return response.json()["transcript"]


async def sarvam_tts(text: str, language: str) -> bytes:
    """
    Convert text to speech using Sarvam bulbul:v2 model.
    language: "hi" or "mr"
    Returns raw audio bytes (wav).
    """
    language_code = LANGUAGE_CODE_MAP.get(language, "hi-IN")
    
    api_key = _get_api_key()
    if not api_key:
        raise RuntimeError("SARVAM_API_KEY is not set in .env")

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{SARVAM_BASE_URL}/text-to-speech",
            headers={
                "api-subscription-key": api_key,
                "Content-Type": "application/json"
            },
            json={
                "inputs": [text],
                "target_language_code": language_code,
                "model": "bulbul:v2",
                "enable_preprocessing": True
            }
        )
        
        if response.status_code != 200:
            raise Exception(
                f"Sarvam TTS error {response.status_code}: "
                f"{response.text}"
            )
        
        audio_base64 = response.json()["audios"][0]
        return base64.b64decode(audio_base64)
