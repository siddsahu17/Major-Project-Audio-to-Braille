/**
 * TranscriptionPanel
 * Modes: record live audio | upload file | YouTube URL
 * Full ARIA: aria-live result region, labelled controls, focus management
 */

import React, { useId, useRef, useState } from "react";
import { Language } from "@/locales/translations";
import { transcribeAudio, transcribeYouTube, TranscriptionResult } from "@/lib/api";
import { VideoNotesPanel } from "./VideoNotesPanel";

const T: Record<Language, Record<string, string>> = {
  en: {
    heading: "Speech Transcription",
    tab_record: "Record Voice",
    tab_upload: "Upload File",
    tab_youtube: "YouTube URL",
    record_desc: "Press the microphone button or Space to start recording. Press again to stop.",
    record_start: "Start recording",
    record_stop: "Stop recording",
    recording_status: "Recording… speak now",
    upload_label: "Choose an audio or video file",
    upload_hint: "Accepted: MP3, WAV, OGG, MP4, MOV, WebM",
    upload_btn: "Transcribe file",
    yt_label: "YouTube video URL",
    yt_placeholder: "https://www.youtube.com/watch?v=…",
    yt_btn: "Transcribe video",
    lang_label: "Audio language",
    lang_auto: "Auto-detect",
    processing: "Transcribing, please wait…",
    result_heading: "Transcription Result",
    braille_heading: "Braille Output",
    copy: "Copy text",
    copied: "Copied!",
    error: "Error",
    detected_lang: "Detected language",
  },
  hi: {
    heading: "भाषण ट्रांसक्रिप्शन",
    tab_record: "आवाज रिकॉर्ड करें",
    tab_upload: "फ़ाइल अपलोड करें",
    tab_youtube: "YouTube URL",
    record_desc: "रिकॉर्डिंग शुरू करने के लिए माइक्रोफ़ोन बटन या Space दबाएं। फिर से दबाने पर रुकेगा।",
    record_start: "रिकॉर्डिंग शुरू करें",
    record_stop: "रिकॉर्डिंग रोकें",
    recording_status: "रिकॉर्डिंग हो रही है… अभी बोलें",
    upload_label: "एक ऑडियो या वीडियो फ़ाइल चुनें",
    upload_hint: "स्वीकृत: MP3, WAV, OGG, MP4, MOV, WebM",
    upload_btn: "फ़ाइल ट्रांसक्राइब करें",
    yt_label: "YouTube वीडियो URL",
    yt_placeholder: "https://www.youtube.com/watch?v=…",
    yt_btn: "वीडियो ट्रांसक्राइब करें",
    lang_label: "ऑडियो भाषा",
    lang_auto: "स्वचालित पहचान",
    processing: "ट्रांसक्राइब हो रहा है, कृपया प्रतीक्षा करें…",
    result_heading: "ट्रांसक्रिप्शन परिणाम",
    braille_heading: "ब्रेल आउटपुट",
    copy: "टेक्स्ट कॉपी करें",
    copied: "कॉपी हो गया!",
    error: "त्रुटि",
    detected_lang: "पहचानी गई भाषा",
  },
  mr: {
    heading: "भाषण ट्रान्सक्रिप्शन",
    tab_record: "आवाज रेकॉर्ड करा",
    tab_upload: "फाइल अपलोड करा",
    tab_youtube: "YouTube URL",
    record_desc: "रेकॉर्डिंग सुरू करण्यासाठी मायक्रोफोन बटण किंवा Space दाबा. पुन्हा दाबल्यावर थांबेल.",
    record_start: "रेकॉर्डिंग सुरू करा",
    record_stop: "रेकॉर्डिंग थांबवा",
    recording_status: "रेकॉर्डिंग होत आहे… आता बोला",
    upload_label: "ऑडिओ किंवा व्हिडिओ फाइल निवडा",
    upload_hint: "स्वीकृत: MP3, WAV, OGG, MP4, MOV, WebM",
    upload_btn: "फाइल ट्रान्सक्राइब करा",
    yt_label: "YouTube व्हिडिओ URL",
    yt_placeholder: "https://www.youtube.com/watch?v=…",
    yt_btn: "व्हिडिओ ट्रान्सक्राइब करा",
    lang_label: "ऑडिओ भाषा",
    lang_auto: "स्वयं-ओळख",
    processing: "ट्रान्सक्राइब होत आहे, कृपया प्रतीक्षा करा…",
    result_heading: "ट्रान्सक्रिप्शन निकाल",
    braille_heading: "ब्रेल आउटपुट",
    copy: "मजकूर कॉपी करा",
    copied: "कॉपी केले!",
    error: "त्रुटी",
    detected_lang: "ओळखलेली भाषा",
  },
};

