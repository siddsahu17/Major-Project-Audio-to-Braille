/**
 * AssistantPanel
 * Push-to-Talk (spacebar / button) voice assistant.
 * Full pipeline: record → POST /assistant/chat/voice → play audio response.
 * Also supports text input for when Web Speech API is unavailable.
 * ARIA: assertive live region for transcription, polite for responses.
 */

import React, { useEffect, useId, useRef, useState } from "react";
import { Language } from "@/locales/translations";
import { chatVoice, chatText, AssistantResponse } from "@/lib/api";

const API_BASE = "http://localhost:8000";

const T: Record<Language, Record<string, string>> = {
  en: {
    heading: "Voice Assistant",
    desc: "Hold Space or press the microphone button to speak. Release to send.",
    hold_to_speak: "Hold to speak",
    release_to_send: "Release to send",
    processing: "Thinking…",
    or_type: "Or type a message",
    type_placeholder: "Type your question here…",
    send_btn: "Send",
    you: "You",
    assistant: "Assistant",
    new_session: "New conversation",
    error: "Error",
    mic_unavailable: "Microphone unavailable",
    lang_label: "Conversation language",
  },
  hi: {
    heading: "वॉइस असिस्टेंट",
    desc: "बोलने के लिए Space पकड़ें या माइक्रोफ़ोन बटन दबाएं। भेजने के लिए छोड़ें।",
    hold_to_speak: "बोलने के लिए पकड़ें",
    release_to_send: "भेजने के लिए छोड़ें",
    processing: "सोच रहा हूँ…",
    or_type: "या एक संदेश टाइप करें",
    type_placeholder: "यहाँ अपना प्रश्न लिखें…",
    send_btn: "भेजें",
    you: "आप",
    assistant: "सहायक",
    new_session: "नई बातचीत",
    error: "त्रुटि",
    mic_unavailable: "माइक्रोफ़ोन उपलब्ध नहीं",
    lang_label: "बातचीत की भाषा",
  },
  mr: {
    heading: "व्हॉइस असिस्टंट",
    desc: "बोलण्यासाठी Space दाबून ठेवा किंवा मायक्रोफोन बटण दाबा. पाठवण्यासाठी सोडा.",
    hold_to_speak: "बोलण्यासाठी धरा",
    release_to_send: "पाठवण्यासाठी सोडा",
    processing: "विचार करत आहे…",
    or_type: "किंवा संदेश टाइप करा",
    type_placeholder: "येथे तुमचा प्रश्न टाइप करा…",
    send_btn: "पाठवा",
    you: "तुम्ही",
    assistant: "सहाय्यक",
    new_session: "नवीन संभाषण",
    error: "त्रुटी",
    mic_unavailable: "मायक्रोफोन उपलब्ध नाही",
    lang_label: "संभाषणाची भाषा",
  },
};

interface Message {
  role: "user" | "assistant";
  text: string;
  audioFilename?: string;
}

interface Props {
  language: Language;
}

