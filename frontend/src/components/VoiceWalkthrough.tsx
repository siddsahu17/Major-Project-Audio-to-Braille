/**
 * VoiceWalkthrough Component
 * Renders a persistent, keyboard-accessible control bar for the audio walkthrough.
 * Always visible at the top of the page — screen readers see it first.
 */

import React from "react";
import { WalkthroughState } from "@/hooks/useVoiceWalkthrough";
import { Language, translations } from "@/locales/translations";

interface Props {
  state: WalkthroughState;
  language: Language;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

const labels: Record<Language, Record<string, string>> = {
  en: {
    heading: "Audio Walkthrough",
    play: "Play walkthrough",
    pause: "Pause",
    resume: "Resume",
    stop: "Stop",
    status_idle: "Press Play to hear how to use this app.",
    status_playing: "Playing walkthrough — press H anytime to restart.",
    status_paused: "Paused.",
    status_done: "Walkthrough complete. Press Play to replay.",
    hint: "Keyboard: H = replay, Escape = stop",
  },
  hi: {
    heading: "ऑडियो वॉकथ्रू",
    play: "वॉकथ्रू चलाएं",
    pause: "रोकें",
    resume: "फिर शुरू करें",
    stop: "बंद करें",
    status_idle: "ऐप का उपयोग कैसे करें यह सुनने के लिए Play दबाएं।",
    status_playing: "वॉकथ्रू चल रहा है — पुनः आरंभ करने के लिए H दबाएं।",
    status_paused: "रोका गया।",
    status_done: "वॉकथ्रू पूर्ण। फिर से सुनने के लिए Play दबाएं।",
    hint: "कीबोर्ड: H = फिर से चलाएं, Escape = बंद करें",
  },
  mr: {
    heading: "ऑडिओ वॉकथ्रू",
    play: "वॉकथ्रू चालवा",
    pause: "थांबवा",
    resume: "पुन्हा सुरू करा",
    stop: "बंद करा",
    status_idle: "अॅप कसे वापरायचे हे ऐकण्यासाठी Play दाबा.",
    status_playing: "वॉकथ्रू चालू आहे — पुन्हा सुरू करण्यासाठी H दाबा.",
    status_paused: "थांबवले.",
    status_done: "वॉकथ्रू पूर्ण. पुन्हा ऐकण्यासाठी Play दाबा.",
    hint: "कीबोर्ड: H = पुन्हा चालवा, Escape = बंद करा",
  },
};

function statusText(state: WalkthroughState, lang: Language): string {
  const l = labels[lang];
  if (state === "playing") return l.status_playing;
  if (state === "paused") return l.status_paused;
  if (state === "done") return l.status_done;
  return l.status_idle;
}

export const VoiceWalkthrough: React.FC<Props> = ({
  state,
  language,
  onPlay,
  onPause,
  onResume,
  onStop,
}) => {
  const l = labels[language];

  return (
    <section
      aria-label={l.heading}
      aria-live="polite"
      aria-atomic="true"
      className="walkthrough-bar"
    >
      <div className="walkthrough-inner">
        {/* Icon + heading */}
        <div className="walkthrough-title" role="heading" aria-level={2}>
          <span aria-hidden="true">🔊</span>
          <span>{l.heading}</span>
        </div>

        {/* Live status — read automatically by screen readers */}
        <p
          id="walkthrough-status"
          className="walkthrough-status"
          role="status"
          aria-live="polite"
        >
          {statusText(state, language)}
        </p>

        {/* Controls */}
        <div className="walkthrough-controls" role="group" aria-label={l.heading}>
          {(state === "idle" || state === "done") && (
            <button
              type="button"
              onClick={onPlay}
              className="wt-btn wt-btn--primary"
              aria-label={l.play}
              aria-describedby="walkthrough-status"
            >
              <span aria-hidden="true">▶</span> {l.play}
            </button>
          )}

          {state === "playing" && (
            <>
              <button
                type="button"
                onClick={onPause}
                className="wt-btn"
                aria-label={l.pause}
              >
                <span aria-hidden="true">⏸</span> {l.pause}
              </button>
              <button
                type="button"
                onClick={onStop}
                className="wt-btn wt-btn--danger"
                aria-label={l.stop}
              >
                <span aria-hidden="true">⏹</span> {l.stop}
              </button>
            </>
          )}

          {state === "paused" && (
            <>
              <button
                type="button"
                onClick={onResume}
                className="wt-btn wt-btn--primary"
                aria-label={l.resume}
              >
                <span aria-hidden="true">▶</span> {l.resume}
              </button>
              <button
                type="button"
                onClick={onStop}
                className="wt-btn wt-btn--danger"
                aria-label={l.stop}
              >
                <span aria-hidden="true">⏹</span> {l.stop}
              </button>
            </>
          )}
        </div>

        {/* Keyboard shortcut hint — visually subtle, always present */}
        <p className="walkthrough-hint" aria-label={l.hint}>
          <kbd>H</kbd> = replay &nbsp;·&nbsp; <kbd>Esc</kbd> = stop
        </p>
      </div>

      {/* Animated indicator strip */}
      {state === "playing" && (
        <div className="walkthrough-wave" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="walkthrough-wave-bar" style={{ animationDelay: `${i * 0.12}s` }} />
          ))}
        </div>
      )}
    </section>
  );
};
