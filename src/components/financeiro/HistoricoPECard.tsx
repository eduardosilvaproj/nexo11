import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Row = { mes: string; pe: number; faturamento: number };

const FALLBACK: Row[] = [
  { mes: "Nov", pe: 135000, faturamento: 142000 },
  { mes: "Dez", pe: 135000, faturamento: 168000 },
  { mes: "Jan", pe: 148000, faturamento: 125000 },
  { mes: "Fev", pe: 148000, faturamento: 155000 },
  { mes: "Mar", pe: 148000, faturamento: 184000 },
  { mes: "Abr", pe: 155000, faturamento: 0 },
];

const MES_ABREV = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function fmtAbrev(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `R$ ${Math.round(v / 1000)}k`;
  return `R$ ${v}`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as Row;
  const diff = row.faturamento - row.pe;
  const isLucro = diff >= 0;
  return (
    <div className="rounded-md border bg-white p-3 text-sm shadow-md" style={{ borderColor: "#E8ECF2" }}>
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
  const { perfil } = useAuth();
  const lojaId = perfil?.loja_id ?? null;
  const [data, setData] = useState<Row[]>(FALLBACK);

  useEffect(() => {
    if (!lojaId) return;
    (async () => {
      // Last 6 months including current
      const start = new Date();
      start.setMonth(start.getMonth() - 5, 1);
      const startKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-01`;
      const { data: rows, error } = await supabase
        .from("vw_ponto_equilibrio")
        .select("mes, pe_calculado, faturamento_realizado")
        .eq("loja_id", lojaId)
        .gte("mes", startKey)
        .order("mes", { ascending: true });

      if (error || !rows || rows.length === 0) return; // keep fallback

      // Build a 6-month series, filling missing months with zeros
      const series: Row[] = [];
      for (let i = 0; i < 6; i++) {
        const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
        const found = rows.find((r: any) => String(r.mes).startsWith(key.slice(0, 7)));
        series.push({
          mes: MES_ABREV[d.getMonth()],
          pe: Number(found?.pe_calculado ?? 0),
          faturamento: Number(found?.faturamento_realizado ?? 0),
        });
      }
      // Se todos os valores forem zero, mantém o fallback para o gráfico ter escala
      const hasAny = series.some((r) => r.pe > 0 || r.faturamento > 0);
      if (hasAny) setData(series);
    })();
  }, [lojaId]);

  const enriched = data.map((d) => ({
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
              <YAxis tickFormatter={fmtAbrev} tick={{ fill: "#6B7A90", fontSize: 12 }} axisLine={false} tickLine={false} width={70} domain={[0, "auto"]} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, color: "#6B7A90" }}
                formatter={(v) => (v === "pe" ? "PE calculado" : v === "faturamento" ? "Faturamento real" : v)}
                payload={[
                  { value: "pe", type: "line", color: "#1E6FBF" },
                  { value: "faturamento", type: "line", color: "#12B76A" },
                ]}
              />
              <Area type="monotone" dataKey="base" stackId="gap" stroke="none" fill="transparent" legendType="none" tooltipType="none" />
              <Area type="monotone" dataKey="lucro" stackId="gap" stroke="none" fill="#12B76A" fillOpacity={0.18} legendType="none" tooltipType="none" />
              <Area type="monotone" dataKey="deficit" stackId="gap" stroke="none" fill="#E53935" fillOpacity={0.15} legendType="none" tooltipType="none" />
              <Area type="monotone" dataKey="pe" stroke="#1E6FBF" strokeWidth={1.5} fill="url(#peFill)" />
              <Area type="monotone" dataKey="faturamento" stroke="#12B76A" strokeWidth={1.5} fill="url(#fatFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
