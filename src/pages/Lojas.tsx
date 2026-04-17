import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function buildMonthOptions(months = 12) {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    opts.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return opts;
}

export default function Lojas() {
  const monthOptions = useMemo(() => buildMonthOptions(12), []);
  const [mes, setMes] = useState(monthOptions[0].value);

  const handleNovaLoja = () => {
    // TODO: abrir dialog de criação
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: "#0D1117" }}>NEXO Lojas</h1>
          <p style={{ fontSize: 13, color: "#6B7A90", marginTop: 2 }}>
            Visão consolidada da rede
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div style={{ width: 180 }}>
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <button
            onClick={handleNovaLoja}
            style={{
              background: "#1E6FBF",
              color: "#fff",
              fontSize: 13,
              fontWeight: 500,
              padding: "0 14px",
              height: 36,
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
            }}
          >
            + Nova loja
          </button>
        </div>
      </div>
    </div>
  );
}
