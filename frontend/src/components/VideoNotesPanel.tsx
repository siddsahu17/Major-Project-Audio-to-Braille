import React, { useState } from "react";
import { Language } from "@/locales/translations";
import { generateNotes, NotesResult } from "@/lib/api";

const T: Record<Language, Record<string, string>> = {
  en: {
    generate_btn: "Generate Study Notes",
    generating: "Generating notes…",
    export_btn: "Export as .txt",
    summary_heading: "Summary",
    keypoints_heading: "Key Points",
    detailed_heading: "Detailed Notes",
    error: "Error",
  },
  hi: {
    generate_btn: "अध्ययन नोट्स बनाएं",
    generating: "नोट्स बन रहे हैं…",
    export_btn: ".txt के रूप में निर्यात करें",
    summary_heading: "सारांश",
    keypoints_heading: "मुख्य बिंदु",
    detailed_heading: "विस्तृत नोट्स",
    error: "त्रुटि",
  },
  mr: {
    generate_btn: "अभ्यास नोट्स तयार करा",
    generating: "नोट्स तयार होत आहेत…",
    export_btn: ".txt म्हणून निर्यात करा",
    summary_heading: "सारांश",
    keypoints_heading: "मुख्य मुद्दे",
    detailed_heading: "तपशीलवार नोट्स",
    error: "त्रुटी",
  },
};

interface Props {
  language: Language;
  transcript: string;
  detectedLanguage: string;
}

export const VideoNotesPanel: React.FC<Props> = ({
  language,
  transcript,
  detectedLanguage,
}) => {
  const t = T[language];
  const [notes, setNotes] = useState<NotesResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await generateNotes(transcript, detectedLanguage);
      setNotes(result);
    } catch (e: any) {
      setError(e.message ?? "Failed to generate notes");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!notes) return;
    const content = [
      `${t.summary_heading}\n${notes.summary}`,
      `\n${t.keypoints_heading}\n${notes.key_points.map((p, i) => `${i + 1}. ${p}`).join("\n")}`,
      `\n${t.detailed_heading}\n${notes.detailed_notes}`,
    ].join("\n\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "study_notes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="notes-panel" aria-live="polite">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading || !transcript}
        className="sv-btn sv-btn--primary"
        aria-busy={loading}
      >
        {loading ? t.generating : t.generate_btn}
      </button>

      {error && (
        <div role="alert" className="sv-error">
          <strong>{t.error}:</strong> {error}
        </div>
      )}

      {notes && (
        <div className="notes-result">
          <section aria-labelledby="notes-summary">
            <h3 id="notes-summary">{t.summary_heading}</h3>
            <p>{notes.summary}</p>
          </section>

          <section aria-labelledby="notes-keypoints">
            <h3 id="notes-keypoints">{t.keypoints_heading}</h3>
            <ul>
              {notes.key_points.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="notes-detailed">
            <h3 id="notes-detailed">{t.detailed_heading}</h3>
            <p>{notes.detailed_notes}</p>
          </section>

          <button
            type="button"
            onClick={handleExport}
            className="sv-btn sv-btn--sm"
          >
            {t.export_btn}
          </button>
        </div>
      )}
    </div>
  );
};