type Mode = "record" | "upload" | "youtube";

interface Props {
  language: Language;
}

export const TranscriptionPanel: React.FC<Props> = ({ language }) => {
  const t = T[language];
  const panelId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [mode, setMode] = useState<Mode>("record");
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ytUrl, setYtUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioLang, setAudioLang] = useState<string>("auto");
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // ── Recording ────────────────────────────────────────────────────────────

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRef.current?.stop();
      setIsRecording(false);
      return;
    }
    setError("");
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await submit(blob, "audio.webm");
      };
      recorder.start();
      mediaRef.current = recorder;
      setIsRecording(true);
    } catch {
      setError("Microphone access denied. Please allow microphone permissions.");
    }
  };

  // ── File upload ──────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] ?? null);
    setResult(null);
    setError("");
  };

  const submitFile = async () => {
    if (!selectedFile) return;
    await submit(selectedFile, selectedFile.name);
  };

  // ── YouTube ──────────────────────────────────────────────────────────────

  const submitYoutube = async () => {
    if (!ytUrl.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await transcribeYouTube(ytUrl.trim(), audioLang);
      setResult(res);
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // ── Common submit ────────────────────────────────────────────────────────

  const submit = async (blob: Blob, filename: string) => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const file = new File([blob], filename);
      const res = await transcribeAudio(file, audioLang);
      setResult(res);
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const copyText = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Keyboard: Space toggles recording ────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " && mode === "record") {
      e.preventDefault();
      toggleRecording();
    }
  };

  const tabClass = (m: Mode) =>
    `panel-tab${mode === m ? " panel-tab--active" : ""}`;

  return (
    <section
      aria-labelledby={`${panelId}-heading`}
      className="sv-panel"
      onKeyDown={handleKeyDown}
    >
      <h2 id={`${panelId}-heading`} className="sv-panel__title">
        <span aria-hidden="true">🎤</span> {t.heading}
      </h2>

      {/* Mode tabs */}
      <div role="tablist" aria-label={t.heading} className="panel-tabs">
        {(["record", "upload", "youtube"] as Mode[]).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            aria-controls={`${panelId}-panel-${m}`}
            id={`${panelId}-tab-${m}`}
            className={tabClass(m)}
            onClick={() => { setMode(m); setResult(null); setError(""); }}
          >
            {t[`tab_${m}` as keyof typeof t]}
          </button>
        ))}
      </div>

      {/* Language selector — always visible */}
      <div className="field-row">
        <label htmlFor={`${panelId}-lang`} className="field-label">
          {t.lang_label}
        </label>
        <select
          id={`${panelId}-lang`}
          value={audioLang}
          onChange={(e) => setAudioLang(e.target.value)}
          className="sv-select"
        >
          <option value="auto">{t.lang_auto}</option>
          <option value="en">English</option>
          <option value="hi">हिंदी</option>
          <option value="mr">मराठी</option>
        </select>
      </div>

      {/* ── Record panel ──────────────────────────────────────────────────── */}
      <div
        id={`${panelId}-panel-record`}
        role="tabpanel"
        aria-labelledby={`${panelId}-tab-record`}
        hidden={mode !== "record"}
      >
        <p id={`${panelId}-record-desc`} className="panel-hint">
          {t.record_desc}
        </p>
        <button
          type="button"
          onClick={toggleRecording}
          aria-pressed={isRecording}
          aria-describedby={`${panelId}-record-desc`}
          aria-label={isRecording ? t.record_stop : t.record_start}
          className={`mic-btn${isRecording ? " mic-btn--active" : ""}`}
        >
          <span aria-hidden="true">{isRecording ? "⏹" : "🎙"}</span>
          <span className="mic-btn__label">
            {isRecording ? t.record_stop : t.record_start}
          </span>
        </button>

        {isRecording && (
          <p role="status" aria-live="assertive" className="recording-indicator">
            <span aria-hidden="true" className="recording-dot" />
            {t.recording_status}
          </p>
        )}
      </div>

      {/* ── Upload panel ──────────────────────────────────────────────────── */}
      <div
        id={`${panelId}-panel-upload`}
        role="tabpanel"
        aria-labelledby={`${panelId}-tab-upload`}
        hidden={mode !== "upload"}
      >
        <div className="field-row">
          <label htmlFor={`${panelId}-file`} className="field-label">
            {t.upload_label}
          </label>
          <input
            id={`${panelId}-file`}
            ref={fileRef}
            type="file"
            accept="audio/*,video/*"
            aria-describedby={`${panelId}-file-hint`}
            onChange={handleFileChange}
            className="sv-file-input"
          />
          <p id={`${panelId}-file-hint`} className="panel-hint">
            {t.upload_hint}
          </p>
        </div>
        <button
          type="button"
          onClick={submitFile}
          disabled={!selectedFile || loading}
          className="sv-btn sv-btn--primary"
          aria-busy={loading}
        >
          {loading ? t.processing : t.upload_btn}
        </button>
      </div>

      {/* ── YouTube panel ─────────────────────────────────────────────────── */}
      <div
        id={`${panelId}-panel-youtube`}
        role="tabpanel"
        aria-labelledby={`${panelId}-tab-youtube`}
        hidden={mode !== "youtube"}
      >
        <div className="field-row">
          <label htmlFor={`${panelId}-yt`} className="field-label">
            {t.yt_label}
          </label>
          <input
            id={`${panelId}-yt`}
            type="url"
            value={ytUrl}
            onChange={(e) => setYtUrl(e.target.value)}
            placeholder={t.yt_placeholder}
            className="sv-input"
            aria-label={t.yt_label}
          />
        </div>
        <button
          type="button"
          onClick={submitYoutube}
          disabled={!ytUrl.trim() || loading}
          className="sv-btn sv-btn--primary"
          aria-busy={loading}
        >
          {loading ? t.processing : t.yt_btn}
        </button>
      </div>

      {/* ── Loading indicator ─────────────────────────────────────────────── */}
      {loading && (
        <div role="status" aria-live="polite" className="loading-bar">
          <div className="loading-bar__fill" />
          <span className="sr-only">{t.processing}</span>
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div role="alert" aria-live="assertive" className="sv-error">
          <strong>{t.error}:</strong> {error}
        </div>
      )}

      {/* ── Result ────────────────────────────────────────────────────────── */}
      {result && (
        <div aria-live="polite" aria-atomic="true" className="result-box">
          <div className="result-box__header">
            <h3>{t.result_heading}</h3>
            {result.language && (
              <span className="lang-badge">
                {t.detected_lang}: <strong>{result.language}</strong>
              </span>
            )}
            <button
              type="button"
              onClick={copyText}
              className="sv-btn sv-btn--sm"
              aria-label={copied ? t.copied : t.copy}
            >
              {copied ? "✓" : "⎘"} {copied ? t.copied : t.copy}
            </button>
          </div>
          <p className="result-text">{result.text}</p>

          {result.braille && (
            <>
              <h3 className="result-box__subheading">{t.braille_heading}</h3>
              <p className="braille-text" aria-label={`Braille: ${result.text}`}>
                {result.braille}
              </p>
            </>
          )}
        </div>
      )}

      {result && (
        <VideoNotesPanel
          language={language}
          transcript={result.text}
          detectedLanguage={result.language}
        />
      )}
    </section>
  );
};
