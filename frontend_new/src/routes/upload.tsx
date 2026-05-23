import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { uploadPDF } from "@/lib/api";
import { useSessionStore } from "@/store/sessionStore";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload PDF · Aura AI" },
      { name: "description", content: "Drag and drop a PDF to start reading with your AI voice companion." },
      { property: "og:title", content: "Upload a PDF · Aura AI" },
      { property: "og:description", content: "Drag-and-drop accessibility — read any document with your voice." },
    ],
  }),
  component: Upload,
});

function Upload() {
  const navigate = useNavigate();
  const setPdfSession = useSessionStore((s) => s.setPdfSession);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (f: File | undefined | null) => {
    if (!f) return;
    setError(null);
    setFile(f);
  };

  const handleOpen = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const result = await uploadPDF(file);
      setPdfSession(result.session_id, result.total_pages, file, result.filename);
      navigate({ to: "/workspace" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      setUploading(false);
    }
  };

  return (
    <AppShell>
      <section className="max-w-3xl mx-auto space-y-8">
        <header className="text-center space-y-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-cyan">
            // Step 1 of 2
          </span>
          <h1 className="font-display text-4xl lg:text-5xl font-bold tracking-tight">
            Upload your <span className="hologram-text">document</span>
          </h1>
          <p className="text-muted-foreground">PDF files up to 50&nbsp;MB. Everything is processed privately.</p>
        </header>

        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className={`relative block aspect-[16/9] rounded-3xl glass border-2 border-dashed transition-all cursor-pointer overflow-hidden ${
            dragging
              ? "border-neon-cyan glow-cyan scale-[1.01]"
              : "border-border hover:border-neon-cyan/40"
          }`}
        >
          <input
            type="file"
            accept="application/pdf"
            className="sr-only"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <div className="absolute inset-0 grid place-items-center text-center px-6 gap-4">
            <div className="size-20 rounded-full hologram-bg p-[2px] animate-breathe">
              <div className="size-full rounded-full bg-background grid place-items-center font-mono text-xs">
                PDF
              </div>
            </div>
            {file ? (
              <>
                <div className="font-display text-xl font-bold">{file.name}</div>
                <div className="font-mono text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB · Ready
                </div>
              </>
            ) : (
              <>
                <div className="font-display text-2xl font-bold">Drop your PDF here</div>
                <div className="text-sm text-muted-foreground">or click to browse files</div>
              </>
            )}
          </div>
        </label>

        {error && (
          <p className="text-center text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <button
            disabled={!file || uploading}
            onClick={handleOpen}
            className="px-6 py-3 rounded-xl hologram-bg font-display font-bold text-sm tracking-[0.2em] uppercase text-primary-foreground glow-cyan hover:scale-[1.02] transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {uploading ? "Uploading…" : "Open in Workspace →"}
          </button>
        </div>
      </section>
    </AppShell>
  );
}
