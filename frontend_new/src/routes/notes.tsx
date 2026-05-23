import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { AppShell } from "@/components/AppShell";
import { transcribeAudio, processVideo, processPDFNotes } from "@/lib/api";
import type { VideoNotesResult, Flashcard, Timestamp } from "@/lib/api";

export const Route = createFileRoute("/notes")({
  head: () => ({
    meta: [
      { title: "Notes · SparshVaani" },
      { name: "description", content: "Generate AI study notes, flashcards and timestamps from any video, audio or PDF." },
    ],
  }),
  component: Notes,
});

type InputMode = "url" | "audio" | "pdf";
type Stage = "input" | "processing" | "done";

function Notes() {
  const [mode, setMode] = useState<InputMode>("url");
  const [url, setUrl] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [language, setLanguage] = useState("en");
  const [stage, setStage] = useState<Stage>("input");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VideoNotesResult | null>(null);
  const [activeTab, setActiveTab] = useState<"summary" | "notes" | "flashcards" | "timestamps">("summary");
  const audioInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const canProcess =
    (mode === "url" && url.trim()) ||
    (mode === "audio" && audioFile) ||
    (mode === "pdf" && pdfFile);

  const handleProcess = async () => {
    setError(null);
    setStage("processing");
    try {
      let notes: VideoNotesResult;

      if (mode === "url") {
        notes = await processVideo({ url }, language);
      } else if (mode === "audio" && audioFile) {
        const tx = await transcribeAudio(audioFile, language);
        notes = await processVideo({ transcript: tx.text }, language);
      } else if (mode === "pdf" && pdfFile) {
        notes = await processPDFNotes(pdfFile, language);
      } else {
        throw new Error("Please provide input.");
      }

      setResult(notes);
      setStage("done");
      setActiveTab("summary");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed. Try again.");
      setStage("input");
    }
  };

  const handleExport = () => {
    if (!result) return;
    const lines = [
      "=== SPARSHVAANI STUDY NOTES ===\n",
      "## SUMMARY\n",
      result.summary,
      "\n\n## KEY POINTS\n",
      result.key_points.map((p, i) => `${i + 1}. ${p}`).join("\n"),
      "\n\n## DETAILED NOTES\n",
      result.detailed_notes,
      "\n\n## FLASHCARDS\n",
      result.flashcards.map((f, i) => `Q${i + 1}: ${f.question}\nA: ${f.answer}`).join("\n\n"),
      "\n\n## TIMESTAMPS\n",
      result.timestamps.map((t) => `[${t.time}] ${t.topic}\n${t.description}`).join("\n\n"),
    ];
    const blob = new Blob([lines.join("")], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "sparshvaani_study_notes.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const reset = () => {
    setStage("input");
    setResult(null);
    setUrl("");
    setAudioFile(null);
    setPdfFile(null);
    setError(null);
  };

  const modeLabels: Record<InputMode, string> = {
    url: "YouTube URL",
    audio: "Audio File",
    pdf: "PDF Document",
  };

  return (
    <AppShell>
      <section className="max-w-4xl mx-auto space-y-8">
        <header className="space-y-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-cyan">
            // Study Notes Generator
          </span>
          <h1 className="font-display text-4xl lg:text-5xl font-bold tracking-tight">
            Generate <span className="hologram-text">Notes</span>
          </h1>
          <p className="text-muted-foreground">
            Turn any YouTube video, audio recording, or PDF document into structured study material — summaries, flashcards, and chapter timestamps.
          </p>
        </header>

        {stage === "input" && (
          <div className="glass rounded-2xl p-8 space-y-6">
            {/* Mode selector */}
            <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-border w-fit">
              {(["url", "audio", "pdf"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-widest transition-colors ${
                    mode === m
                      ? "hologram-bg text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {modeLabels[m]}
                </button>
              ))}
            </div>

            {mode === "url" && (
              <div className="space-y-2">
                <label htmlFor="yt-url" className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  YouTube URL
                </label>
                <input
                  id="yt-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50 transition-colors"
                />
              </div>
            )}

            {mode === "audio" && (
              <FileDropZone
                label="Audio File"
                accept="audio/*"
                file={audioFile}
                iconLabel="AUD"
                hint="MP3, WAV, M4A, WebM — any audio format"
                inputRef={audioInputRef}
                onChange={setAudioFile}
              />
            )}

            {mode === "pdf" && (
              <FileDropZone
                label="PDF Document"
                accept="application/pdf"
                file={pdfFile}
                iconLabel="PDF"
                hint="Upload any PDF — textbooks, lecture slides, research papers"
                inputRef={pdfInputRef}
                onChange={setPdfFile}
              />
            )}

            <div className="flex items-center gap-4">
              <label htmlFor="notes-lang" className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                Output language
              </label>
              <select
                id="notes-lang"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-white/5 border border-border rounded-lg text-xs py-2 px-3 text-foreground focus:outline-none focus:border-neon-cyan/50"
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी</option>
                <option value="mr">मराठी</option>
              </select>
            </div>

            {error && (
              <p className="text-sm text-red-400" role="alert">{error}</p>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleProcess}
                disabled={!canProcess}
                className="px-6 py-3 rounded-xl hologram-bg font-display font-bold text-sm tracking-[0.2em] uppercase text-primary-foreground glow-cyan hover:scale-[1.02] transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                Generate Notes →
              </button>
            </div>
          </div>
        )}

        {stage === "processing" && (
          <div className="glass rounded-2xl p-16 flex flex-col items-center gap-6">
            <div className="size-20 rounded-full hologram-bg p-[2px] animate-breathe">
              <div className="size-full rounded-full bg-background grid place-items-center font-mono text-xs">
                AI
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="font-display text-lg font-bold">Generating study notes…</p>
              <p className="text-sm text-muted-foreground">
                {mode === "url" ? "Downloading audio, transcribing, and building study material." :
                 mode === "audio" ? "Transcribing audio and building study material." :
                 "Extracting PDF text and building study material."}
              </p>
            </div>
            <div className="flex items-center gap-1.5" aria-hidden>
              {[4, 8, 12, 6, 10, 7, 11, 5].map((h, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full animate-wave-bar ${i % 3 === 0 ? "bg-neon-purple" : "bg-neon-cyan"}`}
                  style={{ height: `${h * 3}px`, animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {stage === "done" && result && (
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-border overflow-x-auto">
              {(["summary", "notes", "flashcards", "timestamps"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-widest whitespace-nowrap transition-colors ${
                    activeTab === tab
                      ? "hologram-bg text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab}
                  {tab === "flashcards" && result.flashcards.length > 0 && (
                    <span className="ml-1.5 text-[9px] font-mono text-neon-cyan">{result.flashcards.length}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="glass rounded-2xl p-6 min-h-[300px]">
              {activeTab === "summary" && <SummaryTab result={result} />}
              {activeTab === "notes" && <NotesTab result={result} />}
              {activeTab === "flashcards" && <FlashcardsTab flashcards={result.flashcards} />}
              {activeTab === "timestamps" && <TimestampsTab timestamps={result.timestamps} />}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={reset}
                className="px-5 py-2.5 rounded-xl bg-white/5 border border-border text-sm font-medium hover:bg-white/10 transition-colors"
              >
                Process another
              </button>
              <button
                onClick={handleExport}
                className="px-5 py-2.5 rounded-xl hologram-bg font-display font-bold text-sm tracking-[0.15em] uppercase text-primary-foreground glow-cyan hover:scale-[1.02] transition-transform"
              >
                Export .txt
              </button>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FileDropZone({
  label,
  accept,
  file,
  iconLabel,
  hint,
  inputRef,
  onChange,
}: {
  label: string;
  accept: string;
  file: File | null;
  iconLabel: string;
  hint: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (f: File | null) => void;
}) {
  const [dragging, setDragging] = useState(false);

  return (
    <div className="space-y-2">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onChange(e.dataTransfer.files?.[0] ?? null);
        }}
        className={`w-full aspect-[5/2] rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 ${
          file
            ? "border-neon-cyan/50 bg-neon-cyan/5"
            : dragging
              ? "border-neon-cyan glow-cyan scale-[1.01]"
              : "border-border hover:border-neon-cyan/40"
        }`}
      >
        <div className="size-12 rounded-full hologram-bg p-[1.5px] animate-breathe">
          <div className="size-full rounded-full bg-background grid place-items-center font-mono text-[10px]">
            {iconLabel}
          </div>
        </div>
        {file ? (
          <>
            <span className="text-sm font-medium">{file.name}</span>
            <span className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB · Click to change</span>
          </>
        ) : (
          <>
            <span className="text-sm text-muted-foreground">Drop file here or click to browse</span>
            <span className="text-xs text-muted-foreground/60">{hint}</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

function SummaryTab({ result }: { result: VideoNotesResult }) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-neon-cyan">Summary</h2>
        <p className="text-sm leading-relaxed text-foreground/90">{result.summary}</p>
      </div>
      {result.key_points.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-neon-cyan">Key Points</h2>
          <ul className="space-y-2">
            {result.key_points.map((point, i) => (
              <li key={i} className="flex gap-3 text-sm text-foreground/80">
                <span className="font-mono text-neon-cyan shrink-0">{String(i + 1).padStart(2, "0")}</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function NotesTab({ result }: { result: VideoNotesResult }) {
  return (
    <div className="space-y-3">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-neon-cyan">Detailed Notes</h2>
      {result.detailed_notes ? (
        <div className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">{result.detailed_notes}</div>
      ) : (
        <p className="text-sm text-muted-foreground">No detailed notes generated.</p>
      )}
    </div>
  );
}

function FlashcardsTab({ flashcards }: { flashcards: Flashcard[] }) {
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setFlipped((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  if (flashcards.length === 0) {
    return <p className="text-sm text-muted-foreground">No flashcards generated.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {flashcards.map((card, i) => (
        <button
          key={i}
          onClick={() => toggle(i)}
          className="text-left p-4 rounded-xl border border-border bg-white/5 hover:bg-white/8 hover:border-neon-cyan/40 transition-all space-y-2"
          aria-label={`Flashcard ${i + 1}`}
        >
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            {flipped.has(i) ? "Answer" : `Q${i + 1}`}
          </span>
          <p className="text-sm leading-relaxed text-foreground/90">
            {flipped.has(i) ? card.answer : card.question}
          </p>
          <span className="font-mono text-[9px] text-neon-cyan uppercase tracking-widest">
            {flipped.has(i) ? "Click to see question" : "Click to reveal answer"}
          </span>
        </button>
      ))}
    </div>
  );
}

function TimestampsTab({ timestamps }: { timestamps: Timestamp[] }) {
  if (timestamps.length === 0) {
    return <p className="text-sm text-muted-foreground">No timestamps generated.</p>;
  }

  return (
    <div className="space-y-3">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-neon-cyan">Chapter Timestamps</h2>
      <div className="space-y-3">
        {timestamps.map((ts, i) => (
          <div key={i} className="flex gap-4 p-3 rounded-xl border border-border bg-white/5">
            <span className="font-mono text-xs text-neon-cyan shrink-0 pt-0.5">{ts.time}</span>
            <div>
              <p className="text-sm font-medium">{ts.topic}</p>
              <p className="text-xs text-muted-foreground mt-1">{ts.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
