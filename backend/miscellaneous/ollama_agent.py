import streamlit as st
import sys
import os
import time
from dotenv import load_dotenv

# Load .env
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# Add parent directory to path to import backend modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.agents.agent_orchestrator import run_agent_workflow

st.set_page_config(page_title="SparshVaani: Ollama Agent", layout="wide")

st.title("🦙 SparshVaani: Local Ollama Agent")
st.markdown("Run the agent pipeline using your local Ollama LLM.")

# Sidebar Settings
st.sidebar.header("Settings")
youtube_url = st.sidebar.text_input("YouTube URL", "https://www.youtube.com/watch?v=example")
ollama_model = st.sidebar.text_input("Ollama Model", "mistral")

if st.sidebar.button("Run Agent Workflow"):
    if not youtube_url:
        st.error("Please enter a YouTube URL.")
    else:
        st.info(f"Running with Ollama ({ollama_model})...")
        start_time = time.time()
        
        try:
            results = run_agent_workflow(youtube_url, provider_type="ollama", provider_model=ollama_model)
            end_time = time.time()
            st.success(f"Completed in {end_time - start_time:.2f}s")
            
            # Use tabs for cleaner display
            tab1, tab2, tab3, tab4, tab5 = st.tabs(["Summary", "Notes", "Q&A", "MetaData", "PDF"])
            
            with tab1:
                st.subheader("Summary")
                st.write(results.get("summary", "N/A"))
                
            with tab2:
                st.subheader("Study Notes")
                notes = results.get("notes", [])
                for note in notes:
                    st.write(f"- {note}")
                    
            with tab3:
                st.subheader("Q&A")
                qa = results.get("qa", [])
                for item in qa:
                    with st.expander(item.get("question", "Question")):
                        st.write(item.get("answer", "Answer"))
                        
            with tab4:
                st.subheader("Metadata")
                st.write(f"**Language:** {results.get('language', 'N/A')}")
                st.write("**Context:**")
                st.json(results.get("context", {}))
                
            with tab5:
                st.subheader("PDF Output")
                pdf_path = results.get("pdf_path", "")
                st.write(f"Generated at: `{pdf_path}`")
                
                if pdf_path and os.path.exists(pdf_path):
                    with open(pdf_path, "rb") as f:
                        pdf_data = f.read()
                    st.download_button(
                        label="Download PDF",
                        data=pdf_data,
                        file_name=os.path.basename(pdf_path),
                        mime="application/pdf"
                    )
            
        except Exception as e:
            st.error(f"Error: {e}")
            st.warning("Make sure Ollama is running (`ollama serve`) and the model is pulled (`ollama pull mistral`).")
