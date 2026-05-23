/**
 * BraillePanel
 * Type or paste text → get Unicode Braille instantly.
 * Calls backend /braille/convert for authoritative multi-lang conversion.
 * Supports copy-to-clipboard and download as .txt
 */

import React, { useId, useRef, useState } from "react";
import { Language } from "@/locales/translations";
import { convertToBraille } from "@/lib/api";

const T: Record<Language, Record<string, string>> = {
  en: {
    heading: "Braille Converter",
    input_label: "Enter text to convert",
    input_placeholder: "Type or paste text here…",
    lang_label: "Text language",
    convert_btn: "Convert to Braille",
    clear_btn: "Clear",
    processing: "Converting…",
    result_heading: "Braille Output",
    copy: "Copy Braille",
    copied: "Copied!",
    download: "Download .txt",
    error: "Error",
    char_count: "characters",
  },
  hi: {
    heading: "ब्रेल कन्वर्टर",
    input_label: "परिवर्तित करने के लिए टेक्स्ट दर्ज करें",
    input_placeholder: "यहाँ टेक्स्ट टाइप करें या पेस्ट करें…",
    lang_label: "टेक्स्ट भाषा",
    convert_btn: "ब्रेल में बदलें",
    clear_btn: "साफ करें",
    processing: "परिवर्तित हो रहा है…",
    result_heading: "ब्रेल आउटपुट",
    copy: "ब्रेल कॉपी करें",
    copied: "कॉपी हो गया!",
    download: ".txt डाउनलोड करें",
    error: "त्रुटि",
    char_count: "अक्षर",
  },
  mr: {
    heading: "ब्रेल कन्व्हर्टर",
    input_label: "रूपांतरित करण्यासाठी मजकूर टाका",
    input_placeholder: "येथे मजकूर टाइप करा किंवा पेस्ट करा…",
    lang_label: "मजकूर भाषा",
    convert_btn: "ब्रेलमध्ये रूपांतरित करा",
    clear_btn: "साफ करा",
    processing: "रूपांतरित होत आहे…",
    result_heading: "ब्रेल आउटपुट",
    copy: "ब्रेल कॉपी करा",
    copied: "कॉपी केले!",
    download: ".txt डाउनलोड करा",
    error: "त्रुटी",
    char_count: "अक्षरे",
  },
};

interface Props {
  language: Language;
}

export const BraillePanel: React.FC<Props> = ({ language }) => {
  const t = T[language];
  const panelId = useId();

  const [text, setText] = useState("");
  const [textLang, setTextLang] = useState<"en" | "hi" | "mr">(language as any);
  const [braille, setBraille] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const convert = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    setBraille("");
    try {
      const res = await convertToBraille(text.trim(), textLang);
      setBraille(res.braille);
    } catch (e: any) {
      setError(e.message ?? "Conversion failed");
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setText("");
    setBraille("");
    setError("");
  };

  const copyBraille = async () => {
    await navigator.clipboard.writeText(braille);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    const blob = new Blob([`Original:\n${text}\n\nBraille:\n${braille}`], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "braille_output.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section aria-labelledby={`${panelId}-heading`} className="sv-panel">
      <h2 id={`${panelId}-heading`} className="sv-panel__title">
        <span aria-hidden="true">⠿</span> {t.heading}
      </h2>

      {/* Language selector */}
      <div className="field-row">
        <label htmlFor={`${panelId}-lang`} className="field-label">
          {t.lang_label}
        </label>
        <select
          id={`${panelId}-lang`}
          value={textLang}
          onChange={(e) => setTextLang(e.target.value as any)}
          className="sv-select"
        >
          <option value="en">English</option>
          <option value="hi">हिंदी</option>
          <option value="mr">मराठी</option>
        </select>
      </div>

      {/* Text input */}
      <div className="field-row">
        <label htmlFor={`${panelId}-input`} className="field-label">
          {t.input_label}
        </label>
        <textarea
          id={`${panelId}-input`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.input_placeholder}
          rows={5}
          className="sv-textarea"
          aria-describedby={`${panelId}-char-count`}
          maxLength={10000}
        />
        <p id={`${panelId}-char-count`} className="panel-hint" aria-live="polite">
          {text.length} / 10,000 {t.char_count}
        </p>
      </div>

      {/* Actions */}
      <div className="btn-row">
        <button
          type="button"
          onClick={convert}
          disabled={!text.trim() || loading}
          className="sv-btn sv-btn--primary"
          aria-busy={loading}
        >
          {loading ? t.processing : t.convert_btn}
        </button>
        <button
          type="button"
          onClick={clear}
          className="sv-btn"
        >
          {t.clear_btn}
        </button>
      </div>

      {error && (
        <div role="alert" aria-live="assertive" className="sv-error">
          <strong>{t.error}:</strong> {error}
        </div>
      )}

      {/* Braille result */}
      {braille && (
        <div aria-live="polite" aria-atomic="true" className="result-box">
          <div className="result-box__header">
            <h3>{t.result_heading}</h3>
            <button
              type="button"
              onClick={copyBraille}
              className="sv-btn sv-btn--sm"
              aria-label={copied ? t.copied : t.copy}
            >
              {copied ? "✓" : "⎘"} {copied ? t.copied : t.copy}
            </button>
            <button
              type="button"
              onClick={download}
              className="sv-btn sv-btn--sm"
              aria-label={t.download}
            >
              ⬇ {t.download}
            </button>
          </div>
          {/* aria-label on the <p> gives screen readers the original text,
              while sighted users see the Braille Unicode characters */}
          <p
            className="braille-text"
            aria-label={`Braille representation of: ${text}`}
            lang="und"
          >
            {braille}
          </p>
        </div>
      )}
    </section>
  );
};
