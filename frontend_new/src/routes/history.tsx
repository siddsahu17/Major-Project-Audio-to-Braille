import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Session History · Aura AI" },
      { name: "description", content: "Browse your past reading sessions and voice transcripts." },
      { property: "og:title", content: "Session History · Aura AI" },
      { property: "og:description", content: "Pick up where you left off." },
    ],
  }),
  component: History,
});

const sessions = [
  { id: "s1", name: "quantum_neural_dynamics.pdf", date: "Today · 14:32", duration: "42 min", commands: 87, status: "Active" },
  { id: "s2", name: "intro_to_haptic_ui.pdf", date: "Yesterday · 09:11", duration: "1h 12m", commands: 134, status: "Completed" },
  { id: "s3", name: "screen_reader_history.pdf", date: "Mon · 18:04", duration: "28 min", commands: 51, status: "Paused" },
  { id: "s4", name: "wcag_2_2_summary.pdf", date: "Sun · 11:25", duration: "16 min", commands: 22, status: "Completed" },
];

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
          <p className="text-muted-foreground">Every document you've explored with Aura, ready to resume.</p>
        </header>

        <div className="glass rounded-2xl overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 border-b border-border font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            <div className="col-span-5">Document</div>
            <div className="col-span-3">When</div>
            <div className="col-span-2">Duration</div>
            <div className="col-span-1 text-right">Cmds</div>
            <div className="col-span-1 text-right">Status</div>
          </div>
          {sessions.map((s) => (
            <Link
              to="/workspace"
              key={s.id}
              className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 border-b last:border-0 border-border hover:bg-white/5 transition-colors items-center"
            >
              <div className="col-span-5 flex items-center gap-3 min-w-0">
                <div className="size-10 rounded-lg hologram-bg p-[1.5px] shrink-0">
                  <div className="size-full rounded-[7px] bg-background grid place-items-center font-mono text-[9px]">
                    PDF
                  </div>
                </div>
                <span className="truncate text-sm font-medium">{s.name}</span>
              </div>
              <div className="col-span-3 text-xs text-muted-foreground font-mono">{s.date}</div>
              <div className="col-span-2 text-xs">{s.duration}</div>
              <div className="col-span-1 text-xs text-right font-mono text-neon-cyan">{s.commands}</div>
              <div className="col-span-1 text-right">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-widest border ${
                    s.status === "Active"
                      ? "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan"
                      : s.status === "Paused"
                        ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-300"
                        : "border-border bg-white/5 text-muted-foreground"
                  }`}
                >
                  {s.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
