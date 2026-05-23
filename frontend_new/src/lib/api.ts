/**
 * SparshVaani — typed API client
 * Works in both SSR (server) and browser contexts.
 */

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ── helpers ──────────────────────────────────────────────────────────────────

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
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
  pageNum: number,
): Promise<{ session_id: string; page: number; text: string }> {
  const res = await fetch(`${BASE}/pdf/page/${sessionId}/${pageNum}`);
  return handleResponse(res);
}

// ── Voice Tutor ───────────────────────────────────────────────────────────────

export interface TutorResult {
  transcription: string;
  response: string;
  shouldScroll: boolean;
  scrollToPage: number | null;
  language: string;
  audioBlob: Blob;
  loadPdf?: boolean;
  pdfSessionId?: string | null;
  pdfFilename?: string | null;
  pdfClass?: number | null;
  pdfTotalPages?: number | null;
}

export async function voiceTutor(
  sessionId: string,
  audioBlob: Blob,
  pageNum: number,
  pageText: string,
  language = "auto",
  totalPages = 1,
  classNumber: number | null = null,
): Promise<TutorResult> {
  const form = new FormData();
  form.append("session_id", sessionId);
  form.append("page_num", String(pageNum));
  form.append("page_text", pageText);
  form.append("total_pages", String(totalPages));
  form.append("language", language);
  form.append("audio", audioBlob, "voice.webm");
  if (classNumber !== null) {
    form.append("class_number", String(classNumber));
  }

  const res = await fetch(`${BASE}/voice/tutor`, { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).detail ?? `HTTP ${res.status}`);
  }

  const transcription = decodeURIComponent(res.headers.get("X-Transcription") ?? "");
  const response = decodeURIComponent(res.headers.get("X-Response") ?? "");
  const shouldScroll = res.headers.get("X-Should-Scroll") === "true";
  const scrollPageHeader = res.headers.get("X-Scroll-To-Page");
  const scrollToPage = scrollPageHeader ? parseInt(scrollPageHeader, 10) : null;
  const lang = res.headers.get("X-Language") ?? "en";
  
  const loadPdf = res.headers.get("X-Load-PDF") === "true";
  const pdfSessionId = res.headers.get("X-PDF-Session-Id") || null;
  const pdfFilename = res.headers.get("X-PDF-Filename") || null;
  const pdfClassStr = res.headers.get("X-PDF-Class");
  const pdfClass = pdfClassStr ? parseInt(pdfClassStr, 10) : null;
  const pdfTotalPagesStr = res.headers.get("X-PDF-Total-Pages");
  const pdfTotalPages = pdfTotalPagesStr ? parseInt(pdfTotalPagesStr, 10) : null;
  
  const audio = await res.blob();

  return {
    transcription,
    response,
    shouldScroll,
    scrollToPage,
    language: lang,
    audioBlob: audio,
    loadPdf,
    pdfSessionId,
    pdfFilename,
    pdfClass,
    pdfTotalPages,
  };
}

export async function clearTutorSession(sessionId: string): Promise<void> {
  await fetch(`${BASE}/voice/tutor/session/${sessionId}`, { method: "DELETE" });
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
  language = "auto",
): Promise<TranscriptionResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("language", language);
  const res = await fetch(`${BASE}/transcribe/audio`, { method: "POST", body: form });
  return handleResponse<TranscriptionResult>(res);
}

export async function transcribeYouTube(
  url: string,
  language = "auto",
): Promise<TranscriptionResult> {
  const res = await fetch(`${BASE}/transcribe/youtube`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, language }),
  });
  return handleResponse<TranscriptionResult>(res);
}

// ── Video Notes (VideoAgent) ──────────────────────────────────────────────────

export interface Flashcard {
  question: string;
  answer: string;
}

export interface Timestamp {
  topic: string;
  time: string;
  description: string;
}

export interface VideoNotesResult {
  transcript: string;
  summary: string;
  key_points: string[];
  detailed_notes: string;
  flashcards: Flashcard[];
  timestamps: Timestamp[];
}

export async function processVideo(
  input: { url: string } | { transcript: string },
  language = "en",
): Promise<VideoNotesResult> {
  const body =
    "url" in input
      ? { url: input.url, language }
      : { transcript: input.transcript, language };
  const res = await fetch(`${BASE}/transcribe/generate-notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse<VideoNotesResult>(res);
}

export async function processPDFNotes(
  file: File,
  language = "en",
): Promise<VideoNotesResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("language", language);
  const res = await fetch(`${BASE}/pdf/notes`, { method: "POST", body: form });
  return handleResponse<VideoNotesResult>(res);
}

// ── Braille ───────────────────────────────────────────────────────────────────

export async function convertToBraille(
  text: string,
  language: "en" | "hi" | "mr" = "en",
): Promise<{ original: string; braille: string; language: string }> {
  const res = await fetch(`${BASE}/braille/convert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language }),
  });
  return handleResponse(res);
}
