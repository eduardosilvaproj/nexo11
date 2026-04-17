import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type Props = { mes: string; lojaId: string };

function monthRange(mes: string) {
  const [y, m] = mes.split("-").map(Number);
  const inicio = new Date(y, m - 1, 1).toISOString();
  const fim = new Date(y, m, 1).toISOString();
  return { inicio, fim };
}

export function MargemAlertasCard({ mes, lojaId }: Props) {
  const { inicio, fim } = monthRange(mes);

  const { data: top = [] } = useQuery({
    queryKey: ["margem-alertas", mes, lojaId],
    queryFn: async () => {
      let q = supabase
        .from("vw_contratos_dre")
        .select("id, cliente_nome, margem_prevista, margem_realizada")
        .gte("data_criacao", inicio)
        .lt("data_criacao", fim);
      if (lojaId !== "all") q = q.eq("loja_id", lojaId);
      const { data } = await q;
      const rows = (data ?? [])
        .map((r) => {
          const prev = Number(r.margem_prevista ?? 0);
          const real = Number(r.margem_realizada ?? 0);
          return {
            id: r.id as string,
            cliente: r.cliente_nome as string,
            prev,
            real,
            desvio: real - prev,
          };
        })
        .filter((r) => r.desvio < -0.5)
        .sort((a, b) => a.desvio - b.desvio)
        .slice(0, 3);
      return rows;
    },
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
        Contratos com maior perda de margem
      </div>

      {top.length === 0 ? (
        <div
          style={{
            background: "#F0FDF9",
            color: "#05873C",
            borderRadius: 6,
            padding: "16px 12px",
            fontSize: 13,
            fontWeight: 500,
            textAlign: "center",
          }}
        >
          Nenhum desvio crítico no período ✓
        </div>
      ) : (
        <ul style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {top.map((r) => (
            <li
              key={r.id}
              style={{
                border: "1px solid #EEF1F5",
                borderRadius: 6,
                padding: 10,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: "#0D1117" }}>
                  #{r.id.slice(0, 6)} · {r.cliente}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#D92D20" }}>
                  ▼ {r.desvio.toFixed(1)}pp
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#6B7A90" }}>
                Margem: {r.prev.toFixed(1)}% → {r.real.toFixed(1)}%
              </div>
              <Link
                to={`/contratos/${r.id}?tab=dre`}
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#1E6FBF",
                  marginTop: 2,
                }}
              >
                Ver DRE →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
