import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Accessibility Settings · Aura AI" },
      { name: "description", content: "Tune voice, contrast, typography and keyboard preferences." },
      { property: "og:title", content: "Accessibility Settings · Aura AI" },
      { property: "og:description", content: "Tune Aura AI for your needs." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const [voiceSpeed, setVoiceSpeed] = useState(1.2);
  const [fontSize, setFontSize] = useState(120);
  const [contrast, setContrast] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [kbdNav, setKbdNav] = useState(true);

  return (
    <AppShell>
      <section className="max-w-3xl mx-auto space-y-10">
        <header className="space-y-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-cyan">
            // Preferences
          </span>
          <h1 className="font-display text-4xl lg:text-5xl font-bold tracking-tight">
            Accessibility <span className="hologram-text">Settings</span>
          </h1>
          <p className="text-muted-foreground">Tune Aura to fit how you read, listen and navigate.</p>
        </header>

        <div className="glass rounded-2xl p-6 lg:p-8 space-y-8">
          <Group title="Voice">
            <Range label="Voice speed" value={voiceSpeed} min={0.5} max={2} step={0.1} suffix="x" onChange={setVoiceSpeed} />
            <Field label="Voice persona">
              <select className="select">
                <option>Aura — calm neutral</option>
                <option>Nova — bright warm</option>
                <option>Echo — deep narrator</option>
              </select>
            </Field>
            <Field label="Language">
              <select className="select">
                <option>English (US)</option>
                <option>English (UK)</option>
                <option>Español</option>
                <option>Français</option>
                <option>हिन्दी</option>
              </select>
            </Field>
          </Group>

          <Group title="Display">
            <Range label="Font size" value={fontSize} min={75} max={250} step={5} suffix="%" onChange={setFontSize} />
            <Toggle label="High contrast mode" checked={contrast} onChange={setContrast} />
            <Toggle label="Reduce motion" checked={reduceMotion} onChange={setReduceMotion} />
          </Group>

          <Group title="Navigation">
            <Toggle label="Keyboard-first navigation" checked={kbdNav} onChange={setKbdNav} />
            <Field label="Voice shortcut">
              <input className="select" defaultValue="Hey Aura" />
            </Field>
          </Group>

          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button className="px-5 py-2.5 rounded-xl glass border border-border text-sm font-medium hover:border-neon-cyan/40 transition-colors">
              Reset
            </button>
            <button className="px-6 py-2.5 rounded-xl hologram-bg font-display font-bold text-xs tracking-[0.2em] uppercase text-primary-foreground glow-cyan">
              Save changes
            </button>
          </div>
        </div>
      </section>

      <style>{`
        .select {
          background: oklch(1 0 0 / 0.05);
          border: 1px solid var(--color-border);
          border-radius: 0.75rem;
          padding: 0.625rem 0.875rem;
          font-size: 0.875rem;
          color: var(--color-foreground);
          outline: none;
          transition: border-color .15s;
          min-width: 16rem;
        }
        .select:focus { border-color: oklch(0.88 0.18 200 / 0.6); }
      `}</style>
    </AppShell>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-cyan">{title}</h2>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-neon-cyan" : "bg-white/10"}`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-background transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function Range({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (n: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span>{label}</span>
        <span className="font-mono text-neon-cyan">
          {value}
          {suffix}
        </span>
      </div>
      <div className="relative">
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full hologram-bg" style={{ width: `${pct}%` }} />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          aria-label={label}
        />
      </div>
    </div>
  );
}
