SparshVaani
===========

An accessible AI learning assistant for visually impaired students reading PDF textbooks.
Processes voice signals, performs Speech-to-Text and Text-to-Speech via local Whisper/OpenAI and high-performance Sarvam AI (Hindi & Marathi), and interacts with students in English, Hindi, and Marathi dynamically.

## How to run locally
1. Initialize the virtual environment:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   ```
2. Install python requirements:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the development server:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
