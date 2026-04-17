import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Props = { lojaId: string };

const ETAPAS: { key: string; label: string; cor: string }[] = [
  { key: "comercial", label: "Comercial", cor: "#1E6FBF" },
  { key: "tecnico", label: "Técnico", cor: "#534AB7" },
  { key: "producao", label: "Produção", cor: "#D85A30" },
  { key: "logistica", label: "Logística", cor: "#12B76A" },
  { key: "montagem", label: "Montagem", cor: "#1D9E75" },
  { key: "pos_venda", label: "Pós-venda", cor: "#E8A020" },
  { key: "finalizado", label: "Finalizado", cor: "#05873C" },
];

export function PipelineCard({ lojaId }: Props) {
  const { data: counts = {} } = useQuery({
    queryKey: ["pipeline", lojaId],
    queryFn: async () => {
      let q = supabase.from("contratos").select("status");
      if (lojaId !== "all") q = q.eq("loja_id", lojaId);
      const { data } = await q;
      const acc: Record<string, number> = {};
      (data ?? []).forEach((r: any) => {
        acc[r.status] = (acc[r.status] ?? 0) + 1;
      });
      return acc;
    },
  });

  const rows = ETAPAS.map((e) => ({ ...e, valor: counts[e.key] ?? 0 }));
  const max = Math.max(1, ...rows.map((r) => r.valor));
  const ativos = rows.filter((r) => r.key !== "finalizado").reduce((s, r) => s + r.valor, 0);

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
        Pipeline atual
      </div>

      <ul style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        {rows.map((r) => (
          <li key={r.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: r.cor,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 13, color: "#0D1117", width: 90, flexShrink: 0 }}>
              {r.label}
            </span>
            <div
              style={{
                flex: 1,
                height: 8,
                background: "#F1F4F8",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${(r.valor / max) * 100}%`,
                  height: "100%",
                  background: r.cor,
                  borderRadius: 4,
                  transition: "width 200ms",
                }}
              />
            </div>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#0D1117",
                width: 32,
                textAlign: "right",
              }}
            >
              {r.valor}
            </span>
          </li>
        ))}
      </ul>

      <div
        style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: "1px solid #EEF1F5",
          fontSize: 12,
          color: "#6B7A90",
          textAlign: "center",
        }}
      >
        <span style={{ fontWeight: 600, color: "#0D1117" }}>{ativos}</span> contratos ativos no
        pipeline
      </div>
    </div>
  );
}