export const AssistantPanel: React.FC<Props> = ({ language }) => {
  const t = T[language];
  const panelId = useId();

  const [sessionId] = useState(() => crypto.randomUUID());
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [convLang, setConvLang] = useState<"en" | "hi" | "mr">(language as any);
  const [error, setError] = useState("");

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  // Sync language selector when parent language changes
  useEffect(() => {
    if (["en", "hi", "mr"].includes(language)) {
      setConvLang(language as any);
    }
  }, [language]);

  // ── Voice recording ───────────────────────────────────────────────────────

  const startRecording = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
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
    mediaRef.current?.stop();
    setIsRecording(false);
  };

  // ── Submit voice ──────────────────────────────────────────────────────────

  const submitVoice = async (blob: Blob) => {
    setLoading(true);
    try {
      const res: AssistantResponse = await chatVoice(sessionId, blob, convLang);
      appendMessages(res);
      playResponse(res.audio_filename);
    } catch (e: any) {
      setError(e.message ?? "Voice chat error");
    } finally {
      setLoading(false);
    }
  };

  // ── Submit text ───────────────────────────────────────────────────────────

  const submitText = async () => {
    if (!textInput.trim()) return;
    setLoading(true);
    setError("");
    const msg = textInput.trim();
    setTextInput("");
    try {
      const res: AssistantResponse = await chatText(sessionId, msg, convLang);
      appendMessages(res);
      playResponse(res.audio_filename);
    } catch (e: any) {
      setError(e.message ?? "Chat error");
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const appendMessages = (res: AssistantResponse) => {
    setMsgs((prev) => [
      ...prev,
      { role: "user", text: res.transcription },
      { role: "assistant", text: res.response, audioFilename: res.audio_filename },
    ]);
    // Update assertive live region so screen readers announce new content
    if (liveRef.current) {
      liveRef.current.textContent = `${t.assistant}: ${res.response}`;
    }
  };

  const playResponse = (filename: string) => {
    const url = `${API_BASE}/audio/${filename}`;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.play().catch(() => {});
  };

  // Spacebar PTT
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        !isRecording &&
        !loading &&
        document.activeElement?.id === panelId + "-mic"
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
  }, [isRecording, loading]);

  return (
    <section aria-labelledby={`${panelId}-heading`} className="sv-panel">
      <h2 id={`${panelId}-heading`} className="sv-panel__title">
        <span aria-hidden="true">🤖</span> {t.heading}
      </h2>

      {/* Hidden assertive live region for screen readers */}
      <p
        ref={liveRef}
        className="sr-only"
        aria-live="assertive"
        aria-atomic="true"
      />

      {/* Language + new session controls */}
      <div className="field-row assistant-topbar">
        <label htmlFor={`${panelId}-lang`} className="field-label">
          {t.lang_label}
        </label>
        <select
          id={`${panelId}-lang`}
          value={convLang}
          onChange={(e) => setConvLang(e.target.value as any)}
          className="sv-select"
        >
          <option value="en">English</option>
          <option value="hi">हिंदी</option>
          <option value="mr">मराठी</option>
        </select>
        <button
          type="button"
          onClick={() => setMsgs([])}
          className="sv-btn sv-btn--sm"
          aria-label={t.new_session}
        >
          ↺ {t.new_session}
        </button>
      </div>

      {/* Conversation transcript */}
      <div
        role="log"
        aria-label="Conversation"
        aria-live="polite"
        className="conversation-log"
      >
        {msgs.length === 0 && (
          <p className="conversation-empty">{t.desc}</p>
        )}
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`message message--${m.role}`}
            role="article"
            aria-label={`${m.role === "user" ? t.you : t.assistant}: ${m.text}`}
          >
            <span className="message__role" aria-hidden="true">
              {m.role === "user" ? "👤" : "🤖"}
            </span>
            <div className="message__body">
              <strong className="message__sender">
                {m.role === "user" ? t.you : t.assistant}
              </strong>
              <p>{m.text}</p>
              {m.role === "assistant" && m.audioFilename && (
                <button
                  type="button"
                  onClick={() => playResponse(m.audioFilename!)}
                  className="sv-btn sv-btn--sm replay-btn"
                  aria-label={`Replay: ${m.text}`}
                >
                  ▶ Replay
                </button>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Loading */}
      {loading && (
        <p role="status" aria-live="polite" className="loading-text">
          {t.processing}
        </p>
      )}

      {/* Error */}
      {error && (
        <div role="alert" className="sv-error">
          <strong>{t.error}:</strong> {error}
        </div>
      )}

      {/* Microphone PTT button */}
      <div className="assistant-controls">
        <p id={`${panelId}-mic-desc`} className="panel-hint">
          {t.desc}
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
          aria-label={isRecording ? t.release_to_send : t.hold_to_speak}
          className={`mic-btn mic-btn--large${isRecording ? " mic-btn--active" : ""}`}
        >
          <span aria-hidden="true">{isRecording ? "⏹" : "🎙"}</span>
          <span className="mic-btn__label">
            {isRecording ? t.release_to_send : t.hold_to_speak}
          </span>
        </button>

        {/* Text fallback */}
        <details className="text-fallback">
          <summary className="panel-hint">{t.or_type}</summary>
          <div className="field-row">
            <label htmlFor={`${panelId}-text`} className="sr-only">
              {t.or_type}
            </label>
            <input
              id={`${panelId}-text`}
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitText()}
              placeholder={t.type_placeholder}
              className="sv-input"
              disabled={loading}
            />
            <button
              type="button"
              onClick={submitText}
              disabled={!textInput.trim() || loading}
              className="sv-btn sv-btn--primary"
            >
              {t.send_btn}
            </button>
          </div>
        </details>
      </div>
    </section>
  );
};
