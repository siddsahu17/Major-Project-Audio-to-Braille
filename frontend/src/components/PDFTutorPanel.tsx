/**
 * PDFTutorPanel — Feature 2: AI Voice Tutor with PDF
 * Upload a PDF → view page-by-page → push-to-talk questions
 * → GPT-4o answers in context of current page → streamed TTS playback
 * → [SCROLL_DOWN] auto-advances page
 */

import React, { useEffect, useId, useRef, useState } from "react";
import { Language } from "@/locales/translations";
import { uploadPDF, getPDFPage, voiceTutor } from "@/lib/api";
import { useSessionStore } from "@/store/sessionStore";
import { PDFViewer } from "./PDFViewer";

const T: Record<Language, Record<string, string>> = {
  en: {
    heading: "📖 PDF Voice Tutor",
    upload_label: "Upload a PDF to start learning",
    uploading: "Processing PDF, please wait…",
    pdf_loaded: "PDF loaded. Hold the mic button or press Space to ask a question.",
    hold_to_ask: "Hold to ask",
    release_to_send: "Release to send",
    thinking: "Tutor is thinking…",
    you: "You",
    tutor: "Tutor",
    new_session: "New Session",
    error: "Error",
    mic_unavailable: "Microphone unavailable. Please allow microphone access.",
    no_pdf: "No PDF loaded.",
    lang_label: "Language",
  },
  hi: {
    heading: "📖 PDF वॉइस शिक्षक",
    upload_label: "सीखना शुरू करने के लिए PDF अपलोड करें",
    uploading: "PDF प्रोसेस हो रही है, कृपया प्रतीक्षा करें…",
    pdf_loaded: "PDF लोड हो गई। प्रश्न पूछने के लिए माइक बटन दबाएं या Space पकड़ें।",
    hold_to_ask: "प्रश्न पूछने के लिए पकड़ें",
    release_to_send: "भेजने के लिए छोड़ें",
    thinking: "शिक्षक सोच रहे हैं…",
    you: "आप",
    tutor: "शिक्षक",
    new_session: "नया सत्र",
    error: "त्रुटि",
    mic_unavailable: "माइक्रोफ़ोन उपलब्ध नहीं। कृपया माइक्रोफ़ोन की अनुमति दें।",
    no_pdf: "कोई PDF लोड नहीं है।",
    lang_label: "भाषा",
  },
  mr: {
    heading: "📖 PDF व्हॉइस शिक्षक",
    upload_label: "शिकणे सुरू करण्यासाठी PDF अपलोड करा",
    uploading: "PDF प्रक्रिया होत आहे, कृपया प्रतीक्षा करा…",
    pdf_loaded: "PDF लोड झाली. प्रश्न विचारण्यासाठी माइक बटण धरा किंवा Space दाबा.",
    hold_to_ask: "प्रश्न विचारण्यासाठी धरा",
    release_to_send: "पाठवण्यासाठी सोडा",
    thinking: "शिक्षक विचार करत आहेत…",
    you: "तुम्ही",
    tutor: "शिक्षक",
    new_session: "नवीन सत्र",
    error: "त्रुटी",
    mic_unavailable: "मायक्रोफोन उपलब्ध नाही. कृपया मायक्रोफोन परवानगी द्या.",
    no_pdf: "कोणतीही PDF लोड केलेली नाही.",
    lang_label: "भाषा",
  },
};

interface Props {
  language: Language;
}

