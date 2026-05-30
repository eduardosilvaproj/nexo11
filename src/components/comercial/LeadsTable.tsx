import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import type { Database } from "@/integrations/supabase/types";

type LeadStatus = Database["public"]["Enums"]["lead_status"];
type Lead = Database["public"]["Tables"]["leads"]["Row"];

const STATUS_LABEL: Record<LeadStatus, string> = {
  novo: "Novo",
  atendimento: "Atendimento",
  qualificacao: "Qualificação",
  visita: "Visita",
  medicao_agendada: "Medição",
  proposta: "Proposta",
  orcamento_enviado: "Orçamento",
  negociacao: "Negociação",
  fechamento: "Fechamento",
  convertido: "Convertido",
  perdido: "Perdido",
};

const STATUS_COLOR: Record<LeadStatus, { bg: string; color: string }> = {
  novo: { bg: "#E6F3FF", color: "#1E6FBF" },
  atendimento: { bg: "#EEF2FF", color: "#4F46E5" },
  qualificacao: { bg: "#EDE9FE", color: "#6D28D9" },
  visita: { bg: "#FEF3C7", color: "#92400E" },
  medicao_agendada: { bg: "#FEF9C3", color: "#854D0E" },
  proposta: { bg: "#FFEDD5", color: "#9A3412" },
  orcamento_enviado: { bg: "#FFE4E6", color: "#9F1239" },
  negociacao: { bg: "#FCE7F3", color: "#9D174D" },
  fechamento: { bg: "#DCFCE7", color: "#166534" },
  convertido: { bg: "#E6F7EE", color: "#0E8A4F" },
  perdido: { bg: "#FEE2E2", color: "#B91C1C" },
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR");
}

function formatBRL(v: number | null) {
  if (v === null || v === undefined) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function LeadsTable({ onSelect }: { onSelect?: (lead: Lead) => void }) {
  const { perfil } = useAuth();
  const [filterStatus, setFilterStatus] = useState<"all" | LeadStatus>("all");
  const [filterVendedor, setFilterVendedor] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads-tabela", perfil?.loja_id],
    enabled: !!perfil?.loja_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("data_entrada", { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
  });

  const vendedoresUnicos = useMemo(
    () => Array.from(new Set(leads.map((l) => l.vendedor_id).filter(Boolean) as string[])),
    [leads],
  );

  const filtered = leads.filter((l) => {
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (filterVendedor !== "all" && l.vendedor_id !== filterVendedor) return false;
    if (search.trim() && !l.nome.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as "all" | LeadStatus)}
          style={{
            height: 36,
            borderRadius: 8,
            border: "1px solid #E8ECF2",
            padding: "0 10px",
            fontSize: 13,
            background: "#FFFFFF",
            outline: "none",
          }}
        >
          <option value="all">Todos os status</option>
          {(Object.keys(STATUS_LABEL) as LeadStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>

        <select
          value={filterVendedor}
          onChange={(e) => setFilterVendedor(e.target.value)}
          style={{
            height: 36,
            borderRadius: 8,
            border: "1px solid #E8ECF2",
            padding: "0 10px",
            fontSize: 13,
            background: "#FFFFFF",
            outline: "none",
          }}
        >
          <option value="all">Todos os vendedores</option>
          {vendedoresUnicos.map((v) => (
            <option key={v} value={v}>{v.slice(0, 8)}</option>
          ))}
        </select>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome..."
          maxLength={80}
          style={{
            height: 36,
            borderRadius: 8,
            border: "1px solid #E8ECF2",
            padding: "0 10px",
            fontSize: 13,
            background: "#FFFFFF",
            outline: "none",
            minWidth: 220,
            flex: 1,
          }}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: 13 }}>
            <thead style={{ background: "#F9FAFB" }}>
              <tr>
                {["Nome", "Contato", "Status", "Origem", "Vendedor", "Entrada", "Último contato", "Valor"].map((h) => (
                  <th
                    key={h}
                    className="text-left whitespace-nowrap"
                    style={{
                      padding: "10px 14px",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#6B7A90",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      borderBottom: "1px solid #E8ECF2",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center" style={{ color: "#6B7A90" }}>
                    Carregando...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center" style={{ color: "#B0BAC9", fontSize: 13 }}>
                    Nenhum lead encontrado
                  </td>
                </tr>
              ) : (
                filtered.map((l) => {
                  const sc = STATUS_COLOR[l.status];
                  return (
                    <tr
                      key={l.id}
                      onClick={() => onSelect?.(l)}
                      className="cursor-pointer transition-colors hover:bg-[#F5F7FA]"
                      style={{ borderBottom: "1px solid #F0F2F5" }}
                    >
                      <td style={{ padding: "12px 14px", fontWeight: 500, color: "#0D1117" }}>
                        {l.nome}
                      </td>
                      <td style={{ padding: "12px 14px", color: "#6B7A90" }}>{l.contato || "—"}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            background: sc.bg,
                            color: sc.color,
                            padding: "3px 10px",
                            borderRadius: 999,
                          }}
                        >
                          {STATUS_LABEL[l.status]}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", color: "#6B7A90" }}>{l.origem || "—"}</td>
                      <td style={{ padding: "12px 14px", color: "#6B7A90" }}>
                        {l.vendedor_id ? l.vendedor_id.slice(0, 8) : "—"}
                      </td>
                      <td style={{ padding: "12px 14px", color: "#6B7A90", whiteSpace: "nowrap" }}>
                        {formatDate(l.data_entrada)}
                      </td>
                      <td style={{ padding: "12px 14px", color: "#6B7A90", whiteSpace: "nowrap" }}>
                        {formatDate(l.data_ultimo_contato)}
                      </td>
                      <td style={{ padding: "12px 14px", color: "#0D1117", whiteSpace: "nowrap" }}>
                        {formatBRL(l.valor_estimado as number | null)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
