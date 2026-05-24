import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Package, Truck, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  contratoId: string;
  compact?: boolean;
}

type Expedicao = {
  id: string;
  status: string;
  quantidade: number;
  observacoes: string | null;
  entregue_at: string | null;
  carregado_at: string | null;
  created_at: string | null;
  estoque_itens?: { descricao?: string | null; unidade?: string | null; codigo?: string | null } | null;
};

export type LiberacaoStatus = "liberada" | "parcial" | "aguardando" | "sem_materiais";

export function useMateriaisMontagemContrato(contratoId: string) {
  return useQuery({
    queryKey: ["materiais_montagem", contratoId],
    enabled: !!contratoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expedicoes_almoxarifado")
        .select("id, status, quantidade, observacoes, entregue_at, carregado_at, created_at, estoque_itens:item_id(descricao, unidade, codigo)")
        .eq("contrato_id", contratoId)
        .neq("status", "cancelado")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Expedicao[];
    },
  });
}

export function calcularLiberacao(expedicoes: Expedicao[]): {
  status: LiberacaoStatus;
  total: number;
  separados: number;
  carregados: number;
  entregues: number;
  pendentes: number;
} {
  const total = expedicoes.length;
  const separados = expedicoes.filter((e) => e.status === "separado").length;
  const carregados = expedicoes.filter((e) => e.status === "carregado").length;
  const entregues = expedicoes.filter((e) => e.status === "entregue").length;
  const pendentes = separados + carregados;

  let status: LiberacaoStatus;
  if (total === 0) status = "sem_materiais";
  else if (entregues === total) status = "liberada";
  else if (entregues > 0) status = "parcial";
  else status = "aguardando";

  return { status, total, separados, carregados, entregues, pendentes };
}

const BADGE: Record<LiberacaoStatus, { bg: string; fg: string; label: string }> = {
  liberada: { bg: "#D1FAE5", fg: "#05873C", label: "Liberada para montagem" },
  parcial: { bg: "#FEF3C7", fg: "#92400E", label: "Parcialmente entregue" },
  aguardando: { bg: "#FEE2E2", fg: "#B91C1C", label: "Aguardando materiais" },
  sem_materiais: { bg: "#F1F3F7", fg: "#6B7A90", label: "Sem materiais vinculados" },
};

export function LiberacaoBadge({ status }: { status: LiberacaoStatus }) {
  const b = BADGE[status];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5"
      style={{ fontSize: 11, fontWeight: 500, backgroundColor: b.bg, color: b.fg }}
    >
      {status === "liberada" && <CheckCircle2 className="h-3 w-3" />}
      {status === "aguardando" && <AlertTriangle className="h-3 w-3" />}
      {status === "parcial" && <Clock className="h-3 w-3" />}
      {b.label}
    </span>
  );
}

const STATUS_ITEM: Record<string, { bg: string; fg: string; label: string }> = {
  separado: { bg: "#E3F0FB", fg: "#1E6FBF", label: "Separado" },
  carregado: { bg: "#FEF3C7", fg: "#92400E", label: "Carregado" },
  entregue: { bg: "#D1FAE5", fg: "#05873C", label: "Entregue" },
};

export function MateriaisMontagemResumo({ contratoId, compact = false }: Props) {
  const { data: expedicoes = [], isLoading, error } = useMateriaisMontagemContrato(contratoId);
  const resumo = calcularLiberacao(expedicoes);

  if (isLoading) {
    return (
      <div className="rounded-xl bg-white p-4" style={{ border: "0.5px solid #E8ECF2" }}>
        <span style={{ fontSize: 12, color: "#6B7A90" }}>Carregando materiais...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-white p-4" style={{ border: "0.5px solid #E8ECF2" }}>
        <span style={{ fontSize: 12, color: "#B91C1C" }}>Erro ao carregar materiais.</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white" style={{ border: "0.5px solid #E8ECF2", padding: compact ? 14 : 20 }}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4" style={{ color: "#1E6FBF" }} />
          <h3 style={{ fontSize: 14, fontWeight: 500, color: "#0D1117" }}>Materiais da obra</h3>
        </div>
        <LiberacaoBadge status={resumo.status} />
      </div>

      {resumo.status === "aguardando" || resumo.status === "parcial" ? (
        <div
          className="mb-3 flex items-start gap-2 rounded-md p-2.5"
          style={{ backgroundColor: "#FEF3C7", border: "0.5px solid #FBBF24" }}
        >
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#92400E" }} />
          <span style={{ fontSize: 12, color: "#92400E" }}>
            Atenção: existem materiais ainda não entregues para esta obra.
          </span>
        </div>
      ) : null}

      {resumo.total === 0 ? (
        <span style={{ fontSize: 13, color: "#6B7A90" }}>
          Nenhum material de almoxarifado vinculado a esta montagem.
        </span>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-5">
            <Stat label="Total" value={resumo.total} />
            <Stat label="Separados" value={resumo.separados} color="#1E6FBF" />
            <Stat label="Carregados" value={resumo.carregados} color="#92400E" />
            <Stat label="Entregues" value={resumo.entregues} color="#05873C" />
            <Stat label="Pendentes" value={resumo.pendentes} color="#B91C1C" />
          </div>

          {!compact && (
            <div className="overflow-x-auto">
              <table className="w-full" style={{ minWidth: 480 }}>
                <thead style={{ backgroundColor: "#F7F9FC" }}>
                  <tr>
                    {["Item", "Qtd", "Status", "Data entrega", "Obs"].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-left"
                        style={{ fontSize: 10, color: "#6B7A90", fontWeight: 500, textTransform: "uppercase" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {expedicoes.map((e) => {
                    const s = STATUS_ITEM[e.status] ?? STATUS_ITEM.separado;
                    return (
                      <tr key={e.id} style={{ borderTop: "0.5px solid #E8ECF2" }}>
                        <td className="px-3 py-2" style={{ fontSize: 12, color: "#0D1117" }}>
                          {e.estoque_itens?.descricao ?? "—"}
                          {e.estoque_itens?.codigo && (
                            <div style={{ fontSize: 10, color: "#6B7A90", fontFamily: "monospace" }}>
                              {e.estoque_itens.codigo}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2" style={{ fontSize: 12, color: "#0D1117" }}>
                          {e.quantidade} {e.estoque_itens?.unidade ?? ""}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className="inline-flex rounded-full px-2 py-0.5"
                            style={{ fontSize: 10, fontWeight: 500, backgroundColor: s.bg, color: s.fg }}
                          >
                            {s.label}
                          </span>
                        </td>
                        <td className="px-3 py-2" style={{ fontSize: 12, color: "#6B7A90" }}>
                          {e.entregue_at ? new Date(e.entregue_at).toLocaleDateString("pt-BR") : "—"}
                        </td>
                        <td className="px-3 py-2" style={{ fontSize: 12, color: "#6B7A90" }}>
                          {e.observacoes ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div
      className="rounded-lg px-3 py-2"
      style={{ border: "0.5px solid #E8ECF2", backgroundColor: "#FAFBFD" }}
    >
      <div style={{ fontSize: 10, color: "#6B7A90", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: color ?? "#0D1117" }}>{value}</div>
    </div>
  );
}
