import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine,
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

function SemanaTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as { entradas: number; saidas: number; acumulado: number };
  return (
    <div className="rounded-md border bg-white p-3 text-sm shadow-md" style={{ borderColor: "#E8ECF2" }}>
      <p className="mb-1 font-medium">{label}</p>
      <p style={{ color: "#1E6FBF" }}>Entradas: {fmtBRL(row.entradas)}</p>
      <p style={{ color: "#D85A30" }}>Saídas: {fmtBRL(row.saidas)}</p>
      <p className="mt-1 font-medium" style={{ color: row.acumulado >= 0 ? "#12B76A" : "#E53935" }}>
        Saldo acumulado: {fmtBRL(row.acumulado)}
      </p>
    </div>
  );

function KpiCard({
  label, valor, hint, icon, color, topBorder,
}: { label: string; valor: string; hint?: string; icon: React.ReactNode; color: string; topBorder?: string }) {
  return (
    <Card style={topBorder ? { borderTop: `3px solid ${topBorder}` } : undefined}>
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
  const [mesAtivo, setMesAtivo] = useState<Date>(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

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

  // Previstos do mês ativo (sem dados reais ainda → R$ 0)
  const entradasPrevistas = 0;
  const saidasPrevistas = 0;
  const saldoProjetado = entradasPrevistas - saidasPrevistas;
  const saldoColor = saldoProjetado >= 0 ? "#12B76A" : "#E53935";

  // Série semanal do mês ativo (mock baseado nos previstos / fallback realista)
  const dataSemanal = useMemo(() => {
    const baseEntrada = entradasPrevistas > 0 ? entradasPrevistas / 4 : 38000;
    const baseSaida = saidasPrevistas > 0 ? saidasPrevistas / 4 : 32000;
    const variacoes = [0.85, 1.1, 0.95, 1.1];
    let acumulado = 0;
    return variacoes.map((v, i) => {
      const entradas = Math.round(baseEntrada * v);
      const saidas = Math.round(baseSaida * (2 - v));
      acumulado += entradas - saidas;
      return { semana: `Sem ${i + 1}`, entradas, saidas, acumulado };
    });
  }, [entradasPrevistas, saidasPrevistas]);

  return (
    <div className="space-y-4">
      {/* Header de navegação por mês */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMesAtivo((d) => shiftMes(d, -1))}
            className="gap-1 text-[#6B7A90] hover:text-[#1E6FBF]"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="text-sm">{labelMes(shiftMes(mesAtivo, -1))}</span>
          </Button>
          <span className="min-w-[140px] text-center text-base font-medium">
            {labelMes(mesAtivo)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMesAtivo((d) => shiftMes(d, 1))}
            className="gap-1 text-[#6B7A90] hover:text-[#1E6FBF]"
          >
            <span className="text-sm">{labelMes(shiftMes(mesAtivo, 1))}</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button
          size="sm"
          className="text-white hover:opacity-90"
          style={{ background: "#1E6FBF" }}
          onClick={() => {/* TODO: abrir dialog de novo lançamento */}}
        >
          <Plus className="mr-1 h-4 w-4" /> Lançamento
        </Button>
      </div>

      {/* Cards de previsão do mês ativo */}
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label="Entradas previstas"
          valor={fmtBRL(entradasPrevistas)}
          icon={<ArrowUpRight className="h-5 w-5" />}
          color="#12B76A"
          topBorder="#12B76A"
        />
        <KpiCard
          label="Saídas previstas"
          valor={fmtBRL(saidasPrevistas)}
          icon={<ArrowDownRight className="h-5 w-5" />}
          color="#E53935"
          topBorder="#E53935"
        />
        <KpiCard
          label="Saldo projetado"
          valor={fmtBRL(saldoProjetado)}
          icon={<Wallet className="h-5 w-5" />}
          color={saldoColor}
          topBorder="#1E6FBF"
        />
      </div>

      {/* KPIs do período */}
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

      {/* Gráfico semanal — entradas, saídas e saldo acumulado */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Movimentação semanal — {labelMes(mesAtivo)}</CardTitle>
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
              <ComposedChart data={dataSemanal} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#E8ECF2" vertical={false} />
                <XAxis dataKey="semana" tick={{ fill: "#6B7A90", fontSize: 12 }} axisLine={{ stroke: "#E8ECF2" }} tickLine={false} />
                <YAxis tickFormatter={fmtAbrev} tick={{ fill: "#6B7A90", fontSize: 12 }} axisLine={false} tickLine={false} width={70} />
                <Tooltip content={<SemanaTooltip />} cursor={{ fill: "#F5F7FA" }} />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: "#6B7A90" }}
                  formatter={(v) =>
                    v === "entradas" ? "Entradas" : v === "saidas" ? "Saídas" : "Saldo acumulado"
                  }
                />
                <ReferenceLine y={0} stroke="#B0BAC9" />
                <Bar dataKey="entradas" fill="#1E6FBF" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="saidas" fill="#D85A30" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Line
                  type="monotone"
                  dataKey="acumulado"
                  stroke="#0D1117"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: "#0D1117" }}
                />
              </ComposedChart>
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
