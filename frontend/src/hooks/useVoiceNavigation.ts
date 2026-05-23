/**
 * useVoiceNavigation
 * Provides global voice command recognition using the Web Speech API.
 * The user can navigate and trigger features entirely hands-free.
 *
 * Recognized commands (language-agnostic keywords + English words):
 *   "transcribe" / "ट्रांसक्रिप्शन" / "ट्रान्सक्रिप्शन"  → switch to Transcription tab
 *   "braille" / "ब्रेल"                                   → switch to Braille tab
 *   "assistant" / "सहायक" / "सहाय्यक"                    → switch to Assistant tab
 *   "help" / "मदद" / "मदत"                               → replay walkthrough
 *   "stop" / "रुको" / "थांबा"                            → stop current speech
 *   "english" → set language to English
 *   "hindi" / "हिंदी" → set language to Hindi
 *   "marathi" / "मराठी" → set language to Marathi
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Language } from "@/locales/translations";

export type NavCommand =
  | "transcribe"
  | "braille"
  | "assistant"
  | "help"
  | "stop"
  | "lang:en"
  | "lang:hi"
  | "lang:mr"
  | null;

const COMMAND_MAP: [RegExp, NavCommand][] = [
  [/transcri|ट्रांसक्रिप्ट|ट्रान्सक्रिप्ट/i, "transcribe"],
  [/braille|ब्रेल/i, "braille"],
  [/assist|सहायक|सहाय्यक/i, "assistant"],
  [/help|मदद|मदत/i, "help"],
  [/stop|रुको|थांबा/i, "stop"],
  [/english|अंग्रेज़ी|इंग्रजी/i, "lang:en"],
  [/hindi|हिंदी/i, "lang:hi"],
  [/marathi|मराठी/i, "lang:mr"],
];

export function useVoiceNavigation(
  language: Language,
  onCommand: (cmd: NavCommand) => void,
  enabled = true
) {
  const recognitionRef = useRef<any>(null);
  const [listening, setListening] = useState(false);

  const parseCommand = useCallback((transcript: string): NavCommand => {
    for (const [pattern, cmd] of COMMAND_MAP) {
      if (pattern.test(transcript)) return cmd;
    }
    return null;
  }, []);

  const start = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const r = new SpeechRecognition();
    r.lang = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN";
    r.continuous = true;
    r.interimResults = false;

    r.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      const cmd = parseCommand(transcript);
      if (cmd) onCommand(cmd);
    };

    r.onend = () => {
      setListening(false);
      // Auto-restart after brief pause so navigation is always-on
      if (enabled) {
        setTimeout(() => r.start(), 300);
      }
    };

    r.onerror = (e: any) => {
      if (e.error !== "no-speech") {
        setListening(false);
      }
    };

    recognitionRef.current = r;
    r.start();
    setListening(true);
  }, [enabled, language, onCommand, parseCommand]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  useEffect(() => {
    if (enabled) {
      start();
    } else {
      stop();
    }
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { listening };
}
