import { AlertTriangle } from "lucide-react";

export function diasRestantes(dataPrevista?: string | null): number | null {
  if (!dataPrevista) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dataPrevista);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function PrazoCell({ dataPrevista, concluido }: { dataPrevista?: string | null; concluido?: boolean }) {
  if (concluido) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  const dias = diasRestantes(dataPrevista);
  if (dias === null) return <span className="text-sm text-muted-foreground">—</span>;

  if (dias < 0) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
        style={{ backgroundColor: "#FDECEA", color: "#E53935" }}
      >
        Atrasado {Math.abs(dias)} {Math.abs(dias) === 1 ? "dia" : "dias"}
      </span>
    );
  }
  if (dias < 3) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: "#E53935" }}>
        <AlertTriangle className="h-3.5 w-3.5" /> {dias} {dias === 1 ? "dia" : "dias"}
      </span>
    );
  }
  if (dias <= 7) {
    return <span className="text-sm font-medium" style={{ color: "#E8A020" }}>{dias} dias</span>;
  }
  return <span className="text-sm font-medium" style={{ color: "#12B76A" }}>{dias} dias</span>;
}

export function PrazoCard({ dataPrevista }: { dataPrevista?: string | null }) {
  const dias = diasRestantes(dataPrevista);
  if (dias === null) return null;
  const atrasado = dias < 0;
  return (
    <div
      className="rounded-lg px-4 py-3 text-center"
      style={{
        backgroundColor: atrasado ? "#FDECEA" : "#F0FDF9",
        border: atrasado ? "0.5px solid #E53935" : "0.5px solid #12B76A",
        minWidth: 140,
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 600, color: atrasado ? "#E53935" : "#12B76A" }}>
        {Math.abs(dias)}
      </div>
      <div style={{ fontSize: 11, color: atrasado ? "#E53935" : "#0F6E56" }}>
        {atrasado ? "dias de atraso" : "dias restantes"}
      </div>
    </div>
  );
}
