import sys
import os

# Add parent directory to path to import backend modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

try:
    from backend.modules.braille_converter import text_to_braille
except ImportError:
    # Fallback if path issues occur
    def text_to_braille(text):
        return f"[Braille Conversion Error: Module not found]"

# Agent 7: Braille Conversion
def convert_to_braille(summary: str, notes: list, qa: list) -> dict:
    """
    Converts summary, notes, and Q&A to Braille.
    """
    print(f"[BrailleAgent] Converting content to Braille...")
    
    try:
        # Convert Summary
        braille_summary = text_to_braille(summary)
        
        # Convert Notes
        braille_notes = [text_to_braille(note) for note in notes]
        
        # Convert Q&A
        braille_qa = []
        for item in qa:
            braille_qa.append({
                "question": text_to_braille(item.get("question", "")),
                "answer": text_to_braille(item.get("answer", ""))
            })
            
        return {
            "braille_summary": braille_summary,
            "braille_notes": braille_notes,
            "braille_qa": braille_qa
        }
    except Exception as e:
        print(f"[BrailleAgent] Error: {e}")
        return {"error": str(e)}
