import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Props = { mes: string; lojaId: string };

const CORES = ["#B5D4F4", "#85B7EB", "#378ADD", "#185FA5", "#12B76A"];
const LABELS = ["Entrada", "Atendimento", "Visita", "Proposta", "Convertido"];
// Cumulative stages: each stage counts leads that reached it or beyond
const ORDEM = ["novo", "atendimento", "visita", "proposta", "convertido"];

function monthRange(mes: string) {
  const [y, m] = mes.split("-").map(Number);
  return {
    inicio: new Date(y, m - 1, 1).toISOString(),
    fim: new Date(y, m, 1).toISOString(),
  };
}

export function FunilLeadsChart({ mes, lojaId }: Props) {
  const { inicio, fim } = monthRange(mes);

  const { data: rawCounts } = useQuery({
    queryKey: ["funil-leads", mes, lojaId],
    queryFn: async () => {
      let q = supabase
        .from("leads")
        .select("status")
        .gte("data_entrada", inicio)
        .lt("data_entrada", fim);
      if (lojaId !== "all") q = q.eq("loja_id", lojaId);
      const { data } = await q;
      const acc: Record<string, number> = {};
      (data ?? []).forEach((l: any) => {
        acc[l.status] = (acc[l.status] ?? 0) + 1;
      });
      return acc;
    },
  });

  const counts = rawCounts ?? {};
  // Cumulative: a lead at "proposta" already passed through "novo", "atendimento", "visita"
  const cumulative = ORDEM.map((_, i) =>
    ORDEM.slice(i).reduce((s, k) => s + (counts[k] ?? 0), 0)
  );
  const total = cumulative[0];
  const convertidos = counts["convertido"] ?? 0;
  const taxa = total > 0 ? (convertidos / total) * 100 : 0;

  const data = LABELS.map((label, i) => ({
    etapa: label,
    valor: cumulative[i],
    cor: CORES[i],
    pct: total > 0 ? Math.round((cumulative[i] / total) * 100) : 0,
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
