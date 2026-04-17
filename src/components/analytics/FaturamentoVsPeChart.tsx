import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Row = { mes: string; faturamento: number; pe: number };

const DATA: Row[] = [
  { mes: "Nov", faturamento: 142000, pe: 135000 },
  { mes: "Dez", faturamento: 168000, pe: 135000 },
  { mes: "Jan", faturamento: 125000, pe: 148000 },
  { mes: "Fev", faturamento: 155000, pe: 148000 },
  { mes: "Mar", faturamento: 184000, pe: 148000 },
  { mes: "Abr", faturamento: 0, pe: 155000 },
];

const fmt = (v: number) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${Math.round(v / 1000)}k`;
  return `R$ ${v}`;
};

const fmtFull = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const fat = payload.find((p: any) => p.dataKey === "faturamento")?.value ?? 0;
  const pe = payload.find((p: any) => p.dataKey === "pe")?.value ?? 0;
  const diff = fat - pe;
  const positivo = diff >= 0;
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E5E7EB",
        borderRadius: 6,
        padding: "8px 10px",
        fontSize: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ fontWeight: 600, color: "#0D1117", marginBottom: 4 }}>{label}</div>
      <div style={{ color: "#1E6FBF" }}>Faturamento: {fmtFull(fat)}</div>
      <div style={{ color: "#E8A020" }}>PE: {fmtFull(pe)}</div>
      <div
        style={{
          marginTop: 4,
          fontWeight: 600,
          color: positivo ? "#12B76A" : "#D92D20",
        }}
      >
        {positivo ? "Lucro" : "Déficit"}: {fmtFull(Math.abs(diff))}
      </div>
    </div>
  );
}

export function FaturamentoVsPeChart() {
  // diffPos: shown when faturamento > pe (green band on top of pe up to faturamento)
  // diffNeg: shown when faturamento < pe (red band on top of faturamento up to pe)
  const data = DATA.map((d) => {
    const positivo = d.faturamento >= d.pe;
    const base = positivo ? d.pe : d.faturamento;
    const delta = Math.abs(d.faturamento - d.pe);
    return {
      ...d,
      bandBase: base,
      bandPos: positivo ? delta : 0,
      bandNeg: positivo ? 0 : delta,
    };
  });

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E5E7EB",
        borderRadius: 8,
        padding: 16,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, color: "#0D1117", marginBottom: 12 }}>
        Faturamento vs Ponto de equilíbrio
      </div>
      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="fatFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1E6FBF" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#1E6FBF" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" vertical={false} />
            <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#6B7A90" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 12, fill: "#6B7A90" }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />

            {/* Invisible base for stacking the difference bands */}
            <Area
              type="monotone"
              dataKey="bandBase"
              stackId="band"
              stroke="none"
              fill="transparent"
              isAnimationActive={false}
              activeDot={false}
            />
            <Area
              type="monotone"
              dataKey="bandPos"
              stackId="band"
              stroke="none"
              fill="#12B76A"
              fillOpacity={0.18}
              isAnimationActive={false}
              activeDot={false}
            />
            <Area
              type="monotone"
              dataKey="bandNeg"
              stackId="band"
              stroke="none"
              fill="#D92D20"
              fillOpacity={0.15}
              isAnimationActive={false}
              activeDot={false}
            />

            {/* Faturamento area + line */}
            <Area
              type="monotone"
              dataKey="faturamento"
              stroke="#1E6FBF"
              strokeWidth={2}
              fill="url(#fatFill)"
            />

            {/* PE dotted line */}
            <Line
              type="monotone"
              dataKey="pe"
              stroke="#E8A020"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
