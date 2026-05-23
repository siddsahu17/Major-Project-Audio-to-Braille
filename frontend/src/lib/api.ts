/**
 * Sparsh Vaani — API Client
 * Typed wrappers for all backend endpoints.
 * Base URL read from VITE_API_URL env var, defaults to localhost:8000.
 */

const BASE = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Transcription ─────────────────────────────────────────────────────────────

export interface TranscriptionResult {
  text: string;
  language: string;
  braille: string;
  source: string;
}

export async function transcribeAudio(
  file: File,
  language = "auto"
): Promise<TranscriptionResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("language", language);
  const res = await fetch(`${BASE}/transcribe/audio`, { method: "POST", body: form });
  return handleResponse<TranscriptionResult>(res);
}

export async function transcribeYouTube(
  url: string,
  language = "auto"
): Promise<TranscriptionResult> {
  const res = await fetch(`${BASE}/transcribe/youtube`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, language }),
  });
  return handleResponse<TranscriptionResult>(res);
}

// ── Braille ───────────────────────────────────────────────────────────────────

export interface BrailleResult {
  original: string;
  braille: string;
  language: string;
}

export async function convertToBraille(
  text: string,
  language: "en" | "hi" | "mr" = "en"
): Promise<BrailleResult> {
  const res = await fetch(`${BASE}/braille/convert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language }),
  });
  return handleResponse<BrailleResult>(res);
}

// ── Assistant ─────────────────────────────────────────────────────────────────

export interface AssistantResponse {
  session_id: string;
  transcription: string;
  response: string;
  audio_filename: string;
  language: string;
}

export async function chatVoice(
  sessionId: string,
  audioBlob: Blob,
  language = "auto"
): Promise<AssistantResponse> {
  const form = new FormData();
  form.append("session_id", sessionId);
  form.append("language", language);
  form.append("audio", audioBlob, "voice.webm");
  const res = await fetch(`${BASE}/assistant/chat/voice`, { method: "POST", body: form });
  return handleResponse<AssistantResponse>(res);
}

export async function chatText(
  sessionId: string,
  message: string,
  language = "en"
): Promise<AssistantResponse> {
  const res = await fetch(`${BASE}/assistant/chat/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, message, language }),
  });
  return handleResponse<AssistantResponse>(res);
}

// ── PDF Tutor ─────────────────────────────────────────────────────────────────

export interface PDFUploadResult {
  session_id: string;
  total_pages: number;
  filename: string;
}

export async function uploadPDF(file: File): Promise<PDFUploadResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/pdf/upload`, { method: "POST", body: form });
  return handleResponse<PDFUploadResult>(res);
}

export async function getPDFPage(
  sessionId: string,
  pageNum: number
): Promise<{ session_id: string; page: number; text: string }> {
  const res = await fetch(`${BASE}/pdf/page/${sessionId}/${pageNum}`);
  return handleResponse(res);
}

export interface NotesResult {
  summary: string;
  key_points: string[];
  detailed_notes: string;
}

export async function generateNotes(
  transcript: string,
  language: string = "en"
): Promise<NotesResult> {
  const res = await fetch(`${BASE}/transcribe/generate-notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript, language }),
  });
  return handleResponse<NotesResult>(res);
}

export interface TutorStreamResult {
  transcription: string;
  response: string;
  shouldScroll: boolean;
  language: string;
  audioBlob: Blob;
}

export async function voiceTutor(
  sessionId: string,
  audioBlob: Blob,
  pageNum: number,
  pageText: string,
  language: string = "auto"
): Promise<TutorStreamResult> {
  const form = new FormData();
  form.append("session_id", sessionId);
  form.append("page_num", String(pageNum));
  form.append("page_text", pageText ?? "");
  form.append("language", language);
  form.append("audio", audioBlob, "voice.webm");

  const res = await fetch(`${BASE}/voice/tutor`, { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = (body as any).detail;
    const msg = Array.isArray(detail)
      ? detail.map((e: any) => `${e.field ?? e.loc?.at(-1) ?? "field"}: ${e.msg}`).join("; ")
      : (typeof detail === "string" ? detail : `HTTP ${res.status}`);
    throw new Error(msg);
  }

  const transcription = decodeURIComponent(res.headers.get("X-Transcription") ?? "");
  const response = decodeURIComponent(res.headers.get("X-Response") ?? "");
  const shouldScroll = res.headers.get("X-Should-Scroll") === "true";
  const lang = res.headers.get("X-Language") ?? "en";
  const audioBlob_out = await res.blob();

  return {
    transcription,
    response,
    shouldScroll,
    language: lang,
    audioBlob: audioBlob_out,
  };
}

// ── Legacy compatibility (kept for any remaining Streamlit/old components) ────

export interface ProcessingResult {
  text: string;
  braille: string;
}

export const processAudio = async (file: Blob): Promise<ProcessingResult> => {
  const f = new File([file], "audio.webm");
  const res = await transcribeAudio(f);
  return { text: res.text, braille: res.braille };
};

export interface ChatVoiceResponse {
  transcription: string;
  response: string;
  audio_url: string;
}

export const sendVoiceChat = async (
  sessionId: string,
  audioBlob: Blob
): Promise<ChatVoiceResponse> => {
  const res = await chatVoice(sessionId, audioBlob);
  return {
    transcription: res.transcription,
    response: res.response,
    audio_url: `${BASE}/audio/${res.audio_filename}`,
  };
};
