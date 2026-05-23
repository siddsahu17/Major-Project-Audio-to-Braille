import { useState, useRef, useCallback, useEffect } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { voiceTutor } from "@/lib/api";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

type Status = "idle" | "listening" | "thinking" | "speaking";

const statusCopy: Record<Status, { label: string; tone: string }> = {
  idle: { label: "Idle", tone: "Click the mic button or press Space to speak to SparshVaani." },
  listening: { label: "Listening", tone: "Go ahead, I'm listening to you." },
  thinking: { label: "Thinking", tone: "Analyzing your request..." },
  speaking: { label: "Speaking", tone: "Playing response..." },
};

interface Props {
  sessionId: string | null;
  currentPage: number;
  totalPages: number;
  currentPageText: string;
  onScrollDown: () => void;
  onScrollToPage: (page: number) => void;
  onStatusChange?: (status: Status) => void;
}

export function AIAssistant({
  sessionId,
  currentPage,
  totalPages,
  currentPageText,
  onScrollDown,
  onScrollToPage,
  onStatusChange,
}: Props) {
  const [status, setStatusInternal] = useState<Status>("idle");

  const setStatus = useCallback(
    (s: Status) => {
      setStatusInternal(s);
      onStatusChange?.(s);
    },
    [onStatusChange],
  );

  const [language, setLanguage] = useState("auto");
  const [error, setError] = useState<string | null>(null);

  const messages = useSessionStore((s) => s.messages);
  const appendMessage = useSessionStore((s) => s.appendMessage);
  const studentClass = useSessionStore((s) => s.studentClass);
  const setStudentClass = useSessionStore((s) => s.setStudentClass);
  const loadChapter = useSessionStore((s) => s.loadChapter);

  const fallbackSessionIdRef = useRef<string | null>(null);
  if (!fallbackSessionIdRef.current) {
    fallbackSessionIdRef.current = "sv_sess_" + Math.random().toString(36).substring(2, 15);
  }

  // Greeting flow
  useEffect(() => {
    if (studentClass === null && messages.length === 0) {
      appendMessage({
        role: "tutor",
        text: "Hello! I am Sparsh Vaani, your science AI tutor. What class are you in? (Class 3 to 10)",
      });
    }
  }, [studentClass, messages.length, appendMessage]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const micBtnRef = useRef<HTMLButtonElement>(null);

  const isActive = status !== "idle";

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  const playOnboarding = useCallback(async (forcedLanguage?: string) => {
    try {
      const activeLanguage = forcedLanguage || language || "en";
      const fetchLang = activeLanguage === "auto" ? "en" : activeLanguage;
      setStatus("thinking");
      const response = await fetch(
        `${BASE_URL}/api/onboarding/onboarding-audio?language=${fetchLang}`
      );
      if (!response.ok) {
        setStatus("idle");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      stopAudio();
      const audio = new Audio(url);
      audioRef.current = audio;
      setStatus("speaking");
      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (audioRef.current === audio) {
          audioRef.current = null;
          setStatus("idle");
        }
        sessionStorage.setItem("onboarding_played", "true");
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        if (audioRef.current === audio) {
          audioRef.current = null;
          setStatus("idle");
        }
      };
      audio.play().catch(() => setStatus("idle"));
    } catch (error) {
      console.error("Onboarding audio failed:", error);
      setStatus("idle");
    }
  }, [language, stopAudio, setStatus]);

  // Autoplay onboarding on first user interaction with tab
  useEffect(() => {
    const hasPlayed = sessionStorage.getItem("onboarding_played");
    if (hasPlayed) return;

    const playOnFirstInteraction = () => {
      playOnboarding();
      document.removeEventListener("click", playOnFirstInteraction);
      document.removeEventListener("keydown", playOnFirstInteraction);
    };

    document.addEventListener("click", playOnFirstInteraction);
    document.addEventListener("keydown", playOnFirstInteraction);

    return () => {
      document.removeEventListener("click", playOnFirstInteraction);
      document.removeEventListener("keydown", playOnFirstInteraction);
    };
  }, [playOnboarding]);



  const sendAudio = useCallback(
    async (blob: Blob) => {
      const activeSessionId = sessionId || fallbackSessionIdRef.current;
      if (!activeSessionId) {
        setError("Unable to initialize chat session.");
        setStatus("idle");
        return;
      }
      console.log("sendAudio starting: activeSessionId =", activeSessionId, "blobSize =", blob.size, "language =", language);
      setStatus("thinking");
      setError(null);
      try {
        console.log("Calling voiceTutor API at", BASE_URL);
        const result = await voiceTutor(
          activeSessionId,
          blob,
          currentPage,
          currentPageText,
          language,
          totalPages,
          studentClass,
        );

        if (result.transcription) {
          appendMessage({ role: "user", text: result.transcription });
        }
        if (result.response) {
          appendMessage({ role: "tutor", text: result.response });
        }

        // Handle dynamically voice-loaded PDF textbook
        if (result.loadPdf && result.pdfSessionId && result.pdfFilename && result.pdfClass) {
          const pdfUrl = `${BASE_URL}/pdf/serve/${result.pdfSessionId}`;
          loadChapter(
            result.pdfSessionId,
            result.pdfFilename,
            pdfUrl,
            result.pdfTotalPages || 1,
          );

          useSessionStore.getState().setAutoLoadedChapter({
            filename: result.pdfFilename,
            class_number: result.pdfClass,
            chapter_title: result.pdfFilename,
            session_id: result.pdfSessionId,
          });
        }

        // Keep local studentClass updated in store
        if (result.pdfClass !== null && result.pdfClass !== undefined) {
          setStudentClass(result.pdfClass);
        }

        if (result.shouldScroll) {
          if (result.scrollToPage !== null) {
            onScrollToPage(result.scrollToPage);
          } else {
            onScrollDown();
          }
        }

        if (result.language && result.language !== language) {
          setLanguage(result.language);
        }

        const transcriptLower = (result.transcription || "").toLowerCase().trim();
        const isLangChange = 
          transcriptLower.includes("change language") ||
          transcriptLower.includes("language change") ||
          transcriptLower.includes("भाषा बदला") ||
          transcriptLower.includes("भाषा बदलो") ||
          transcriptLower.includes("मराठीत बोला") ||
          transcriptLower.includes("मराठी") ||
          transcriptLower.includes("हिंदी") ||
          transcriptLower.includes("english");

        if (isLangChange) {
          playOnboarding(result.language);
          return;
        }

        setStatus("speaking");
        const url = URL.createObjectURL(result.audioBlob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          audioRef.current = null;
          setStatus("idle");
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          audioRef.current = null;
          setStatus("idle");
        };
        audio.play().catch(() => setStatus("idle"));
      } catch (err) {
        console.error("voiceTutor API error:", err);
        setError(err instanceof Error ? err.message : "Something went wrong.");
        setStatus("idle");
      }
    },
    [
      sessionId,
      currentPage,
      currentPageText,
      language,
      totalPages,
      studentClass,
      appendMessage,
      loadChapter,
      setStudentClass,
      onScrollDown,
      onScrollToPage,
      setStatus,
      playOnboarding,
    ],
  );

  const startRecording = useCallback(async () => {
    console.log("startRecording: status =", status);
    if (status !== "idle") return;
    stopAudio();
    setError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("navigator.mediaDevices.getUserMedia is not supported or available on this browser/connection (requires localhost or HTTPS).");
      }
      console.log("Requesting microphone stream...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("Microphone stream acquired. Creating MediaRecorder...");
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        console.log("MediaRecorder data available: size =", e.data.size);
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        console.log("MediaRecorder stopped. Processing chunks...");
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType });
        console.log("Acquired audio blob size =", blob.size, "mimeType =", mr.mimeType);
        if (blob.size < 100) {  // Lowered size threshold to be safer and avoid quick-click rejection
          console.warn("Audio blob size too small, rejecting.");
          setError("Audio too short. Please speak a bit longer.");
          setStatus("idle");
          return;
        }
        sendAudio(blob);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setStatus("listening");
      console.log("MediaRecorder started, status set to listening.");
    } catch (err) {
      console.error("startRecording failed:", err);
      setError(err instanceof Error ? err.message : "Microphone access denied or not supported.");
      setStatus("idle");
    }
  }, [status, stopAudio, sendAudio, setStatus]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  }, []);

  const toggleRecording = useCallback(() => {
    console.log("toggleRecording clicked: current status =", status);
    if (status === "idle") {
      startRecording();
    } else if (status === "listening") {
      stopRecording();
    } else if (status === "speaking") {
      stopAudio();
      setStatus("idle");
    }
  }, [status, startRecording, stopRecording, stopAudio, setStatus]);

  // Global spacebar recording toggle
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        const activeEl = document.activeElement;
        const isTyping = activeEl && (
          activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.tagName === "SELECT" ||
          activeEl.getAttribute("contenteditable") === "true"
        );
        if (!isTyping) {
          e.preventDefault();
          toggleRecording();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleRecording]);

  const copy = statusCopy[status];

  return (
    <aside
      className="w-full lg:w-[22%] lg:min-w-[300px] lg:max-w-[380px] h-full border-r border-border glass-strong flex flex-col z-20 overflow-hidden"
      aria-label="AI assistant"
    >
      {/* Orb + status */}
      <div className="px-5 pt-6 pb-4 flex flex-col items-center gap-4 relative shrink-0">
        <div className="absolute inset-0 bg-neon-cyan/5 blur-3xl rounded-full pointer-events-none" aria-hidden />

        <div className="relative flex items-center justify-center">
          {isActive && (
            <div className="absolute size-32 rounded-full hologram-bg animate-breathe opacity-60" aria-hidden />
          )}
          <div className="relative size-24 rounded-full hologram-bg p-[2px] glow-cyan">
            <div className="size-full rounded-full bg-background/90 grid place-items-center backdrop-blur-xl">
              <div className="size-14 rounded-full border border-white/20 bg-white/5 grid place-items-center">
                <div className="size-3 rounded-full bg-neon-cyan shadow-[0_0_16px_var(--neon-cyan)] animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <span
            className={`px-3 py-1 rounded-full border text-[10px] font-mono uppercase tracking-[0.2em] ${
              status === "listening"
                ? "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan"
                : status === "speaking"
                  ? "border-neon-purple/40 bg-neon-purple/10 text-neon-purple"
                  : status === "thinking"
                    ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-300"
                    : "border-border bg-white/5 text-muted-foreground"
            }`}
          >
            {copy.label}
          </span>
          <p className="text-center text-xs text-muted-foreground leading-relaxed max-w-[26ch]">
            {copy.tone}
          </p>
          {error && (
            <p className="text-center text-[11px] text-red-400 leading-relaxed max-w-[26ch]" role="alert">
              {error}
            </p>
          )}
        </div>

        {/* Waveform */}
        <div className="flex items-center justify-center gap-1.5 h-8" aria-hidden>
          {[4, 8, 12, 6, 10, 7, 11, 5].map((h, i) => (
            <div
              key={i}
              className={`w-1 rounded-full ${i % 3 === 0 ? "bg-neon-purple" : "bg-neon-cyan"} ${
                isActive ? "animate-wave-bar" : "opacity-30"
              }`}
              style={{ height: `${h * 2.5}px`, animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </div>

      {/* Conversation — scrollable, flex-1 so it fills remaining space */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 space-y-3 pb-2">
        <div className="py-2 sticky top-0 glass-strong z-10 -mx-5 px-5 border-y border-border">
          <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
            Conversation
          </span>
        </div>
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6 leading-relaxed">
            Click the mic button or press Space to start a conversation with SparshVaani.
          </p>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`p-3 rounded-2xl text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan ml-6"
                  : "bg-white/5 border border-border text-foreground/80"
              }`}
            >
              {msg.text}
            </div>
          ))
        )}
      </div>

      {/* Settings — language only, fixed at bottom */}
      <div className="px-5 py-3 border-t border-border shrink-0 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="lang" className="text-[11px] text-foreground/80 whitespace-nowrap">
            Language
          </label>
          <select
            id="lang"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{ colorScheme: "dark" }}
            className="bg-zinc-900 border border-border rounded-lg text-[11px] py-1.5 px-2 text-white focus:outline-none focus:border-neon-cyan/50"
          >
            <option value="auto" className="bg-zinc-900 text-white">Auto Detect</option>
            <option value="en" className="bg-zinc-900 text-white">English</option>
            <option value="hi" className="bg-zinc-900 text-white">हिन्दी</option>
            <option value="mr" className="bg-zinc-900 text-white">मराठी</option>
          </select>
        </div>
        <button
          onClick={() => {
            sessionStorage.removeItem("onboarding_played");
            playOnboarding();
          }}
          className="w-full py-2 rounded-lg border border-border text-[10px] font-mono uppercase tracking-wider bg-white/5 hover:bg-white/10 hover:border-neon-cyan/40 transition-colors text-muted-foreground hover:text-white cursor-pointer"
          aria-label="Replay navigation instructions"
        >
          Replay Instructions
        </button>
      </div>

      {/* PTT mic button */}
      <div className="px-5 pb-5 pt-2 shrink-0">
        <button
          ref={micBtnRef}
          onClick={toggleRecording}
          disabled={status === "thinking"}
          aria-pressed={status === "listening"}
          aria-label={
            status === "listening" ? "Click to stop recording"
            : status === "speaking" ? "Click to stop audio"
            : "Click to speak"
          }
          className={`w-full py-4 rounded-2xl hologram-bg flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-transform glow-cyan disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer ${
            status === "speaking" ? "border border-neon-purple/40" : ""
          }`}
        >
          <span className={`size-2.5 rounded-full bg-background ${status === "listening" || status === "speaking" ? "animate-pulse" : ""}`} />
          <span className="font-display font-bold text-sm tracking-[0.2em] uppercase text-primary-foreground">
            {status === "listening"
              ? "Stop recording"
              : status === "thinking"
                ? "Processing..."
                : status === "speaking"
                  ? "Stop audio"
                  : "Click to speak"}
          </span>
        </button>
        <p className="text-center font-mono text-[9px] text-muted-foreground mt-1.5 uppercase tracking-widest">
          or press spacebar
        </p>
      </div>
    </aside>
  );
}
