import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function MetricCard({
  label,
  valor,
  cor,
}: {
  label: string;
  valor: number;
  cor: string;
}) {
  return (
    <Card style={{ borderTop: `3px solid ${cor}` }}>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-medium tabular-nums" style={{ color: cor }}>
          {fmtBRL(valor)}
        </p>
      </CardContent>
    </Card>
  );
}

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

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Total a pagar (mês)" valor={0} cor="#1E6FBF" />
        <MetricCard label="Comissões pagas" valor={0} cor="#12B76A" />
        <MetricCard label="Bônus por margem" valor={0} cor="#E8A020" />
      </div>

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
