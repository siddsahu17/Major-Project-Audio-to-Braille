export function Particles({ count = 18 }: { count?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {Array.from({ length: count }).map((_, i) => {
        const left = (i * 53) % 100;
        const top = (i * 37) % 100;
        const delay = (i * 0.4) % 4;
        const size = 2 + (i % 3);
        const purple = i % 3 === 0;
        return (
          <div
            key={i}
            className="absolute rounded-full animate-particle"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: size,
              height: size,
              background: purple ? "oklch(0.62 0.28 305 / 0.7)" : "oklch(0.88 0.18 200 / 0.7)",
              boxShadow: purple
                ? "0 0 8px oklch(0.62 0.28 305 / 0.8)"
                : "0 0 8px oklch(0.88 0.18 200 / 0.8)",
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}
    </div>
  );
}
