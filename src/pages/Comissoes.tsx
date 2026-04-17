import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function buildOptions() {
  const hoje = new Date();
  const opts: { value: string; label: string }[] = [];
  for (let i = 0; i < 18; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    opts.push({ value, label: `${MESES[d.getMonth()]} ${d.getFullYear()}` });
  }
  return opts;
}

export default function Comissoes() {
  const opcoes = useMemo(buildOptions, []);
  const [mes, setMes] = useState<string>(opcoes[0].value);

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">NEXO Comissões</h1>
          <p className="text-sm text-muted-foreground">
            Qualidade de venda, não só volume
          </p>
        </div>
        <Select value={mes} onValueChange={setMes}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {opcoes.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </header>

      <div
        className="rounded-md px-4 py-10 text-center text-sm"
        style={{
          background: "#F5F7FA",
          border: "1px dashed #B0BAC9",
          color: "#6B7A90",
        }}
      >
        Conteúdo do módulo será construído nas próximas etapas
      </div>
    </div>
  );
}
