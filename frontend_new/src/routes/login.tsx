import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Particles } from "@/components/Particles";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in · Aura AI" },
      { name: "description", content: "Sign in to your Aura AI accessibility workspace." },
      { property: "og:title", content: "Sign in · Aura AI" },
      { property: "og:description", content: "Voice-first PDF accessibility." },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Visual side */}
      <div className="hidden lg:flex relative overflow-hidden flex-col justify-between p-12 border-r border-border">
        <Particles count={30} />
        <div className="flex items-center gap-3 z-10">
          <div className="size-9 rounded-full hologram-bg animate-breathe" />
          <div>
            <div className="font-display font-bold tracking-[0.2em] uppercase text-sm">Aura AI</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
              Accessibility Suite
            </div>
          </div>
        </div>

        <div className="relative z-10 flex flex-col items-center gap-8">
          <div className="relative size-64">
            <div className="absolute inset-0 hologram-bg rounded-full animate-breathe blur-2xl opacity-60" />
            <div className="absolute inset-4 rounded-full hologram-bg p-1 glow-cyan">
              <div className="size-full rounded-full bg-background grid place-items-center">
                <div className="size-32 rounded-full border border-white/10 bg-white/5 grid place-items-center">
                  <div className="size-6 rounded-full bg-neon-cyan shadow-[0_0_30px_var(--neon-cyan)] animate-pulse" />
                </div>
              </div>
            </div>
          </div>
          <div className="text-center max-w-sm space-y-3">
            <h2 className="font-display text-3xl font-bold tracking-tight">
              <span className="hologram-text">Your voice</span> is the interface.
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              A holographic companion that reads, explains and remembers every document — designed
              for blind and low-vision students.
            </p>
          </div>
        </div>

        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground z-10">
          v0.1 · WCAG 2.2 AA
        </div>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center p-8 lg:p-16 relative">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/" });
          }}
          className="w-full max-w-md space-y-6"
        >
          <div className="space-y-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-cyan">
              // Sign in
            </span>
            <h1 className="font-display text-4xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">
              Continue to your accessibility workspace.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah@university.edu"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-border focus:border-neon-cyan/60 focus:outline-none transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-border focus:border-neon-cyan/60 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl hologram-bg font-display font-bold text-sm tracking-[0.2em] uppercase text-primary-foreground glow-cyan hover:scale-[1.01] transition-transform"
          >
            Sign in
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              or
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            onClick={() => navigate({ to: "/" })}
            className="w-full py-3 rounded-xl glass border border-border hover:border-neon-cyan/40 text-sm font-medium transition-colors"
          >
            Continue with voice passphrase
          </button>

          <p className="text-center text-xs text-muted-foreground">
            New here?{" "}
            <Link to="/" className="text-neon-cyan hover:underline">
              Explore the dashboard
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
