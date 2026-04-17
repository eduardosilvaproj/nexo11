import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Props = { mes: string; lojaId: string };

function monthRange(mes: string) {
  const [y, m] = mes.split("-").map(Number);
  const inicio = new Date(y, m - 1, 1).toISOString();
  const fim = new Date(y, m, 1).toISOString();
  return { inicio, fim };
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function margemColor(m: number) {
  if (m >= 25) return "#12B76A";
  if (m >= 15) return "#E8A020";
  return "#D92D20";
}

export function VendedoresRankingCard({ mes, lojaId }: Props) {
  const [orderBy, setOrderBy] = useState<"margem" | "faturamento">("faturamento");
  const { inicio, fim } = monthRange(mes);

  const { data: rows = [] } = useQuery({
    queryKey: ["ranking-vendedores", mes, lojaId],
    queryFn: async () => {
      // Contratos do mês
      let cq = supabase
        .from("vw_contratos_dre")
        .select("vendedor_id, valor_venda, margem_realizada")
        .gte("data_criacao", inicio)
        .lt("data_criacao", fim);
      if (lojaId !== "all") cq = cq.eq("loja_id", lojaId);
      const { data: contratos } = await cq;

      // Leads do mês
      let lq = supabase
        .from("leads")
        .select("vendedor_id, status")
        .gte("data_entrada", inicio)
        .lt("data_entrada", fim);
      if (lojaId !== "all") lq = lq.eq("loja_id", lojaId);
      const { data: leads } = await lq;

      const map = new Map<
        string,
        { contratos: number; faturamento: number; sumMW: number; w: number; leads: number; conv: number }
      >();
      const ensure = (id: string) => {
        if (!map.has(id))
          map.set(id, { contratos: 0, faturamento: 0, sumMW: 0, w: 0, leads: 0, conv: 0 });
        return map.get(id)!;
      };

      (contratos ?? []).forEach((c: any) => {
        if (!c.vendedor_id) return;
        const b = ensure(c.vendedor_id);
        const v = Number(c.valor_venda ?? 0);
        b.contratos += 1;
        b.faturamento += v;
        if (v > 0 && c.margem_realizada != null) {
          b.sumMW += Number(c.margem_realizada) * v;
          b.w += v;
        }
      });
      (leads ?? []).forEach((l: any) => {
        if (!l.vendedor_id) return;
        const b = ensure(l.vendedor_id);
        b.leads += 1;
        if (l.status === "convertido") b.conv += 1;
      });

      const ids = Array.from(map.keys());
      if (ids.length === 0) return [];
      const { data: users } = await supabase
        .from("usuarios_publico")
        .select("id, nome")
        .in("id", ids);
      const nomes = new Map((users ?? []).map((u: any) => [u.id, u.nome as string]));

      return Array.from(map.entries()).map(([id, b]) => ({
        id,
        nome: nomes.get(id) ?? "—",
        contratos: b.contratos,
        faturamento: b.faturamento,
        margem: b.w > 0 ? b.sumMW / b.w : 0,
        conversao: b.leads > 0 ? (b.conv / b.leads) * 100 : 0,
      }));
    },
  });

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) =>
      orderBy === "margem" ? b.margem - a.margem : b.faturamento - a.faturamento
    );
  }, [rows, orderBy]);

  const ToggleBtn = ({ value, label }: { value: "margem" | "faturamento"; label: string }) => {
    const active = orderBy === value;
    return (
      <button
        onClick={() => setOrderBy(value)}
        style={{
          fontSize: 12,
          fontWeight: 500,
          padding: "4px 10px",
          borderRadius: 4,
          border: "1px solid #E5E7EB",
          background: active ? "#1E6FBF" : "#fff",
          color: active ? "#fff" : "#0D1117",
          cursor: "pointer",
        }}
      >
        {label}
      </button>
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
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
          gap: 8,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: "#0D1117" }}>Ranking — mês atual</div>
        <div style={{ display: "flex", gap: 6 }}>
          <ToggleBtn value="margem" label="Por margem" />
          <ToggleBtn value="faturamento" label="Por faturamento" />
        </div>
      </div>

      {sorted.length === 0 ? (
        <div style={{ fontSize: 13, color: "#6B7A90", padding: 16, textAlign: "center" }}>
          Sem dados de vendedores no período.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: "#6B7A90", fontSize: 11, textTransform: "uppercase" }}>
                <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 500 }}>#</th>
                <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 500 }}>Vendedor</th>
                <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 500 }}>Contratos</th>
                <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 500 }}>
                  Faturamento
                </th>
                <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 500 }}>Margem</th>
                <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 500 }}>
                  Conversão
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => {
                const top = i === 0;
                return (
                  <tr
                    key={r.id}
                    style={{
                      background: top ? "#F0FDF9" : "transparent",
                      borderTop: "1px solid #EEF1F5",
                    }}
                  >
                    <td style={{ padding: "8px", color: "#6B7A90", fontWeight: 600 }}>{i + 1}</td>
                    <td style={{ padding: "8px", color: "#0D1117", fontWeight: 500 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {r.nome}
                        {top && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: "#05873C",
                              background: "#D1FADF",
                              padding: "2px 6px",
                              borderRadius: 4,
                            }}
                          >
                            Top ↑
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "8px", textAlign: "right", color: "#0D1117" }}>
                      {r.contratos}
                    </td>
                    <td style={{ padding: "8px", textAlign: "right", color: "#0D1117" }}>
                      {fmtBRL(r.faturamento)}
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        textAlign: "right",
                        fontWeight: 600,
                        color: margemColor(r.margem),
                      }}
                    >
                      {r.margem.toFixed(1)}%
                    </td>
                    <td style={{ padding: "8px", textAlign: "right", color: "#0D1117" }}>
                      {r.conversao.toFixed(0)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
