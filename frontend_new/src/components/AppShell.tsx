import { Link, useRouterState } from "@tanstack/react-router";
import { type ReactNode } from "react";

const navItems = [
  { to: "/workspace", label: "Workspace" },
  { to: "/notes", label: "Notes" },
] as const;

export function AppShell({ children, fullBleed = false }: { children: ReactNode; fullBleed?: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className={`${fullBleed ? "h-screen" : "min-h-screen"} flex flex-col overflow-hidden`}>
      <header className="h-16 glass-strong sticky top-0 z-50 flex items-center justify-between px-6 lg:px-10">
        <Link to="/workspace" className="flex items-center gap-3 group">
          <div className="relative size-8 rounded-full hologram-bg animate-breathe" aria-hidden />
          <div className="flex flex-col leading-none">
            <span className="font-display font-bold tracking-[0.2em] text-sm uppercase">SparshVaani</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
              Accessibility Suite
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
          {navItems.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`px-4 py-2 rounded-full text-xs font-medium tracking-wide uppercase transition-colors ${
                  active
                    ? "bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full glass">
            <div className="size-1.5 rounded-full bg-neon-cyan animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Online
            </span>
          </div>
        </div>
      </header>

      <main className={fullBleed ? "flex-1 flex flex-col overflow-hidden" : "flex-1 overflow-y-auto px-6 lg:px-10 py-10 max-w-7xl w-full mx-auto"}>
        {children}
      </main>
    </div>
  );
}
