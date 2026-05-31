import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { MODULOS } from "./data";

export function ImageZoomModalGaleria({
  startIndex,
  onClose,
}: {
  startIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIndex);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const reset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const prev = useCallback(() => {
    setIdx((i) => (i - 1 + MODULOS.length) % MODULOS.length);
    reset();
  }, [reset]);
  const next = useCallback(() => {
    setIdx((i) => (i + 1) % MODULOS.length);
    reset();
  }, [reset]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(3, z + 0.25));
      else if (e.key === "-") setZoom((z) => Math.max(1, z - 0.25));
      else if (e.key === "0") reset();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, prev, next, reset]);

  const m = MODULOS[idx];

  const onPointerDown = (e: React.PointerEvent) => {
    if (zoom <= 1) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setPan({
      x: dragRef.current.px + (e.clientX - dragRef.current.x),
      y: dragRef.current.py + (e.clientY - dragRef.current.y),
    });
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-[#0A0E1A]/98 backdrop-blur-2xl flex flex-col"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-5 right-5 z-10 w-10 h-10 rounded-full bg-white/[0.06] border border-white/10 text-white/80 hover:bg-white/[0.12] flex items-center justify-center"
        aria-label="Fechar"
      >
        <X className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={prev}
        className="absolute left-5 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/[0.06] border border-white/10 text-white/80 hover:bg-white/[0.12] flex items-center justify-center"
        aria-label="Anterior"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        type="button"
        onClick={next}
        className="absolute right-5 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/[0.06] border border-white/10 text-white/80 hover:bg-white/[0.12] flex items-center justify-center"
        aria-label="Próximo"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      <div
        className="flex-1 flex items-center justify-center overflow-hidden p-12"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ cursor: zoom > 1 ? (dragRef.current ? "grabbing" : "grab") : "default" }}
      >
        <picture>
          <source srcSet={`/screenshots/${m.slug}.webp`} type="image/webp" />
          <img
            src={`/screenshots/${m.slug}.png`}
            alt={m.titulo}
            draggable={false}
            className="max-w-[92vw] max-h-[80vh] object-contain rounded-lg select-none transition-transform"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          />
        </picture>
      </div>

      <div className="relative z-10 px-6 pb-6 pt-3 flex items-center justify-between gap-4">
        <div>
          <div className="text-[10px] tracking-[0.3em] uppercase text-white/40">
            Capítulo {String(idx + 1).padStart(2, "0")} / {String(MODULOS.length).padStart(2, "0")}
          </div>
          <div className="text-white font-semibold mt-1">{m.titulo}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
            className="w-9 h-9 rounded-lg bg-white/[0.06] border border-white/10 text-white/80 hover:bg-white/[0.12] flex items-center justify-center"
            aria-label="Reduzir"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-white/50 w-12 text-center font-mono">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            className="w-9 h-9 rounded-lg bg-white/[0.06] border border-white/10 text-white/80 hover:bg-white/[0.12] flex items-center justify-center"
            aria-label="Ampliar"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={reset}
            className="w-9 h-9 rounded-lg bg-white/[0.06] border border-white/10 text-white/80 hover:bg-white/[0.12] flex items-center justify-center"
            aria-label="Resetar zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
