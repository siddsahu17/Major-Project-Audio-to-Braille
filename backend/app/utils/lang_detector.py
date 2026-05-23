import re

def detect_devanagari_language(text: str) -> str:
    """
    Detects if the text is English, Hindi, or Marathi.
    Uses Devanagari character ranges, high-frequency keywords, and grammatical heuristics.
    """
    if not text:
        return "en"
        
    # Check if text contains Devanagari characters (Unicode range U+0900 to U+097F)
    has_devanagari = any(0x0900 <= ord(c) <= 0x097F for c in text)
    if not has_devanagari:
        return "en"
        
    # Check for Marathi-only character 'ळ'
    if "ळ" in text:
        return "mr"
        
    # Marathi high-frequency words/endings
    marathi_keywords = [
        "आहे", "आहेत", "नाही", "माहिती", "पाहिजे", "मला", "तुला", "आपण", "धडा", "विषयी", "बद्दल", 
        "करा", "केले", "होते", "होती", "होता", "वर", "खाली", "साठी", "मी", "आम्ही", "तुम्ही", 
        "हा", "ही", "हे", "या", "माझे", "तुझे", "त्यांना", "त्याच्या", "तिच्या", "पाचवीच्या", 
        "जलचक्र", "प्रकरण", "अभ्यास"
    ]
    
    # Hindi high-frequency words/endings
    hindi_keywords = [
        "है", "हैं", "नहीं", "जानकारी", "चाहिए", "मुझे", "तुम्हें", "हम", "पाठ", "बारे", "लिए", 
        "करो", "किया", "था", "थी", "थे", "पर", "नीचे", "मैं", "हम", "तुम", 
        "यह", "वह", "ये", "वे", "मेरा", "तेरा", "उन्हें", "उसका", "उसकी", "पांच", "पाँच", "पांचवे",
        "जल", "चक्र", "अध्याय"
    ]
    
    text_lower = text.lower()
    
    # Count keyword matches using boundary checks or simple occurrence
    marathi_count = sum(1 for word in marathi_keywords if word in text_lower)
    hindi_count = sum(1 for word in hindi_keywords if word in text_lower)
    
    if marathi_count > hindi_count:
        return "mr"
    elif hindi_count > marathi_count:
        return "hi"
        
    # Grammatical heuristics:
    # If the text has words ending in "या" or "च्या" (extremely common Marathi genitives/case markers), it's Marathi
    if re.search(r"[\u0900-\u097F]च्या\b", text) or re.search(r"[\u0900-\u097F]ला\b", text):
        return "mr"
        
    # Hindi genitive case markers "के", "की", "का" are super common in Hindi but not Marathi (where it's च्या / चा / ची / चे)
    hindi_markers = ["के", "की", "का", "को", "में", "से"]
    hindi_marker_count = sum(1 for marker in hindi_markers if re.search(rf"\b{marker}\b", text))
    if hindi_marker_count > 0:
        return "hi"
        
    return "hi"
