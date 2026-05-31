import { useEffect, useState } from "react";
import { MODULOS } from "./data";

export function TimelineLateral() {
  const [activeIdx, setActiveIdx] = useState(-1);

  useEffect(() => {
    const ids = MODULOS.map((m) => `cap-${m.slug}`);
    const els = ids
      .map((id) => document.getElementById(id))
      .filter((e): e is HTMLElement => !!e);

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const idx = ids.indexOf(visible.target.id);
          if (idx >= 0) setActiveIdx(idx);
        }
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const onClick = (slug: string) => {
    document.getElementById(`cap-${slug}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav
      aria-label="Timeline de módulos"
      className="hidden lg:flex fixed left-6 top-1/2 -translate-y-1/2 z-40 flex-col gap-2 group/timeline"
    >
      {MODULOS.map((m, i) => {
        const state: "past" | "current" | "future" =
          activeIdx === -1 ? "future" : i < activeIdx ? "past" : i === activeIdx ? "current" : "future";
        return (
          <button
            key={m.slug}
            type="button"
            onClick={() => onClick(m.slug)}
            className="group/item flex items-center gap-3 text-left"
            aria-label={`Ir para ${m.titulo}`}
          >
            <span
              className={[
                "flex items-center justify-center w-4 h-4 rounded-full border transition-all",
                state === "current"
                  ? "border-[#12B76A] bg-[#12B76A] shadow-[0_0_16px_2px_rgba(18,183,106,0.6)]"
                  : state === "past"
                  ? "border-white/30 bg-white/20"
                  : "border-white/15 bg-transparent",
              ].join(" ")}
            >
              {state === "past" && (
                <svg width="8" height="8" viewBox="0 0 8 8" className="text-white/70">
                  <path d="M1 4l2 2 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span
              className={[
                "text-xs tracking-wide transition-all whitespace-nowrap",
                "opacity-0 -translate-x-1 group-hover/timeline:opacity-100 group-hover/timeline:translate-x-0",
                state === "current" ? "text-white font-semibold opacity-100 translate-x-0" : "text-white/60",
              ].join(" ")}
            >
              {String(i + 1).padStart(2, "0")} · {m.titulo}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
