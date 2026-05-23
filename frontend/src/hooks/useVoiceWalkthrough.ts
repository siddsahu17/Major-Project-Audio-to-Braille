/**
 * useVoiceWalkthrough
 * Manages the tri-lingual (English / Hindi / Marathi) audio walkthrough
 * using the browser's Web Speech API SpeechSynthesis — zero network calls.
 *
 * The walkthrough fires once on first mount and can be re-triggered by the
 * user at any time (e.g., pressing "H" for Help).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Language } from "@/locales/translations";

export type WalkthroughState = "idle" | "playing" | "paused" | "done";

const SCRIPTS: Record<Language, string[]> = {
  en: [
    "Welcome to Sparsh Vaani — your accessible learning companion.",
    "This application helps you transcribe speech, convert text to Braille, and have a voice conversation with an AI assistant.",
    "Use the Tab key to navigate between sections. Press Enter or Space to activate any button.",
    "There are three main sections: Transcription, Braille Converter, and Voice Assistant.",
    "In Transcription, you can upload an audio file, paste a YouTube link, or record your voice directly.",
    "In Braille Converter, type or paste any text and receive its Braille equivalent instantly.",
    "In Voice Assistant, press Space or the microphone button, speak your question, and the assistant will answer aloud.",
    "At any time, press H to replay this walkthrough. Press Escape to stop. Enjoy learning!",
  ],
  hi: [
    "स्पर्श वाणी में आपका स्वागत है — आपका सुलभ शिक्षण साथी।",
    "यह एप्लिकेशन आपको भाषण को टेक्स्ट में बदलने, टेक्स्ट को ब्रेल में बदलने और एक AI सहायक से बात करने में मदद करती है।",
    "अनुभागों के बीच नेविगेट करने के लिए Tab कुंजी का उपयोग करें। किसी भी बटन को सक्रिय करने के लिए Enter या Space दबाएं।",
    "तीन मुख्य अनुभाग हैं: ट्रांसक्रिप्शन, ब्रेल कन्वर्टर, और वॉइस असिस्टेंट।",
    "ट्रांसक्रिप्शन में, आप एक ऑडियो फ़ाइल अपलोड कर सकते हैं, YouTube लिंक पेस्ट कर सकते हैं, या सीधे अपनी आवाज रिकॉर्ड कर सकते हैं।",
    "ब्रेल कन्वर्टर में, कोई भी टेक्स्ट लिखें या पेस्ट करें और तुरंत उसका ब्रेल प्राप्त करें।",
    "वॉइस असिस्टेंट में, Space या माइक्रोफ़ोन बटन दबाएं, अपना प्रश्न बोलें, और सहायक आपको जोर से जवाब देगा।",
    "किसी भी समय, इस वॉकथ्रू को फिर से सुनने के लिए H दबाएं। रोकने के लिए Escape दबाएं। खुशी से सीखें!",
  ],
  mr: [
    "स्पर्श वाणीमध्ये आपले स्वागत आहे — तुमचा सुलभ शिक्षण साथीदार.",
    "हे अ‍ॅप्लिकेशन तुम्हाला भाषण मजकुरात रूपांतरित करण्यास, मजकूर ब्रेलमध्ये बदलण्यास आणि AI सहाय्यकाशी संवाद साधण्यास मदत करते.",
    "विभागांमध्ये नेव्हिगेट करण्यासाठी Tab की वापरा. कोणताही बटण सक्रिय करण्यासाठी Enter किंवा Space दाबा.",
    "तीन मुख्य विभाग आहेत: ट्रान्सक्रिप्शन, ब्रेल कन्व्हर्टर, आणि व्हॉइस असिस्टंट.",
    "ट्रान्सक्रिप्शनमध्ये, तुम्ही ऑडिओ फाइल अपलोड करू शकता, YouTube लिंक पेस्ट करू शकता किंवा थेट आवाज रेकॉर्ड करू शकता.",
    "ब्रेल कन्व्हर्टरमध्ये, कोणताही मजकूर टाइप करा किंवा पेस्ट करा आणि त्याचे ब्रेल समकक्ष त्वरित मिळवा.",
    "व्हॉइस असिस्टंटमध्ये, Space किंवा मायक्रोफोन बटण दाबा, तुमचा प्रश्न बोला, आणि सहाय्यक मोठ्याने उत्तर देईल.",
    "कधीही, हा वॉकथ्रू पुन्हा ऐकण्यासाठी H दाबा. थांबवण्यासाठी Escape दाबा. आनंदाने शिका!",
  ],
};

const LANG_BCP47: Record<Language, string> = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
};

export function useVoiceWalkthrough(language: Language, autoStart = true) {
  const [state, setState] = useState<WalkthroughState>("idle");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const indexRef = useRef(0);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setState("idle");
    indexRef.current = 0;
  }, []);

  const speakLine = useCallback(
    (lines: string[], index: number, lang: Language) => {
      if (index >= lines.length) {
        setState("done");
        indexRef.current = 0;
        return;
      }

      const utterance = new SpeechSynthesisUtterance(lines[index]);
      utterance.lang = LANG_BCP47[lang];
      utterance.rate = 0.9;
      utterance.pitch = 1.0;

      utterance.onend = () => {
        indexRef.current = index + 1;
        speakLine(lines, index + 1, lang);
      };
      utterance.onerror = () => {
        setState("idle");
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    []
  );

  const play = useCallback(
    (lang?: Language) => {
      const activeLang = lang ?? language;
      window.speechSynthesis.cancel();
      setState("playing");
      indexRef.current = 0;
      speakLine(SCRIPTS[activeLang], 0, activeLang);
    },
    [language, speakLine]
  );

  const pause = useCallback(() => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setState("paused");
    }
  }, []);

  const resume = useCallback(() => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setState("playing");
    }
  }, []);

  // Auto-start once on mount (after a short delay so the page has settled)
  useEffect(() => {
    if (!autoStart) return;
    const timer = setTimeout(() => play(language), 800);
    return () => {
      clearTimeout(timer);
      window.speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-play when language changes mid-session
  useEffect(() => {
    if (state === "playing") {
      play(language);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Global keyboard shortcut: H = replay, Escape = stop
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === "h" &&
        !e.ctrlKey &&
        !e.metaKey &&
        (document.activeElement?.tagName === "BODY" ||
          document.activeElement?.tagName === "MAIN")
      ) {
        play(language);
      }
      if (e.key === "Escape") {
        stop();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [language, play, stop]);

  return { state, play, pause, resume, stop };
}
