import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

type Etapa = { etapa: string; valor: number; cor: string };

const ETAPAS: Etapa[] = [
  { etapa: "Entrada", valor: 41, cor: "#B5D4F4" },
  { etapa: "Atendimento", valor: 32, cor: "#85B7EB" },
  { etapa: "Visita", valor: 18, cor: "#378ADD" },
  { etapa: "Proposta", valor: 13, cor: "#185FA5" },
  { etapa: "Convertido", valor: 8, cor: "#12B76A" },
];

export function FunilLeadsChart() {
  const total = ETAPAS[0].valor;
  const convertidos = ETAPAS[ETAPAS.length - 1].valor;
  const taxa = total > 0 ? (convertidos / total) * 100 : 0;

  const data = ETAPAS.map((e) => ({
    ...e,
    pct: total > 0 ? Math.round((e.valor / total) * 100) : 0,
  }));

  const taxaColor = taxa >= 20 ? "#12B76A" : taxa >= 10 ? "#E8A020" : "#D92D20";

  const renderLabel = (props: any) => {
    const { x, y, width, height, index } = props;
    const row = data[index];
    return (
      <text
        x={x + width + 8}
        y={y + height / 2}
        dominantBaseline="middle"
        fontSize={12}
        fill="#0D1117"
      >
        <tspan fontWeight={600}>{row.valor} leads</tspan>
        <tspan fill="#6B7A90"> · {row.pct}%</tspan>
      </text>
    );
  };

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E5E7EB",
        borderRadius: 8,
        padding: 16,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, color: "#0D1117", marginBottom: 12 }}>
        Funil de leads — mês atual
      </div>

      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 4, right: 80, left: 8, bottom: 0 }}
            barCategoryGap={8}
          >
            <XAxis type="number" hide domain={[0, total * 1.05]} />
            <YAxis
              type="category"
              dataKey="etapa"
              tick={{ fontSize: 12, fill: "#6B7A90" }}
              axisLine={false}
              tickLine={false}
              width={90}
            />
            <Bar dataKey="valor" radius={[0, 4, 4, 0]} label={renderLabel}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.cor} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div
        style={{
          marginTop: 8,
          paddingTop: 8,
          borderTop: "1px solid #EEF1F5",
          fontSize: 13,
          fontWeight: 600,
          color: taxaColor,
          textAlign: "center",
        }}
      >
        {taxa.toFixed(1).replace(".", ",")}% de conversão lead → contrato
      </div>
    </div>
  );
}
