import { lazy, Suspense, useState, useEffect } from "react";
import { Particles } from "./Particles";

// Lazy import prevents react-pdf from executing during SSR
const PDFDocumentClient = lazy(() => import("./PDFDocument"));

interface Props {
  aiActive: boolean;
  pdfSource: string | null;
  pdfFilename: string;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function PDFViewer({
  aiActive,
  pdfSource,
  pdfFilename,
  currentPage,
  totalPages,
  onPageChange,
}: Props) {
  const [zoom, setZoom] = useState(100);
  const [mounted, setMounted] = useState(false);

  // Only render react-pdf on the client
  useEffect(() => setMounted(true), []);

  const displayedTotal = totalPages || 1;

  return (
    <section className="flex-1 flex flex-col relative overflow-hidden" aria-label="Document viewer">
      {/* Header */}
      <div className="h-14 border-b border-border glass flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-7 rounded-md hologram-bg p-[1.5px]">
            <div className="size-full rounded-[5px] bg-background grid place-items-center font-mono text-[10px]">
              PDF
            </div>
          </div>
          <span className="text-sm font-medium truncate">
            {pdfFilename || "No textbook loaded"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {pdfSource && (
            <button
              onClick={() => {
                const a = document.createElement("a");
                a.href = pdfSource;
                a.download = pdfFilename || "textbook.pdf";
                a.target = "_blank";
                a.click();
              }}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-border text-[11px] font-medium hover:bg-white/10 transition-colors"
            >
              Download
            </button>
          )}
          <span
            className={`px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-colors ${
              aiActive
                ? "bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan"
                 : "bg-white/5 border-border text-muted-foreground"
            }`}
          >
            {aiActive ? "AI Active" : "AI Idle"}
          </span>
        </div>
      </div>

      {/* Stage */}
      <div className="flex-1 relative flex overflow-hidden">
        <Particles count={aiActive ? 22 : 6} />

        {/* Atmospheric backdrop */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, oklch(0.88 0.18 200 / 0.08) 0%, transparent 60%)",
          }}
        />

        {/* Thumbnails */}
        <aside className="hidden lg:flex flex-col gap-3 w-28 p-4 overflow-y-auto border-r border-border bg-background/40">
          <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
            Pages
          </span>
          {Array.from({ length: 6 }).map((_, i) => {
            const n = currentPage - 2 + i;
            if (n < 1 || n > displayedTotal) return null;
            const active = n === currentPage;
            return (
              <button
                key={n}
                onClick={() => onPageChange(n)}
                className={`aspect-[3/4] rounded-md overflow-hidden transition-all relative ${
                  active
                    ? "ring-2 ring-neon-cyan glow-cyan"
                    : "ring-1 ring-border opacity-60 hover:opacity-100"
                }`}
                aria-label={`Go to page ${n}`}
                aria-current={active ? "page" : undefined}
              >
                <div className="size-full bg-white/95 p-1.5 flex flex-col gap-1">
                  <div className="h-0.5 w-2/3 bg-neutral-300 rounded" />
                  <div className="h-0.5 w-full bg-neutral-200 rounded" />
                  <div className="h-0.5 w-full bg-neutral-200 rounded" />
                  <div className="h-0.5 w-3/4 bg-neutral-200 rounded" />
                </div>
                <span
                  className={`absolute bottom-1 right-1 font-mono text-[8px] ${
                    active ? "text-neon-cyan" : "text-muted-foreground"
                  }`}
                >
                  {n.toString().padStart(2, "0")}
                </span>
              </button>
            );
          })}
        </aside>

        {/* Document */}
        <div className="flex-1 relative grid place-items-center p-6 lg:p-12 overflow-auto">
          <div
            className={`relative bg-white rounded-md shadow-2xl transition-all duration-500 overflow-hidden ${
              aiActive
                ? "animate-border-pulse ring-2 ring-neon-cyan/50"
                : "ring-1 ring-border"
            }`}
            style={{
              width: `min(${zoom * 6}px, 100%)`,
              maxWidth: "780px",
            }}
          >
            {/* Hologram top bar */}
            <div className="absolute top-0 left-0 w-full h-1 hologram-bg rounded-t-md z-10" />

            {/* PDF content or placeholder */}
            {pdfSource && mounted ? (
              <Suspense
                fallback={
                  <div
                    className="grid place-items-center text-neutral-400 font-mono text-xs"
                    style={{ aspectRatio: "3/4", minHeight: "400px" }}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="size-8 rounded-full hologram-bg animate-breathe" />
                      <span>Loading page {currentPage}…</span>
                    </div>
                  </div>
                }
              >
                <PDFDocumentClient
                  file={pdfSource}
                  currentPage={currentPage}
                  zoom={zoom}
                />
              </Suspense>
            ) : (
              <div
                className="p-10 lg:p-16 space-y-6"
                style={{ aspectRatio: "3/4", minHeight: "400px" }}
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-400">
                  {pdfSource ? "Loading…" : "No textbook loaded"}
                </div>
                {!pdfSource && (
                  <div className="h-full flex flex-col items-center justify-center gap-6 pt-12">
                    <div className="size-20 rounded-full hologram-bg p-[2px] animate-breathe opacity-40">
                      <div className="size-full rounded-full bg-neutral-100 grid place-items-center font-mono text-sm text-neutral-400">
                        PDF
                      </div>
                    </div>
                    <p className="text-neutral-400 text-sm text-center max-w-[28ch] leading-relaxed">
                      Click the Speak button or press the Spacebar to ask your AI tutor what you want to learn.
                    </p>
                  </div>
                )}
              </div>
            )}

            {aiActive && (
              <>
                <div className="absolute top-1/3 right-0 w-1 h-32 bg-neon-cyan shadow-[0_0_24px_var(--neon-cyan)]" />
                <div className="absolute -inset-4 pointer-events-none rounded-2xl border border-neon-cyan/20" />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Floating page controls */}
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full glass-strong z-20 glow-cyan"
        aria-label="Page navigation"
      >
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="size-8 rounded-full hover:bg-white/10 grid place-items-center transition-colors disabled:opacity-30"
          aria-label="Previous page"
        >
          ←
        </button>
        <span
          className="font-mono text-[11px] tracking-widest px-2"
          aria-live="polite"
          aria-atomic="true"
        >
          {currentPage.toString().padStart(2, "0")} /{" "}
          {displayedTotal.toString().padStart(2, "0")}
        </span>
        <button
          onClick={() => onPageChange(Math.min(displayedTotal, currentPage + 1))}
          disabled={currentPage >= displayedTotal}
          className="size-8 rounded-full hover:bg-white/10 grid place-items-center transition-colors disabled:opacity-30"
          aria-label="Next page"
        >
          →
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <button
          onClick={() => setZoom((z) => Math.max(50, z - 10))}
          className="size-8 rounded-full hover:bg-white/10 grid place-items-center transition-colors"
          aria-label="Zoom out"
        >
          −
        </button>
        <span className="font-mono text-[10px] uppercase tracking-widest text-neon-cyan w-12 text-center">
          {zoom}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.min(200, z + 10))}
          className="size-8 rounded-full hover:bg-white/10 grid place-items-center transition-colors"
          aria-label="Zoom in"
        >
          +
        </button>
      </div>
    </section>
  );
}
