import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, Plus, Wallet } from "lucide-react";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
function labelMes(d: Date) { return `${MESES[d.getMonth()]} ${d.getFullYear()}`; }
function shiftMes(d: Date, delta: number) { return new Date(d.getFullYear(), d.getMonth() + delta, 1); }

type Linha = { mes: string; entradas: number; saidas: number };

const SERIE_FAKE: Linha[] = [
  { mes: "Nov", entradas: 142000, saidas: 128000 },
  { mes: "Dez", entradas: 168000, saidas: 134000 },
  { mes: "Jan", entradas: 125000, saidas: 142000 },
  { mes: "Fev", entradas: 155000, saidas: 138000 },
  { mes: "Mar", entradas: 184000, saidas: 151000 },
  { mes: "Abr", entradas: 96000, saidas: 88000 },
];

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function fmtAbrev(v: number) {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1000) return `R$ ${Math.round(v / 1000)}k`;
  return `R$ ${v}`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as Linha & { saldo: number };
  return (
    <div className="rounded-md border bg-white p-3 text-sm shadow-md" style={{ borderColor: "#E8ECF2" }}>
      <p className="mb-1 font-medium">{label}</p>
      <p style={{ color: "#12B76A" }}>Entradas: {fmtBRL(row.entradas)}</p>
      <p style={{ color: "#E53935" }}>Saídas: {fmtBRL(row.saidas)}</p>
      <p className="mt-1 font-medium" style={{ color: row.saldo >= 0 ? "#12B76A" : "#E53935" }}>
        Saldo: {fmtBRL(row.saldo)}
      </p>
    </div>
  );
}

function KpiCard({
  label, valor, hint, icon, color,
}: { label: string; valor: string; hint?: string; icon: React.ReactNode; color: string }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-medium tabular-nums" style={{ color }}>{valor}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className="rounded-md p-2" style={{ background: `${color}1A`, color }}>{icon}</div>
      </CardContent>
    </Card>
  );
}

export function FluxoCaixaCard() {
  const [periodo, setPeriodo] = useState<"6m" | "3m">("6m");

  const data = useMemo(() => {
    const base = periodo === "3m" ? SERIE_FAKE.slice(-3) : SERIE_FAKE;
    return base.map((d) => ({ ...d, saldo: d.entradas - d.saidas }));
  }, [periodo]);

  const totalEntradas = data.reduce((s, d) => s + d.entradas, 0);
  const totalSaidas = data.reduce((s, d) => s + d.saidas, 0);
  const saldoLiquido = totalEntradas - totalSaidas;
  const mesAtual = data[data.length - 1];
  const mesAnterior = data[data.length - 2];
  const variacao = mesAnterior
    ? ((mesAtual.saldo - mesAnterior.saldo) / Math.max(Math.abs(mesAnterior.saldo), 1)) * 100
    : 0;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard
          label="Entradas no período"
          valor={fmtBRL(totalEntradas)}
          hint={`${data.length} meses`}
          icon={<ArrowUpRight className="h-5 w-5" />}
          color="#12B76A"
        />
        <KpiCard
          label="Saídas no período"
          valor={fmtBRL(totalSaidas)}
          hint={`${data.length} meses`}
          icon={<ArrowDownRight className="h-5 w-5" />}
          color="#E53935"
        />
        <KpiCard
          label="Saldo líquido"
          valor={fmtBRL(saldoLiquido)}
          hint={saldoLiquido >= 0 ? "Resultado positivo" : "Resultado negativo"}
          icon={<Wallet className="h-5 w-5" />}
          color={saldoLiquido >= 0 ? "#12B76A" : "#E53935"}
        />
        <KpiCard
          label="Saldo do mês atual"
          valor={fmtBRL(mesAtual?.saldo ?? 0)}
          hint={
            mesAnterior
              ? `${variacao >= 0 ? "↑" : "↓"} ${Math.abs(variacao).toFixed(0)}% vs mês anterior`
              : undefined
          }
          icon={<Wallet className="h-5 w-5" />}
          color={(mesAtual?.saldo ?? 0) >= 0 ? "#1E6FBF" : "#E53935"}
        />
      </div>

      {/* Gráfico */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Entradas × Saídas</CardTitle>
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as "6m" | "3m")}>
            <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">Últimos 3 meses</SelectItem>
              <SelectItem value="6m">Últimos 6 meses</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#E8ECF2" vertical={false} />
                <XAxis dataKey="mes" tick={{ fill: "#6B7A90", fontSize: 12 }} axisLine={{ stroke: "#E8ECF2" }} tickLine={false} />
                <YAxis tickFormatter={fmtAbrev} tick={{ fill: "#6B7A90", fontSize: 12 }} axisLine={false} tickLine={false} width={70} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F5F7FA" }} />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: "#6B7A90" }}
                  formatter={(v) => (v === "entradas" ? "Entradas" : "Saídas")}
                />
                <ReferenceLine y={0} stroke="#B0BAC9" />
                <Bar dataKey="entradas" fill="#12B76A" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Bar dataKey="saidas" fill="#E53935" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tabela mensal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border" style={{ borderColor: "#E8ECF2" }}>
            <table className="w-full text-sm">
              <thead style={{ background: "#F5F7FA", color: "#6B7A90" }}>
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Mês</th>
                  <th className="px-3 py-2 text-right font-medium">Entradas</th>
                  <th className="px-3 py-2 text-right font-medium">Saídas</th>
                  <th className="px-3 py-2 text-right font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "#E8ECF2" }}>
                {data.map((row) => (
                  <tr key={row.mes}>
                    <td className="px-3 py-2">{row.mes}</td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: "#12B76A" }}>
                      {fmtBRL(row.entradas)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: "#E53935" }}>
                      {fmtBRL(row.saidas)}
                    </td>
                    <td
                      className="px-3 py-2 text-right font-medium tabular-nums"
                      style={{ color: row.saldo >= 0 ? "#12B76A" : "#E53935" }}
                    >
                      {fmtBRL(row.saldo)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot style={{ background: "#F5F7FA" }}>
                <tr className="font-medium">
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtBRL(totalEntradas)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtBRL(totalSaidas)}</td>
                  <td
                    className="px-3 py-2 text-right tabular-nums"
                    style={{ color: saldoLiquido >= 0 ? "#12B76A" : "#E53935" }}
                  >
                    {fmtBRL(saldoLiquido)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
