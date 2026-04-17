import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Row = { mes: string; pe: number; faturamento: number };

const DATA: Row[] = [
  { mes: "Nov", pe: 135000, faturamento: 142000 },
  { mes: "Dez", pe: 135000, faturamento: 168000 },
  { mes: "Jan", pe: 148000, faturamento: 125000 },
  { mes: "Fev", pe: 148000, faturamento: 155000 },
  { mes: "Mar", pe: 148000, faturamento: 184000 },
  { mes: "Abr", pe: 155000, faturamento: 0 },
];

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function fmtAbrev(v: number) {
  if (v >= 1000) return `R$ ${Math.round(v / 1000)}k`;
  return `R$ ${v}`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as Row;
  const diff = row.faturamento - row.pe;
  const isLucro = diff >= 0;
  return (
    <div
      className="rounded-md border bg-white p-3 text-sm shadow-md"
      style={{ borderColor: "#E8ECF2" }}
    >
      <p className="mb-1 font-medium">{label}</p>
      <p style={{ color: "#1E6FBF" }}>PE do mês: {fmtBRL(row.pe)}</p>
      <p style={{ color: "#12B76A" }}>Faturamento: {fmtBRL(row.faturamento)}</p>
      <p className="mt-1 font-medium" style={{ color: isLucro ? "#12B76A" : "#E53935" }}>
        {isLucro ? `Lucro de ${fmtBRL(diff)}` : `Déficit de ${fmtBRL(Math.abs(diff))}`}
      </p>
    </div>
  );
}

export function HistoricoPECard() {
  // Build segments to color the gap area: green where fat>=pe, red where fat<pe
  const enriched = DATA.map((d) => ({
    ...d,
    lucro: d.faturamento >= d.pe ? d.faturamento - d.pe : 0,
    deficit: d.faturamento < d.pe ? d.pe - d.faturamento : 0,
    base: Math.min(d.pe, d.faturamento),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Histórico — PE vs Faturamento</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={enriched} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="peFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1E6FBF" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#1E6FBF" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="fatFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#12B76A" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#12B76A" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#E8ECF2" vertical={false} />
              <XAxis dataKey="mes" tick={{ fill: "#6B7A90", fontSize: 12 }} axisLine={{ stroke: "#E8ECF2" }} tickLine={false} />
              <YAxis tickFormatter={fmtAbrev} tick={{ fill: "#6B7A90", fontSize: 12 }} axisLine={false} tickLine={false} width={70} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, color: "#6B7A90" }}
                formatter={(v) => (v === "pe" ? "PE calculado" : v === "faturamento" ? "Faturamento real" : v)}
                payload={[
                  { value: "pe", type: "line", color: "#1E6FBF" },
                  { value: "faturamento", type: "line", color: "#12B76A" },
                ]}
              />
              {/* Stacked invisible base + lucro/déficit to color the gap area */}
              <Area type="monotone" dataKey="base" stackId="gap" stroke="none" fill="transparent" legendType="none" tooltipType="none" />
              <Area type="monotone" dataKey="lucro" stackId="gap" stroke="none" fill="#12B76A" fillOpacity={0.18} legendType="none" tooltipType="none" />
              <Area type="monotone" dataKey="deficit" stackId="gap" stroke="none" fill="#E53935" fillOpacity={0.15} legendType="none" tooltipType="none" />

              {/* Main lines + faint area fill */}
              <Area type="monotone" dataKey="pe" stroke="#1E6FBF" strokeWidth={1.5} fill="url(#peFill)" />
              <Area type="monotone" dataKey="faturamento" stroke="#12B76A" strokeWidth={1.5} fill="url(#fatFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
