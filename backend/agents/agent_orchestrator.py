import sys
import os

# Add parent directory to path to import backend modules if needed
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.LLM.providers.openai_provider import OpenAIProvider
from backend.LLM.providers.ollama_provider import OllamaProvider

from .language_detector_agent import detect_language
from .transcription_agent import transcribe_video
from .context_agent import analyze_context
from .summary_agent import generate_summary
from .notes_agent import generate_study_notes
from .qa_agent import generate_qa
from .braille_agent import convert_to_braille
from .pdf_agent import generate_braille_pdf

# Orchestrator
def run_agent_workflow(youtube_url: str, provider_type: str = "openai", provider_model: str = None) -> dict:
    """
    Coordinators the execution of all agents.
    :param youtube_url: URL of the video.
    :param provider_type: 'openai' or 'ollama'.
    :param provider_model: Specific model name (optional).
    """
    results = {}
    print(f"--- Starting Multi-Agent Workflow for {youtube_url} using {provider_type} ---")
    
    # Initialize Provider
    llm_provider = None
    if provider_type.lower() == "openai":
        model = provider_model if provider_model else "gpt-4o"
        llm_provider = OpenAIProvider(model=model)
    elif provider_type.lower() == "ollama":
        model = provider_model if provider_model else "mistral"
        llm_provider = OllamaProvider(model=model)
    else:
        # Default fallback
        print(f"Unknown provider '{provider_type}', defaulting to OpenAI.")
        llm_provider = OpenAIProvider()
    
    results["provider"] = provider_type
    
    # 1. Language Detection
    lang_result = detect_language(youtube_url, llm_provider=llm_provider)
    results["language"] = lang_result.get("language", "en")
    print(f"STEP 1: Detected Language: {results['language']}")
    
    # 2. Transcription
    # Transcription is independent of LLM text generation provider for now (uses Whisper)
    trans_result = transcribe_video(youtube_url, results["language"])
    raw_transcript = trans_result.get("transcript", "")
    
    # 2.1 Enforce 30-min limit via truncation (approx 35,000 characters max)
    MAX_CHARS = 35000
    if len(raw_transcript) > MAX_CHARS:
        print(f"STEP 2.1: Transcript exceeds {MAX_CHARS} characters. Truncating to enforce 30-min limit.")
        raw_transcript = raw_transcript[:MAX_CHARS]
        results["truncated"] = True
    else:
        results["truncated"] = False
        
    results["transcript"] = raw_transcript
    print(f"STEP 2: Transcription Complete (Length: {len(results['transcript'])})")
    
    if not results["transcript"]:
        return {"error": "Transcription failed."}
        
    # 2.5 Text Abstraction
    from .abstraction_agent import abstract_text
    abstract_result = abstract_text(results["transcript"], llm_provider=llm_provider)
    results["abstracted_text"] = abstract_result.get("abstracted_text", results["transcript"])
    print(f"STEP 2.5: Text Abstraction Complete (Length: {len(results['abstracted_text'])})")
        
    # 3. Context Analysis
    context_result = analyze_context(results["abstracted_text"], llm_provider=llm_provider)
    results["context"] = context_result
    print(f"STEP 3: Context Analyzed: {context_result.get('topic', 'Unknown')}")
    
    # 4. Summary
    summary_result = generate_summary(results["abstracted_text"], results["context"], llm_provider=llm_provider)
    results["summary"] = summary_result.get("summary", "")
    print(f"STEP 4: Summary Generated")
    
    # 5. Study Notes
    notes_result = generate_study_notes(results["abstracted_text"], results["context"], llm_provider=llm_provider)
    results["notes"] = notes_result.get("notes", [])
    print(f"STEP 5: Notes Generated ({len(results['notes'])} items)")
    
    # 6. Q&A
    qa_result = generate_qa(results["abstracted_text"], results["context"], llm_provider=llm_provider)
    results["qa"] = qa_result.get("questions", [])
    print(f"STEP 6: Q&A Generated ({len(results['qa'])} items)")
    
    # 7. Braille Conversion
    braille_result = convert_to_braille(results["summary"], results["notes"], results["qa"])
    results["braille"] = braille_result
    print(f"STEP 7: Braille Conversion Complete")
    
    # 8. PDF Generation
    # We might want to name pdf distinctively if comparing
    output_filename = f"study_material_{provider_type}.pdf"
    pdf_path = generate_braille_pdf(results, output_filename=output_filename)
    results["pdf_path"] = pdf_path
    print(f"STEP 8: PDF Generated at {pdf_path}")
    
    print("--- Workflow Complete ---")
    return results

