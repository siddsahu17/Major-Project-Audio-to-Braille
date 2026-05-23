import sys
import os
import time
import csv
from pathlib import Path

from dotenv import load_dotenv

# Setup paths to import backend modules
current_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.abspath(os.path.join(current_dir, "..", ".."))
if project_dir not in sys.path:
    sys.path.append(project_dir)
    
backend_dir = os.path.abspath(os.path.join(current_dir, ".."))
env_path = os.path.join(backend_dir, ".env")
load_dotenv(env_path)

from backend.LLM.providers.openai_provider import OpenAIProvider
from backend.LLM.providers.ollama_provider import OllamaProvider
from backend.agents.transcription_agent import transcribe_video
from backend.agents.abstraction_agent import abstract_text

# Define the videos to benchmark
VIDEOS = [
    {"lang": "en", "duration": "5 min", "url": "https://www.youtube.com/watch?v=-GsolnXOiBg"},
    {"lang": "en", "duration": "10 min", "url": "https://www.youtube.com/watch?v=m19F4IHTVGc"},
    {"lang": "en", "duration": "15 min", "url": "https://www.youtube.com/watch?v=zOHbe5NRabM"},
    {"lang": "en", "duration": "30 min", "url": "https://www.youtube.com/watch?v=x-XdOaZPhBw"},
    
    {"lang": "hi", "duration": "5 min", "url": "https://www.youtube.com/watch?v=rhI_He5TygY"},
    {"lang": "hi", "duration": "10 min", "url": "https://www.youtube.com/watch?v=2BcOv0VYHkY"},
    {"lang": "hi", "duration": "15 min", "url": "https://www.youtube.com/watch?v=qsxmV-9ut6E"},
    {"lang": "hi", "duration": "30 min", "url": "https://www.youtube.com/watch?v=osQpCMdUTpU"},
    
    {"lang": "mr", "duration": "5 min", "url": "https://www.youtube.com/watch?v=6wbK6hyA66A"},
    {"lang": "mr", "duration": "10 min", "url": "https://www.youtube.com/watch?v=gNd2HL8_qCE"},
    {"lang": "mr", "duration": "15 min", "url": "https://www.youtube.com/watch?v=toIGK1vPyqc"},
    {"lang": "mr", "duration": "30 min", "url": "https://www.youtube.com/watch?v=GtmY8lU3FsU"},
]

OUTPUT_CSV = os.path.join(current_dir, "benchmark_report.csv")
MAX_CHARS = 35000 # Enforce the 30 min limit

def count_words(text):
    return len(str(text).split())

def run_benchmark():
    print(f"Starting Benchmark. Results will be saved to: {OUTPUT_CSV}")
    
    # Initialize Providers
    print("Initializing LLM Providers...")
    openai_provider = OpenAIProvider(model="gpt-4o")
    # Make sure ollama is running locally with the expected model (e.g., mistral or llama3)
    ollama_provider = OllamaProvider(model="mistral") 
    
    # Setup CSV Writer
    file_exists = os.path.exists(OUTPUT_CSV)
    with open(OUTPUT_CSV, mode="a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow([
                "Language", "Video_Duration", "Video_URL", 
                "Raw_Word_Count", 
                "OpenAI_Word_Count", "OpenAI_Time_Sec", "OpenAI_Words_Per_Sec", "OpenAI_Compression_Ratio",
                "Ollama_Word_Count", "Ollama_Time_Sec", "Ollama_Words_Per_Sec", "Ollama_Compression_Ratio"
            ])
            
        for i, video in enumerate(VIDEOS):
            print(f"\n--- Processing Video {i+1}/{len(VIDEOS)}: [{video['lang'].upper()} - {video['duration']}] ---")
            print(f"URL: {video['url']}")
            
            # 1. Transcription
            print("Step 1: Transcribing...")
            trans_result = transcribe_video(video["url"], video["lang"])
            raw_transcript = trans_result.get("transcript", "")
            
            if not raw_transcript:
                print(f"Failed to transcribe {video['url']}. Skipping.")
                continue
                
            # Enforce length limit
            if len(raw_transcript) > MAX_CHARS:
                print(f"Truncating transcript from {len(raw_transcript)} to {MAX_CHARS} chars.")
                raw_transcript = raw_transcript[:MAX_CHARS]
                
            raw_word_count = count_words(raw_transcript)
            print(f"Raw Transcript Word Count: {raw_word_count}")
            
            # 2. OpenAI Benchmark
            print("Step 2: Running OpenAI Abstraction...")
            start_time = time.time()
            openai_result = abstract_text(raw_transcript, llm_provider=openai_provider)
            openai_time = time.time() - start_time
            
            openai_text = openai_result.get("abstracted_text", "")
            openai_word_count = count_words(openai_text)
            
            openai_wps = raw_word_count / openai_time if openai_time > 0 else 0
            openai_compression = (openai_word_count / raw_word_count) if raw_word_count > 0 else 0
            print(f"OpenAI Time: {openai_time:.2f}s | Words: {openai_word_count} | Ratio: {openai_compression:.2%}")
            
            # 3. Ollama Benchmark
            print("Step 3: Running Ollama Abstraction...")
            start_time = time.time()
            ollama_result = abstract_text(raw_transcript, llm_provider=ollama_provider)
            ollama_time = time.time() - start_time
            
            ollama_text = ollama_result.get("abstracted_text", "")
            ollama_word_count = count_words(ollama_text)
            
            ollama_wps = raw_word_count / ollama_time if ollama_time > 0 else 0
            ollama_compression = (ollama_word_count / raw_word_count) if raw_word_count > 0 else 0
            print(f"Ollama Time: {ollama_time:.2f}s | Words: {ollama_word_count} | Ratio: {ollama_compression:.2%}")
            
            # Save row
            writer.writerow([
                video["lang"], video["duration"], video["url"],
                raw_word_count,
                openai_word_count, f"{openai_time:.2f}", f"{openai_wps:.2f}", f"{openai_compression:.2f}",
                ollama_word_count, f"{ollama_time:.2f}", f"{ollama_wps:.2f}", f"{ollama_compression:.2f}"
            ])
            f.flush() # Ensure it writes to disk immediately in case of crash
            
    print("\n--- Benchmark Complete ---")
    print(f"Results saved to: {OUTPUT_CSV}")

if __name__ == "__main__":
    run_benchmark()
