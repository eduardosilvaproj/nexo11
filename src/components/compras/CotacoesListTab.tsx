import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FileSearch, CheckCircle2, Clock, XCircle } from "lucide-react";

const sb = supabase as unknown as { from: (t: string) => any };

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_BADGE: Record<string, { bg: string; fg: string; label: string }> = {
  pendente: { bg: "#FEF3C7", fg: "#E8A020", label: "Pendente" },
  aprovada: { bg: "#D1FAE5", fg: "#05873C", label: "Aprovada" },
  rejeitada: { bg: "#FEE4E2", fg: "#E53935", label: "Rejeitada" },
};

interface Cotacao {
  id: string;
  fornecedor_nome: string;
  itens: any[];
  valor_total: number;
  prazo_entrega: string | null;
  status: string;
  observacoes: string | null;
  created_at: string;
}

export function CotacoesListTab() {
  const { perfil } = useAuth();

  const { data: cotacoes = [], isLoading } = useQuery({
    queryKey: ["compras-cotacoes-list"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("compras_cotacoes")
        .select("id, fornecedor:fornecedor_id(nome), itens, valor_total, prazo_entrega, status, observacoes, created_at")
        .eq("loja_id", perfil?.loja_id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []).map((c: any) => ({
        ...c,
        fornecedor_nome: c.fornecedor?.nome || "—",
      })) as Cotacao[];
    },
    enabled: !!perfil?.loja_id,
  });

  if (isLoading) return <p className="text-xs text-slate-400 text-center py-8">Carregando...</p>;

  if (cotacoes.length === 0) {
    return (
      <div className="text-center py-10 border-2 border-dashed rounded-xl">
        <FileSearch className="h-8 w-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">Nenhuma cotação registrada</p>
        <p className="text-xs text-slate-400 mt-1">
          Cotações são criadas a partir das requisições de compra (clique em uma requisição aberta)
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white overflow-hidden" style={{ border: "0.5px solid #E8ECF2" }}>
      <table className="w-full">
        <thead style={{ backgroundColor: "#F7F9FC" }}>
          <tr>
            {["Data", "Fornecedor", "Itens", "Valor Total", "Prazo", "Status"].map(h => (
              <th key={h} className="px-4 py-3 text-left" style={{ fontSize: 11, color: "#6B7A90", fontWeight: 500, textTransform: "uppercase" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cotacoes.map(c => {
            const badge = STATUS_BADGE[c.status] || STATUS_BADGE.pendente;
            return (
              <tr key={c.id} className="border-t border-[#E8ECF2] hover:bg-slate-50">
                <td className="px-4 py-3 text-xs text-slate-600">
                  {new Date(c.created_at).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3 text-xs font-medium text-slate-900">{c.fornecedor_nome}</td>
                <td className="px-4 py-3 text-xs text-slate-600">{(c.itens || []).length} item(ns)</td>
                <td className="px-4 py-3 text-xs font-semibold text-slate-900">{fmtBRL(c.valor_total)}</td>
                <td className="px-4 py-3 text-xs text-slate-600">{c.prazo_entrega || "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{ backgroundColor: badge.bg, color: badge.fg }}
                  >
                    {c.status === "aprovada" && <CheckCircle2 className="h-3 w-3" />}
                    {c.status === "pendente" && <Clock className="h-3 w-3" />}
                    {c.status === "rejeitada" && <XCircle className="h-3 w-3" />}
                    {badge.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
