import streamlit as st
import sys
import os
import json
from dotenv import load_dotenv

# Load .env from backend directory
current_dir = os.path.dirname(os.path.abspath(__file__)) # .../backend/streamlit
backend_dir = os.path.dirname(current_dir) # .../backend
env_path = os.path.join(backend_dir, ".env")
load_dotenv(env_path)

# Add parent directory to path to import backend modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

try:
    from backend.agents.agent_orchestrator import run_agent_workflow
except ImportError as e:
    st.error(f"Failed to import Agent Orchestrator. Check path configuration. Error: {e}")
    st.stop()

st.set_page_config(page_title="SparshVaani AI: Study Agent", layout="wide")

st.title("🤖 SparshVaani: AI Study Agent")
st.markdown("""
This Multi-Agent System analyzes educational videos to generate comprehensive study materials.
**Agents:** Language Detect • Transcribe • Context • Summary • Notes • Q&A • Braille
""")

youtube_url = st.text_input("YouTube Video URL", placeholder="https://www.youtube.com/watch?v=...")

col1, col2 = st.columns([1, 1])
with col1:
    provider_choice = st.radio("LLM Provider", ["OpenAI (GPT-4o)", "Ollama (Local)"], horizontal=True)

if st.button("Generate Study Material", type="primary"):
    if not youtube_url:
        st.warning("Please enter a valid YouTube URL.")
    else:
        with st.status("🚀 Agents Working...", expanded=True) as status:
            st.write("Initializing Agents...")
            
            # Run the synchronous orchestrator (since it uses blocking calls)
            # In a production app, we might want this async or threaded
            try:
                provider_key = "openai" if "OpenAI" in provider_choice else "ollama"
                results = run_agent_workflow(youtube_url, provider_type=provider_key)
                
                if "error" in results:
                    status.update(label="❌ Workflow Failed", state="error")
                    st.error(results["error"])
                else:
                    status.update(label="✅ Workflow Complete!", state="complete")
                    
                    # Store results in session state to persist
                    st.session_state['agent_results'] = results
                    
                    # PDF Download Button (Immediate)
                    pdf_path = results.get("pdf_path", "")
                    if pdf_path and os.path.exists(pdf_path):
                        with open(pdf_path, "rb") as f:
                            pdf_data = f.read()
                        st.download_button(
                            label="📥 Download Study Material (PDF)",
                            data=pdf_data,
                            file_name="study_material.pdf",
                            mime="application/pdf",
                            type="primary"
                        )
                    
            except Exception as e:
                status.update(label="❌ Critical Error", state="error")
                st.error(f"An unexpected error occurred: {e}")

# Display Results
if 'agent_results' in st.session_state:
    res = st.session_state['agent_results']
    
    if res.get('truncated'):
        st.warning("⚠️ **Transcript Truncated:** The video exceeded the 30-minute limit. Only the first 30 minutes were processed to conserve resources.")

    # 1. Meta Info
    c1, c2 = st.columns(2)
    with c1:
        st.success(f"**Detected Language:** {res.get('language', 'Unknown')}")
    with c2:
        context = res.get('context', {})
        st.info(f"**Topic:** {context.get('topic', 'N/A')} | **Intent:** {context.get('intent', 'N/A')}")
    
    # 2. Tabs for Content
    tab1, tab2, tab3, tab4, tab5, tab6, tab7 = st.tabs([
        "✨ Abstracted Text",
        "📝 Summary", 
        "📚 Study Notes", 
        "❓ Q&A", 
        "⠼ Braille Output", 
        "📜 Raw Transcript",
        "⚙️ Context Debug"
    ])
    
    with tab1:
        st.subheader("Abstracted & Cleaned Text")
        st.write("This text has been cleaned of filler words, exclamations, and pauses for a better educational reading experience.")
        st.text_area("Cleaned Text", res.get('abstracted_text', 'No abstracted text generated.'), height=400)
    
    with tab2:
        st.subheader("Executive Summary")
        st.write(res.get('summary', "No summary generated."))
        
    with tab2:
        st.subheader("Structured Study Notes")
        notes = res.get('notes', [])
        if notes:
            for note in notes:
                st.markdown(f"- {note}")
        else:
            st.write("No notes generated.")
            
    with tab3:
        st.subheader("Exam Preparation")
        qa_list = res.get('qa', [])
        if qa_list:
            for i, item in enumerate(qa_list, 1):
                with st.expander(f"Q{i}: {item.get('question', '')}"):
                    st.write(f"**Answer:** {item.get('answer', '')}")
        else:
            st.write("No Q&A generated.")
            
    with tab4:
        st.subheader("Braille Conversion (Grade 1)")
        braille_data = res.get('braille', {})
        
        st.markdown("#### Summary in Braille")
        st.code(braille_data.get('braille_summary', ''))
        
        with st.expander("Notes in Braille"):
            for bn in braille_data.get('braille_notes', []):
                st.text(bn)
                
        with st.expander("Q&A in Braille"):
            for item in braille_data.get('braille_qa', []):
                st.write("**Q:**")
                st.text(item.get('question/'))
                st.write("**A:**")
                st.text(item.get('answer'))

    with tab6:
        st.subheader("Full Raw Transcript")
        st.text_area("Raw Transcript", res.get('transcript', ''), height=400)
        
    with tab7:
        st.json(res.get('context', {}))
