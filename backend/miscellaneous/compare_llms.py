import streamlit as st
import sys
import os
import time
import pandas as pd
import difflib
from dotenv import load_dotenv

# Load .env
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# Add parent directory to path to import backend modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.agents.agent_orchestrator import run_agent_workflow

st.set_page_config(page_title="LLM Comparison: OpenAI vs Ollama", layout="wide")

st.title("🤖 LLM Comparison: OpenAI vs Ollama")
st.markdown("Run the same agent pipeline with two different LLM providers to compare accuracy, speed, and quality.")

# Sidebar Settings
st.sidebar.header("Settings")
youtube_url = st.sidebar.text_input("YouTube URL", "https://www.youtube.com/watch?v=example")
openai_model = st.sidebar.selectbox("OpenAI Model", ["gpt-4o", "gpt-3.5-turbo"], index=0)
ollama_model = st.sidebar.text_input("Ollama Model", "mistral")

def calculate_metrics(text):
    if not text:
        return 0, 0
    words = text.split()
    word_count = len(words)
    unique_words = len(set(words))
    richness = unique_words / word_count if word_count > 0 else 0
    return word_count, richness

def get_similarity(text1, text2):
    return difflib.SequenceMatcher(None, text1, text2).ratio()

if st.sidebar.button("Run Comparison"):
    if not youtube_url:
        st.error("Please enter a YouTube URL.")
    else:
        # Containers for results
        results_data = {
            "OpenAI": {},
            "Ollama": {}
        }
        
        # --- Run OpenAI ---
        with st.status("Running OpenAI Agent...", expanded=True) as status_openai:
            start_time = time.time()
            try:
                res_openai = run_agent_workflow(youtube_url, provider_type="openai", provider_model=openai_model)
                results_data["OpenAI"]["data"] = res_openai
                results_data["OpenAI"]["time"] = time.time() - start_time
                status_openai.update(label="✅ OpenAI Complete", state="complete")
            except Exception as e:
                st.error(f"OpenAI Failed: {e}")
                results_data["OpenAI"]["error"] = str(e)
                status_openai.update(label="❌ OpenAI Failed", state="error")

        # --- Run Ollama ---
        with st.status("Running Ollama Agent...", expanded=True) as status_ollama:
            start_time = time.time()
            try:
                res_ollama = run_agent_workflow(youtube_url, provider_type="ollama", provider_model=ollama_model)
                results_data["Ollama"]["data"] = res_ollama
                results_data["Ollama"]["time"] = time.time() - start_time
                status_ollama.update(label="✅ Ollama Complete", state="complete")
            except Exception as e:
                st.error(f"Ollama Failed: {e}")
                results_data["Ollama"]["error"] = str(e)
                status_ollama.update(label="❌ Ollama Failed", state="error")

        # --- Display Comparison ---
        st.divider()
        st.header("📊 Comparative Analysis")
        
        if "data" in results_data["OpenAI"] and "data" in results_data["Ollama"]:
            d_openai = results_data["OpenAI"]["data"]
            d_ollama = results_data["Ollama"]["data"]
            
            # Metrics Calculation
            summ_oa_len, summ_oa_rich = calculate_metrics(d_openai.get("summary", ""))
            summ_ol_len, summ_ol_rich = calculate_metrics(d_ollama.get("summary", ""))
            
            sim_score = get_similarity(d_openai.get("summary", ""), d_ollama.get("summary", ""))
            
            metrics = {
                "Metric": [
                    "Processing Time (s)", 
                    "Summary Word Count", 
                    "Vocabulary Richness", 
                    "Notes Generated", 
                    "Q&A Generated",
                    "Summary Similarity (vs OpenAI)"
                ],
                "OpenAI": [
                    f"{results_data['OpenAI']['time']:.2f}",
                    summ_oa_len,
                    f"{summ_oa_rich:.2f}",
                    len(d_openai.get("notes", [])),
                    len(d_openai.get("qa", [])),
                    "1.00 (Baseline)"
                ],
                "Ollama": [
                    f"{results_data['Ollama']['time']:.2f}",
                    summ_ol_len,
                    f"{summ_ol_rich:.2f}",
                    len(d_ollama.get("notes", [])),
                    len(d_ollama.get("qa", [])),
                    f"{sim_score:.2f}"
                ]
            }
            
            df = pd.DataFrame(metrics)
            st.table(df)
            
            # Charts
            c1, c2 = st.columns(2)
            with c1:
                st.subheader("Processing Time (s)")
                chart_data_time = pd.DataFrame({
                    "Provider": ["OpenAI", "Ollama"],
                    "Time (s)": [results_data["OpenAI"]["time"], results_data["Ollama"]["time"]]
                }).set_index("Provider")
                st.bar_chart(chart_data_time)
                
            with c2:
                st.subheader("Summary Word Count")
                chart_data_words = pd.DataFrame({
                    "Provider": ["OpenAI", "Ollama"],
                    "Word Count": [summ_oa_len, summ_ol_len]
                }).set_index("Provider")
                st.bar_chart(chart_data_words)
        
        # --- Side-by-Side Content ---
        st.divider()
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader(f"OpenAI ({openai_model})")
            if "data" in results_data["OpenAI"]:
                res = results_data["OpenAI"]["data"]
                st.markdown(f"**Language:** {res.get('language')}")
                st.markdown("### Summary")
                st.write(res.get("summary"))
                st.markdown("### Notes")
                for n in res.get("notes", []):
                    st.markdown(f"- {n}")
                    
        with col2:
            st.subheader(f"Ollama ({ollama_model})")
            if "data" in results_data["Ollama"]:
                res = results_data["Ollama"]["data"]
                st.markdown(f"**Language:** {res.get('language')}")
                st.markdown("### Summary")
                st.write(res.get("summary"))
                st.markdown("### Notes")
                for n in res.get("notes", []):
                    st.markdown(f"- {n}")
