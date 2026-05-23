# Sparsh Vaani — स्पर्श वाणी

> *"Bridging sound and touch for every learner"*

An **accessible AI learning platform** built specifically for **blind and visually impaired students**. It combines automatic speech recognition, Braille conversion, and a conversational AI assistant — all with deep WCAG 2.1 AA/AAA compliance and native support for **English, Hindi, and Marathi**.

---

## Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Project Structure](#project-structure)
4. [Prerequisites](#prerequisites)
5. [Environment Setup](#environment-setup)
6. [Running the Backend](#running-the-backend)
7. [Running the Frontend](#running-the-frontend)
8. [API Reference](#api-reference)
9. [Accessibility Design](#accessibility-design)
10. [Multilingual Support](#multilingual-support)
11. [Troubleshooting](#troubleshooting)

---

## Features

| Feature | Description |
|---|---|
| **Speech Transcription** | Upload audio/video files, paste a YouTube URL, or record live — transcribed by OpenAI Whisper |
| **Braille Conversion** | Convert any English, Hindi, or Marathi text to Unicode Braille (Bharati standard) |
| **Voice Assistant** | Push-to-Talk voice chat powered by GPT-4o, with gTTS audio response |
| **Tri-lingual Walkthrough** | Automatic audio walkthrough on page load in English / Hindi / Marathi |
| **Voice Navigation** | Say "transcribe", "braille", "assistant", or "help" to navigate hands-free |
| **High Contrast Mode** | WCAG AAA contrast ratios, large typography, keyboard-first design |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (React/Vite)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │Transcription │  │   Braille    │  │  Voice Assistant  │  │
│  │    Panel     │  │    Panel     │  │      Panel        │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────┘  │
│         │                 │                   │              │
│  ┌──────▼─────────────────▼───────────────────▼──────────┐  │
│  │           useVoiceWalkthrough  ·  useVoiceNavigation   │  │
│  │              Web Speech API (SpeechSynthesis / STT)    │  │
│  └──────────────────────────┬─────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────┘
                              │ HTTP / FormData
┌─────────────────────────────▼───────────────────────────────┐
│                    FastAPI Backend (Python)                   │
│                                                             │
│  POST /transcribe/audio     ← Whisper local/API             │
│  POST /transcribe/youtube   ← yt-dlp + Whisper              │
│  POST /braille/convert      ← Bharati Braille maps          │
│  POST /assistant/chat/voice ← Whisper → GPT-4o → gTTS       │
│  POST /assistant/chat/text  ← GPT-4o → gTTS                 │
│  GET  /audio/<filename>     ← Static TTS audio file         │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
MAJOR/
├── backend/
│   ├── app/
│   │   ├── main.py                  ← FastAPI app factory + lifespan
│   │   ├── config/
│   │   │   ├── settings.py          ← Pydantic settings (env vars)
│   │   │   └── logging.py
│   │   ├── api/
│   │   │   ├── deps.py              ← Singleton dependency injection
│   │   │   └── routes/
│   │   │       ├── transcribe.py    ← /transcribe/*
│   │   │       ├── braille.py       ← /braille/*
│   │   │       ├── assistant.py     ← /assistant/*
│   │   │       ├── chat.py          ← /chat/* (legacy)
│   │   │       ├── image.py         ← /image/* (legacy)
│   │   │       └── health.py        ← /health
│   │   ├── services/
│   │   │   ├── transcription_service.py  ← Whisper singleton + yt-dlp
│   │   │   ├── braille_service.py        ← English + Bharati Braille
│   │   │   ├── tts_service.py            ← gTTS multilingual
│   │   │   └── assistant_service.py      ← GPT-4o chat + session memory
│   │   ├── utils/
│   │   │   ├── audio_utils.py       ← pydub WAV conversion
│   │   │   └── file_utils.py        ← upload/cleanup helpers
│   │   └── data/
│   │       ├── uploads/             ← Temporary upload files
│   │       └── temp/                ← TTS audio files (auto-cleaned)
│   ├── .env                         ← Your secrets (never commit!)
│   ├── .env.example                 ← Template
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── App.tsx                  ← Root (providers)
    │   ├── pages/
    │   │   └── Index.tsx            ← Main page, tab nav, ARIA landmarks
    │   ├── components/
    │   │   ├── VoiceWalkthrough.tsx ← Trilingual audio walkthrough bar
    │   │   ├── TranscriptionPanel.tsx
    │   │   ├── BraillePanel.tsx
    │   │   ├── AssistantPanel.tsx
    │   │   ├── AccessibilityControls.tsx
    │   │   ├── LanguageSwitcher.tsx
    │   │   └── Footer.tsx
    │   ├── hooks/
    │   │   ├── useVoiceWalkthrough.ts  ← SpeechSynthesis walkthrough
    │   │   └── useVoiceNavigation.ts   ← SpeechRecognition commands
    │   ├── contexts/
    │   │   └── LanguageContext.tsx
    │   ├── lib/
    │   │   └── api.ts               ← Typed API client
    │   ├── locales/
    │   │   └── translations.ts      ← All UI strings in EN/HI/MR
    │   └── index.css                ← Design system + accessibility styles
    ├── package.json
    └── vite.config.ts
```

---

## Prerequisites

### Backend
- Python **3.10+**
- [FFmpeg](https://ffmpeg.org/download.html) installed and on `PATH` (required by Whisper and pydub)
- (Optional) [liblouis](https://liblouis.io/) for Grade-2 Braille (`lou_translate`)

### Frontend
- Node.js **18+** and npm (or bun)

---

## Environment Setup

### 1. Copy the environment template

```bash
cd backend
cp .env.example .env
```

### 2. Fill in your `.env`

```env
OPENAI_API_KEY=sk-...          # Required for GPT-4o assistant & Whisper API fallback
WHISPER_MODEL=base             # tiny | base | small | medium | large
ENVIRONMENT=development        # development | production
```

> **No OpenAI key?** The transcription still works using the local Whisper model.
> Only the Voice Assistant and the Whisper API fallback require a key.

---

## Running the Backend

```bash
cd backend

# 1. Create virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API is now live at **http://localhost:8000**

- Interactive docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health check: http://localhost:8000/health

> **First startup note:** Whisper model (~140 MB for `base`) downloads and loads on first run. Subsequent starts are fast because the model is cached.

### Installing FFmpeg (Windows)

```powershell
# Using winget:
winget install Gyan.FFmpeg

# Or download from https://ffmpeg.org/download.html and add bin/ to PATH
```

### Installing yt-dlp (for YouTube transcription)

```bash
pip install yt-dlp
```

---

## Running the Frontend

```bash
cd frontend

# Install dependencies
npm install
# or: bun install

# Start dev server
npm run dev
# or: bun dev
```

Frontend is now live at **http://localhost:5173**

### Building for production

```bash
npm run build
# Serve the dist/ folder with any static server
```

### Environment variable (optional)

If your backend is not on `localhost:8000`, create a `.env.local` in `frontend/`:

```env
VITE_API_URL=https://your-backend-url.com
```

---

## API Reference

### Transcription

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/transcribe/audio` | Upload audio/video file → transcribed text + Braille |
| `POST` | `/transcribe/youtube` | Submit YouTube URL → transcribed text + Braille |

**`POST /transcribe/audio`** (multipart/form-data)
```
file: <audio or video file>
language: "auto" | "en" | "hi" | "mr"   (default: auto)
```

**`POST /transcribe/youtube`** (JSON)
```json
{ "url": "https://youtube.com/watch?v=...", "language": "auto" }
```

**Response (both)**
```json
{
  "text": "Transcribed text here",
  "language": "en",
  "braille": "⠞⠗⠁⠝⠎⠉⠗⠊⠃⠑⠙...",
  "source": "whisper-local"
}
```

---

### Braille Conversion

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/braille/convert` | Convert text to Unicode Braille |

**Request**
```json
{ "text": "Hello world", "language": "en" }
```

**Response**
```json
{ "original": "Hello world", "braille": "⠠⠓⠑⠇⠇⠕ ⠺⠕⠗⠇⠙", "language": "en" }
```

Supported languages: `"en"` (Grade-1 Unicode), `"hi"` (Bharati), `"mr"` (Bharati)

---

### Voice Assistant

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/assistant/chat/voice` | Audio → STT → GPT-4o → gTTS audio |
| `POST` | `/assistant/chat/text` | Text → GPT-4o → gTTS audio |
| `POST` | `/assistant/session/new` | Create session ID |
| `DELETE` | `/assistant/session/{id}` | Clear conversation memory |
| `GET` | `/audio/{filename}` | Serve TTS audio file |

**`POST /assistant/chat/voice`** (multipart/form-data)
```
session_id: <uuid>
language: "auto" | "en" | "hi" | "mr"
audio: <audio file>
```

**Response**
```json
{
  "session_id": "...",
  "transcription": "What is photosynthesis?",
  "response": "Photosynthesis is the process by which plants convert sunlight into food.",
  "audio_filename": "tts_abc123.mp3",
  "language": "en"
}
```

Play the audio at: `GET /audio/{audio_filename}`

---

## Accessibility Design

### WCAG Compliance
- **Level AA** for all interactive elements
- **Level AAA** contrast in high-contrast mode (21:1 ratio)

### Key Accessibility Features

| Feature | Implementation |
|---|---|
| Skip navigation | First focusable element, jumps to `#main-content` |
| ARIA live regions | `aria-live="polite"` for results, `aria-live="assertive"` for errors and transcriptions |
| Semantic HTML | `<main>`, `<header>`, `<section>`, `<article>`, `role="tablist/tab/tabpanel/log"` |
| Focus management | Logical tab order, all interactive elements are keyboard-reachable |
| Audio walkthrough | Auto-plays on load, `H` = replay, `Esc` = stop |
| Voice navigation | Always-on SpeechRecognition for panel switching and help commands |
| PTT microphone | Spacebar triggers recording (Push-to-Talk); also pointer events |
| ARIA labels | Every icon, button, input, and region has a precise `aria-label` or `aria-labelledby` |
| Braille `aria-label` | `<p aria-label="Braille representation of: {original text}">` — screen readers speak the original |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Tab` | Move focus forward |
| `Shift+Tab` | Move focus backward |
| `Enter` / `Space` | Activate focused button or tab |
| `H` | Replay audio walkthrough |
| `Escape` | Stop audio walkthrough |
| `Space` (on mic button) | Start/stop recording |

### Voice Commands (always-on)

Say these words to navigate (works in EN/HI/MR):

| Command | Action |
|---------|--------|
| "transcribe" / "ट्रांसक्रिप्शन" | Switch to Transcription tab |
| "braille" / "ब्रेल" | Switch to Braille tab |
| "assistant" / "सहायक" | Switch to Voice Assistant tab |
| "help" / "मदद" | Replay walkthrough |
| "stop" / "रुको" | Stop walkthrough |
| "english" / "hindi" / "marathi" | Switch language |

---

## Multilingual Support

### Backend

Whisper auto-detects language from audio. Pass `language: "hi"` or `language: "mr"` to force the language. All Whisper models support Hindi and Marathi natively.

**Braille maps:**
- English → Unicode Grade-1 Braille (`⠁`–`⠻`)
- Hindi/Marathi → Bharati Braille (NIVH standard), covers all Devanagari vowels, consonants, matras, conjuncts, and diacritics

**TTS languages:**
- `gTTS` codes: English=`en`, Hindi=`hi`, Marathi=`mr`

### Frontend

All UI strings are in `src/locales/translations.ts`. The walkthrough scripts in `src/hooks/useVoiceWalkthrough.ts` are full sentences in all three languages.

The BCP-47 codes used for `SpeechSynthesisUtterance`:
- English: `en-IN`
- Hindi: `hi-IN`
- Marathi: `mr-IN`

---

## Troubleshooting

### Backend

| Problem | Solution |
|---------|----------|
| `whisper` import error | `pip install openai-whisper` |
| FFmpeg not found | Install FFmpeg and add to PATH. Restart terminal. |
| `yt-dlp` not found | `pip install yt-dlp` |
| OpenAI API error | Check `OPENAI_API_KEY` in `.env`. The key needs GPT-4o access. |
| Port 8000 in use | `uvicorn app.main:app --port 8001` (update `VITE_API_URL` too) |
| Whisper takes long | Use `WHISPER_MODEL=tiny` for fastest results (lower accuracy) |

### Frontend

| Problem | Solution |
|---------|----------|
| CORS error | Make sure backend is running on port 8000 and `ENVIRONMENT=development` |
| Microphone not working | Use HTTPS or `localhost`; check browser permissions |
| Voice walkthrough silent | Browser requires user interaction before audio. Click anything on the page first. |
| Speech Recognition not working | Use Chrome or Edge (Firefox has limited support for Web Speech API) |

---

## Tech Stack

**Backend:** FastAPI · OpenAI Whisper · GPT-4o · gTTS · pydub · yt-dlp · liblouis (optional)

**Frontend:** React 18 · TypeScript · Vite · Tailwind CSS · Web Speech API (SpeechSynthesis + SpeechRecognition)

---

*Made with ❤️ by Team Sparsh Vaani — empowering education through touch and technology.*
