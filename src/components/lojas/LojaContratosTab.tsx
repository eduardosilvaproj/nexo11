import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Eye, Folder } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ContratoStatus = Database["public"]["Enums"]["contrato_status"];

const ETAPAS: Record<ContratoStatus, { label: string; bg: string; color: string }> = {
  comercial: { label: "Comercial", bg: "#E6F3FF", color: "#1E6FBF" },
  tecnico: { label: "Técnico", bg: "#EEEDFB", color: "#7F77DD" },
  producao: { label: "Produção", bg: "#FBE9E1", color: "#D85A30" },
  logistica: { label: "Logística", bg: "#E0F7EC", color: "#12B76A" },
  montagem: { label: "Montagem", bg: "#E0F4EC", color: "#1D9E75" },
  pos_venda: { label: "Pós-venda", bg: "#FCEFD2", color: "#E8A020" },
  finalizado: { label: "Finalizado", bg: "#D7F0DF", color: "#05873C" },
};

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const formatDate = (s: string | null) => (s ? new Date(s).toLocaleDateString("pt-BR") : "—");

function margemColor(m: number | null) {
  if (m == null) return "#B0BAC9";
  if (m >= 30) return "#12B76A";
  if (m >= 15) return "#E8A020";
  return "#E53935";
}

const selectStyle: React.CSSProperties = {
  fontSize: 13,
  padding: "6px 10px",
  borderRadius: 8,
  border: "0.5px solid #E8ECF2",
  background: "#FFFFFF",
  color: "#0D1117",
  cursor: "pointer",
};

interface Props {
  lojaId: string;
}

export function LojaContratosTab({ lojaId }: Props) {
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState<ContratoStatus | "">("");
  const [vendedor, setVendedor] = useState<string>("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["loja-contratos-table", lojaId],
    enabled: !!lojaId,
    queryFn: async () => {
      const [contratosRes, usuariosRes] = await Promise.all([
        supabase
          .from("contratos")
          .select("id, cliente_nome, vendedor_id, status, valor_venda, data_criacao, dre_contrato(margem_prevista)")
          .eq("loja_id", lojaId)
          .order("data_criacao", { ascending: false }),
        supabase.from("usuarios_publico").select("id, nome").eq("loja_id", lojaId),
      ]);
      if (contratosRes.error) throw contratosRes.error;
      const userMap = new Map((usuariosRes.data ?? []).map((u: any) => [u.id, u.nome]));
      return (contratosRes.data ?? []).map((c) => ({
        ...c,
        vendedor_nome: c.vendedor_id ? userMap.get(c.vendedor_id) ?? "—" : "Sem responsável",
      })) as Array<{
        id: string;
        cliente_nome: string;
        vendedor_id: string | null;
        vendedor_nome: string;
        status: ContratoStatus;
        valor_venda: number;
        data_criacao: string;
        dre_contrato: { margem_prevista: number | null } | { margem_prevista: number | null }[] | null;
      }>;
    },
  });

  const vendedores = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => {
      if (r.vendedor_id) map.set(r.vendedor_id, r.vendedor_nome);
    });
    return Array.from(map.entries());
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (etapa && r.status !== etapa) return false;
      if (vendedor && r.vendedor_id !== vendedor) return false;
      return true;
    });
  }, [rows, etapa, vendedor]);

  return (
    <div className="flex flex-col gap-3">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={etapa}
          onChange={(e) => setEtapa(e.target.value as ContratoStatus | "")}
          style={selectStyle}
        >
          <option value="">Etapa: Todas</option>
          {Object.entries(ETAPAS).map(([key, v]) => (
            <option key={key} value={key}>
              {v.label}
            </option>
          ))}
        </select>
        <select value={vendedor} onChange={(e) => setVendedor(e.target.value)} style={selectStyle}>
          <option value="">Vendedor: Todos</option>
          {vendedores.map(([id, nome]) => (
            <option key={id} value={id}>
              {nome}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div
          className="flex h-48 items-center justify-center"
          style={{ fontSize: 13, color: "#6B7A90" }}
        >
          Carregando contratos...
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16"
          style={{ background: "#FFFFFF", border: "0.5px solid #E8ECF2", borderRadius: 12 }}
        >
          <div
            className="mb-4 flex items-center justify-center"
            style={{ width: 56, height: 56, borderRadius: 999, background: "#F5F7FA", color: "#6B7A90" }}
          >
            <Folder className="h-7 w-7" />
          </div>
          <p style={{ fontSize: 15, fontWeight: 500, color: "#0D1117" }}>Nenhum contrato encontrado</p>
          <p className="mt-1" style={{ fontSize: 13, color: "#6B7A90" }}>
            Ajuste os filtros para ver mais resultados
          </p>
        </div>
      ) : (
        <div
          className="overflow-hidden"
          style={{ background: "#FFFFFF", border: "0.5px solid #E8ECF2", borderRadius: 12 }}
        >
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F5F7FA" }}>
                  {["Nº", "Cliente", "Vendedor", "Etapa", "Valor", "Margem prevista", "Data", "Ações"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-left"
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#6B7A90",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          borderBottom: "0.5px solid #E8ECF2",
                        }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, idx) => {
                  const dre = Array.isArray(c.dre_contrato) ? c.dre_contrato[0] : c.dre_contrato;
                  const margem = dre?.margem_prevista ?? null;
                  const et = ETAPAS[c.status];
                  return (
                    <tr
                      key={c.id}
                      className="transition-colors hover:bg-[#F5F7FA]"
                      style={{ borderBottom: "0.5px solid #E8ECF2" }}
                    >
                      <td className="px-4 py-3" style={{ fontSize: 12, color: "#6B7A90" }}>
                        #{String(idx + 1).padStart(4, "0")}
                      </td>
                      <td className="px-4 py-3" style={{ fontSize: 13, fontWeight: 500, color: "#0D1117" }}>
                        {c.cliente_nome}
                      </td>
                      <td className="px-4 py-3" style={{ fontSize: 13, color: "#6B7A90" }}>
                        {c.vendedor_nome}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            background: et.bg,
                            color: et.color,
                            padding: "3px 10px",
                            borderRadius: 999,
                          }}
                        >
                          {et.label}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ fontSize: 13, fontWeight: 500, color: "#0D1117" }}>
                        {formatBRL(Number(c.valor_venda || 0))}
                      </td>
                      <td
                        className="px-4 py-3"
                        style={{ fontSize: 13, fontWeight: 500, color: margemColor(margem) }}
                      >
                        {margem != null ? `${margem.toFixed(1)}%` : "—"}
                      </td>
                      <td className="px-4 py-3" style={{ fontSize: 12, color: "#6B7A90" }}>
                        {formatDate(c.data_criacao)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/contratos/${c.id}`)}
                          className="rounded-md p-1.5 transition-colors hover:bg-[#E8ECF2]"
                          style={{ color: "#6B7A90" }}
                          title="Ver contrato"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
