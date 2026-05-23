/**
 * Index — Main Page
 *
 * Accessibility architecture:
 * 1. Skip navigation link (first focusable element) — jumps to main content
 * 2. VoiceWalkthrough auto-plays on load, keyboard: H=replay, Esc=stop
 * 3. useVoiceNavigation: always-on voice commands to switch panels
 * 4. Three landmark sections: Transcription, Braille, Voice Assistant
 * 5. All state changes announced via aria-live regions
 */

import { useCallback, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useVoiceWalkthrough } from "@/hooks/useVoiceWalkthrough";
import { useVoiceNavigation, NavCommand } from "@/hooks/useVoiceNavigation";
import { VoiceWalkthrough } from "@/components/VoiceWalkthrough";
import { TranscriptionPanel } from "@/components/TranscriptionPanel";
import { BraillePanel } from "@/components/BraillePanel";
import { AssistantPanel } from "@/components/AssistantPanel";
import { PDFTutorPanel } from "@/components/PDFTutorPanel";
import AccessibilityControls from "@/components/AccessibilityControls";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Footer from "@/components/Footer";

type Tab = "transcribe" | "braille" | "assistant" | "pdf";

const TAB_LABELS: Record<string, Record<Tab, string>> = {
  en: { transcribe: "Transcription", braille: "Braille Converter", assistant: "Voice Assistant", pdf: "PDF Tutor" },
  hi: { transcribe: "ट्रांसक्रिप्शन", braille: "ब्रेल कन्वर्टर", assistant: "वॉइस असिस्टेंट", pdf: "PDF शिक्षक" },
  mr: { transcribe: "ट्रान्सक्रिप्शन", braille: "ब्रेल कन्व्हर्टर", assistant: "व्हॉइस असिस्टंट", pdf: "PDF शिक्षक" },
};

const APP_NAMES: Record<string, string> = {
  en: "Sparsh Vaani",
  hi: "स्पर्श वाणी",
  mr: "स्पर्श वाणी",
};

const APP_TAGLINES: Record<string, string> = {
  en: "Bridging sound and touch for every learner",
  hi: "हर सीखने वाले के लिए ध्वनि और स्पर्श को जोड़ना",
  mr: "प्रत्येक शिकणाऱ्यासाठी ध्वनी आणि स्पर्श यांना जोडणे",
};

export default function Index() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>("transcribe");

  const walkthrough = useVoiceWalkthrough(language, true);

  const handleNavCommand = useCallback((cmd: NavCommand) => {
    if (!cmd) return;
    if (cmd === "transcribe") setActiveTab("transcribe");
    else if (cmd === "braille") setActiveTab("braille");
    else if (cmd === "assistant") setActiveTab("assistant");
    else if (cmd === "help") walkthrough.play(language);
    else if (cmd === "stop") walkthrough.stop();
    // lang: commands are handled by LanguageSwitcher / context
  }, [language, walkthrough]);  // eslint-disable-line react-hooks/exhaustive-deps

  useVoiceNavigation(language, handleNavCommand, true);

  const labels = TAB_LABELS[language] ?? TAB_LABELS.en;

  return (
    <>
      {/* ── Skip navigation (first focusable element on the page) ── */}
      <a href="#main-content" className="skip-nav">
        Skip to main content
      </a>

      {/* ── Voice walkthrough bar ── */}
      <VoiceWalkthrough
        state={walkthrough.state}
        language={language}
        onPlay={() => walkthrough.play(language)}
        onPause={walkthrough.pause}
        onResume={walkthrough.resume}
        onStop={walkthrough.stop}
      />

      {/* ── Top bar ── */}
      <header className="app-header" role="banner">
        <div className="app-header__inner">
          <div className="app-logo" aria-label={`${APP_NAMES[language]} logo`}>
            <span aria-hidden="true" className="app-logo__icon">⠋</span>
            <span className="app-logo__name">{APP_NAMES[language]}</span>
          </div>
          <div className="app-header__controls">
            <LanguageSwitcher />
            <AccessibilityControls />
          </div>
        </div>
        <p className="app-tagline">{APP_TAGLINES[language]}</p>
      </header>

      {/* ── Main content ── */}
      <main id="main-content" className="app-main" tabIndex={-1}>

        {/* Voice navigation status indicator */}
        <p className="voice-nav-hint" aria-live="off">
          <span aria-hidden="true">🎙</span>{" "}
          {language === "hi"
            ? 'वॉइस कमांड: "ट्रांसक्रिप्शन", "ब्रेल", "सहायक", "मदद"'
            : language === "mr"
            ? 'व्हॉइस कमांड: "ट्रान्सक्रिप्शन", "ब्रेल", "सहाय्यक", "मदत"'
            : 'Voice commands: "transcribe", "braille", "assistant", "help"'}
        </p>

        {/* ── Section tabs ── */}
        <div
          role="tablist"
          aria-label={
            language === "hi"
              ? "मुख्य सुविधाएं"
              : language === "mr"
              ? "मुख्य वैशिष्ट्ये"
              : "Main features"
          }
          className="main-tabs"
        >
          {(["transcribe", "braille", "assistant", "pdf"] as Tab[]).map((tab) => (
            <button
              key={tab}
              role="tab"
              id={`main-tab-${tab}`}
              aria-selected={activeTab === tab}
              aria-controls={`main-panel-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={`main-tab${activeTab === tab ? " main-tab--active" : ""}`}
            >
              <span aria-hidden="true">
                {tab === "transcribe" ? "🎤" : tab === "braille" ? "⠿" : tab === "assistant" ? "🤖" : "📖"}
              </span>{" "}
              {labels[tab]}
            </button>
          ))}
        </div>

        {/* ── Panel: Transcription ── */}
        <div
          id="main-panel-transcribe"
          role="tabpanel"
          aria-labelledby="main-tab-transcribe"
          hidden={activeTab !== "transcribe"}
          className="main-panel"
        >
          <TranscriptionPanel language={language} />
        </div>

        {/* ── Panel: Braille ── */}
        <div
          id="main-panel-braille"
          role="tabpanel"
          aria-labelledby="main-tab-braille"
          hidden={activeTab !== "braille"}
          className="main-panel"
        >
          <BraillePanel language={language} />
        </div>

        {/* ── Panel: Voice Assistant ── */}
        <div
          id="main-panel-assistant"
          role="tabpanel"
          aria-labelledby="main-tab-assistant"
          hidden={activeTab !== "assistant"}
          className="main-panel"
        >
          <AssistantPanel language={language} />
        </div>

        {/* ── Panel: PDF Tutor ── */}
        <div
          id="main-panel-pdf"
          role="tabpanel"
          aria-labelledby="main-tab-pdf"
          hidden={activeTab !== "pdf"}
          className="main-panel"
        >
          <PDFTutorPanel language={language} />
        </div>

      </main>

      <Footer />
    </>
  );
}
