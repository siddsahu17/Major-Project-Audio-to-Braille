import logging
from fastapi import APIRouter, Response, HTTPException
from app.api.deps import get_tts_service

logger = logging.getLogger("sparshvaani.routes.onboarding")
router = APIRouter()

@router.get("/onboarding-audio")
async def get_onboarding_audio(language: str = "en"):
    """
    Returns synthesized welcome and navigation instruction audio for visually impaired students.
    Supports English ('en'), Hindi ('hi'), and Marathi ('mr').
    """
    messages = {
        "en": """Welcome to SparshVaani — your personal AI science tutor.
            I am here to help you learn NCERT Science from class 3 to class 10.
            Here is how to use me.
            Press and hold the spacebar to speak, then release to send.
            Tell me your class number and the topic you want to learn.
            For example, say: Class 10, reproduction.
            Or say: Explain photosynthesis from class 9.
            I will open the chapter and explain it to you step by step.
            You can ask me questions at any time.
            Say next page or scroll down to move forward.
            I speak English, Hindi, and Marathi — just talk to me in your language.
            Press spacebar now to get started.""",
            
        "hi": """SparshVaani में आपका स्वागत है — आपका व्यक्तिगत AI विज्ञान शिक्षक।
            मैं आपको कक्षा 3 से 10 तक NCERT विज्ञान सीखने में मदद करूंगा।
            बोलने के लिए spacebar दबाकर रखें, फिर छोड़ दें।
            मुझे अपनी कक्षा और विषय बताएं।
            उदाहरण के लिए कहें: कक्षा 10, प्रजनन।
            मैं chapter खोलकर आपको समझाऊंगा।
            अगले पेज के लिए कहें: अगला पेज।
            spacebar दबाकर शुरू करें।""",
            
        "mr": """SparshVaani मध्ये आपले स्वागत आहे — आपला वैयक्तिक AI विज्ञान शिक्षक।
            मी तुम्हाला इयत्ता 3 ते 10 पर्यंत NCERT विज्ञान शिकण्यास मदत करेन।
            बोलण्यासाठी spacebar दाबून ठेवा, नंतर सोडा।
            मला तुमचा वर्ग आणि विषय सांगा।
            उदाहरणार्थ म्हणा: इयत्ता 10, पुनरुत्पादन।
            मी chapter उघडून तुम्हाला समजावून सांगेन।
            पुढील पानासाठी म्हणा: पुढील पान।
            spacebar दाबून सुरू करा."""
    }
    
    lang = language.lower() if language.lower() in ("en", "hi", "mr") else "en"
    text = messages.get(lang, messages["en"])
    
    try:
        tts_service = get_tts_service()
        audio_chunks = []
        async for chunk in tts_service.stream_openai_tts(text, lang):
            audio_chunks.append(chunk)
        audio_bytes = b"".join(audio_chunks)
        
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={
                "Cache-Control": "public, max-age=86400",
                "Access-Control-Allow-Origin": "*",
            }
        )
    except Exception as e:
        logger.error(f"Failed to generate onboarding audio: {e}")
        raise HTTPException(status_code=500, detail=str(e))
