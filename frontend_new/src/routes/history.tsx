import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Session History · SparshVaani" },
      { name: "description", content: "Browse your past reading sessions and voice transcripts." },
    ],
  }),
  component: History,
});

function History() {
  return (
    <AppShell>
      <section className="space-y-10">
        <header className="space-y-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-cyan">
            // Sessions
          </span>
          <h1 className="font-display text-4xl lg:text-5xl font-bold tracking-tight">
            Reading <span className="hologram-text">history</span>
          </h1>
          <p className="text-muted-foreground">Every document you've explored with SparshVaani, ready to resume.</p>
        </header>

        <div className="glass rounded-2xl p-10 flex flex-col items-center justify-center gap-4 text-center">
          <div className="size-16 rounded-2xl hologram-bg p-[1.5px]">
            <div className="size-full rounded-[15px] bg-background grid place-items-center">
              <span className="font-mono text-xs text-neon-cyan">soon</span>
            </div>
          </div>
          <h2 className="font-display text-2xl font-bold">Coming soon</h2>
          <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
            Session history will be available in a future update. Your reading sessions will appear here once persistence is enabled.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
