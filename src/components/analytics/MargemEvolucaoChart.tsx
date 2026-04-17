import {
  Area,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Row = { mes: string; prevista: number; realizada: number };

const DATA: Row[] = [
  { mes: "Nov", prevista: 32, realizada: 28 },
  { mes: "Dez", prevista: 34, realizada: 35 },
  { mes: "Jan", prevista: 30, realizada: 22 },
  { mes: "Fev", prevista: 31, realizada: 29 },
  { mes: "Mar", prevista: 33, realizada: 34 },
  { mes: "Abr", prevista: 32, realizada: 30 },
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const prev = payload.find((p: any) => p.dataKey === "prevista")?.value ?? 0;
  const real = payload.find((p: any) => p.dataKey === "realizada")?.value ?? 0;
  const desvio = real - prev;
  const positivo = desvio >= 0;
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
      <div style={{ color: "#1E6FBF" }}>Prevista: {prev}%</div>
      <div style={{ color: "#12B76A" }}>Realizada: {real}%</div>
      <div
        style={{
          marginTop: 4,
          fontWeight: 600,
          color: positivo ? "#12B76A" : "#D92D20",
        }}
      >
        Desvio: {positivo ? "+" : ""}
        {desvio.toFixed(1)} pp
      </div>
    </div>
  );
}

export function MargemEvolucaoChart() {
  // Build stacked bands so the area between the two lines is colored
  const data = DATA.map((d) => {
    const positivo = d.realizada >= d.prevista;
    const base = Math.min(d.prevista, d.realizada);
    const delta = Math.abs(d.realizada - d.prevista);
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
        height: "100%",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, color: "#0D1117", marginBottom: 12 }}>
        Margem prevista vs realizada
      </div>
      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" vertical={false} />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 12, fill: "#6B7A90" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 60]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 12, fill: "#6B7A90" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />

            <ReferenceLine
              y={30}
              stroke="#E8A020"
              strokeDasharray="5 4"
              strokeWidth={1.5}
              label={{
                value: "Meta 30%",
                position: "insideTopRight",
                fill: "#E8A020",
                fontSize: 11,
                fontWeight: 600,
              }}
            />

            {/* Stacked bands to color the area between the two lines */}
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

            <Line
              type="monotone"
              dataKey="prevista"
              stroke="#1E6FBF"
              strokeWidth={2}
              dot={{ r: 3, fill: "#1E6FBF" }}
            />
            <Line
              type="monotone"
              dataKey="realizada"
              stroke="#12B76A"
              strokeWidth={2}
              dot={{ r: 3, fill: "#12B76A" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
