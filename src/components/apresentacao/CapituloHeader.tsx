export function CapituloHeader({ numero, total }: { numero: number; total: number }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-white/40">
        Capítulo {String(numero).padStart(2, "0")}
      </span>
      <span className="flex-1 h-px bg-gradient-to-r from-white/15 to-transparent" />
      <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-white/30">
        {String(numero).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </span>
    </div>
  );
}