export const PDFTutorPanel: React.FC<Props> = ({ language }) => {
  const t = T[language];
  const panelId = useId();

  const {
    pdfSessionId,
    totalPages,
    currentPage,
    pdfFile,
    messages,
    setPdfSession,
    setCurrentPage,
    nextPage,
    appendMessage,
    clearSession,
  } = useSessionStore();

  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pageText, setPageText] = useState("");

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);

  // Fetch page text whenever session or page changes
  useEffect(() => {
    if (!pdfSessionId || !currentPage) return;
    getPDFPage(pdfSessionId, currentPage)
      .then((r) => setPageText(r.text))
      .catch(() => setPageText(""));
  }, [pdfSessionId, currentPage]);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── PDF Upload ────────────────────────────────────────────────────────────

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const res = await uploadPDF(file);
      setPdfSession(res.session_id, res.total_pages, file);
    } catch (err: any) {
      setError(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // ── PTT Recording ─────────────────────────────────────────────────────────

  const startRecording = async () => {
    if (!pdfSessionId || loading) return;
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";
      const rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const blobType = rec.mimeType || "audio/webm";
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (chunksRef.current.length === 0) {
          setError("No audio recorded. Please hold the button and speak.");
          return;
        }
        const blob = new Blob(chunksRef.current, { type: blobType });
        await submitVoice(blob);
      };
      rec.start();
      mediaRef.current = rec;
      setIsRecording(true);
    } catch {
      setError(t.mic_unavailable);
    }
  };

  const stopRecording = () => {
    if (mediaRef.current && isRecording) {
      mediaRef.current.stop();
      setIsRecording(false);
    }
  };

  // ── Submit to /voice/tutor ────────────────────────────────────────────────

  const submitVoice = async (blob: Blob) => {
    if (!pdfSessionId) return;
    setLoading(true);
    try {
      const res = await voiceTutor(
        pdfSessionId,
        blob,
        currentPage,
        pageText,
        "auto"
      );

      const safeDecode = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };
      appendMessage({ role: "user", text: safeDecode(res.transcription) });
      appendMessage({ role: "assistant", text: safeDecode(res.response) });

      if (liveRef.current) {
        liveRef.current.textContent = `${t.tutor}: ${safeDecode(res.response)}`;
      }

      // Play the returned audio blob
      const url = URL.createObjectURL(res.audioBlob);
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => URL.revokeObjectURL(url);
      audio.play().catch(() => {});

      // Auto-advance page after a brief delay so audio starts first
      if (res.shouldScroll) {
        setTimeout(() => nextPage(), 500);
      }
    } catch (err: any) {
      setError(err.message ?? "Voice tutor error");
    } finally {
      setLoading(false);
    }
  };

  // ── Spacebar PTT (when mic button is focused) ─────────────────────────────

  useEffect(() => {
    const micId = `${panelId}-mic`;
    const down = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        !isRecording &&
        !loading &&
        document.activeElement?.id === micId
      ) {
        e.preventDefault();
        startRecording();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space" && isRecording) {
        e.preventDefault();
        stopRecording();
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording, loading, pdfSessionId]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <section aria-labelledby={`${panelId}-heading`} className="sv-panel">
      <h2 id={`${panelId}-heading`} className="sv-panel__title">
        {t.heading}
      </h2>

      {/* Hidden assertive live region for screen readers */}
      <p
        ref={liveRef}
        className="sr-only"
        aria-live="assertive"
        aria-atomic="true"
      />

      {/* Session controls */}
      <div className="field-row assistant-topbar">
        {pdfSessionId && (
          <button
            type="button"
            onClick={clearSession}
            className="sv-btn sv-btn--sm"
            aria-label={t.new_session}
          >
            ↺ {t.new_session}
          </button>
        )}
      </div>

      {/* ── Upload area — shown until PDF is loaded ── */}
      {!pdfSessionId && (
        <div className="upload-area">
          <label htmlFor={`${panelId}-file`} className="field-label">
            {t.upload_label}
          </label>
          <input
            id={`${panelId}-file`}
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleFileInput}
            disabled={uploading}
            className="sv-file-input"
            aria-busy={uploading}
          />
          {uploading && (
            <p role="status" aria-live="polite" className="loading-text">
              {t.uploading}
            </p>
          )}
        </div>
      )}

      {/* ── PDF Viewer + conversation — shown after upload ── */}
      {pdfSessionId && pdfFile && (
        <>
          <PDFViewer
            file={pdfFile}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />

          {/* Conversation log */}
          <div
            role="log"
            aria-label="Tutor conversation"
            aria-live="polite"
            className="conversation-log"
          >
            {messages.length === 0 && (
              <p className="conversation-empty">{t.pdf_loaded}</p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`message message--${m.role}`}
                role="article"
                aria-label={`${m.role === "user" ? t.you : t.tutor}: ${m.text}`}
              >
                <span className="message__role" aria-hidden="true">
                  {m.role === "user" ? "👤" : "📖"}
                </span>
                <div className="message__body">
                  <strong className="message__sender">
                    {m.role === "user" ? t.you : t.tutor}
                  </strong>
                  <p>{m.text}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {loading && (
            <p role="status" aria-live="polite" className="loading-text">
              {t.thinking}
            </p>
          )}

          {/* PTT button */}
          <div className="assistant-controls">
            <p id={`${panelId}-mic-desc`} className="panel-hint">
              {t.pdf_loaded}
            </p>
            <button
              id={`${panelId}-mic`}
              type="button"
              onPointerDown={startRecording}
              onPointerUp={stopRecording}
              onPointerLeave={stopRecording}
              disabled={loading}
              aria-pressed={isRecording}
              aria-describedby={`${panelId}-mic-desc`}
              aria-label={isRecording ? t.release_to_send : t.hold_to_ask}
              className={`mic-btn mic-btn--large${isRecording ? " mic-btn--active" : ""}`}
            >
              <span aria-hidden="true">{isRecording ? "⏹" : "🎙"}</span>
              <span className="mic-btn__label">
                {isRecording ? t.release_to_send : t.hold_to_ask}
              </span>
            </button>
          </div>
        </>
      )}

      {error && (
        <div role="alert" className="sv-error">
          <strong>{t.error}:</strong> {error}
        </div>
      )}
    </section>
  );
};
