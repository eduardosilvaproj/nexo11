import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, ChevronDown, ChevronRight, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const sb = supabase as unknown as { from: (t: string) => any };

interface OrdemCompra {
  id: string;
  loja_id: string;
  fornecedor_id: string | null;
  itens: any[];
  valor_total: number;
  status: string;
  created_at: string;
  fornecedores?: { nome: string } | null;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  rascunho: { bg: "#F3F4F6", text: "#6B7280" },
  aguardando_aprovacao: { bg: "#FEF3C7", text: "#B45309" },
  aprovada: { bg: "#ECFDF5", text: "#05873C" },
  rejeitada: { bg: "#FEF2F2", text: "#DC2626" },
  concluida: { bg: "#E3F0FB", text: "#1E6FBF" },
};

const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");
const fmtCurrency = (v: number) => `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

export function HistoricoCompras() {
  const { user } = useAuth();
  const [periodo, setPeriodo] = useState("30");
  const [fornecedorFilter, setFornecedorFilter] = useState("todos");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [expandedFornecedor, setExpandedFornecedor] = useState<string | null>(null);

  // Get user's loja_id
  const { data: userRole } = useQuery({
    queryKey: ["user-role-loja-hist"],
    queryFn: async () => {
      const { data } = await sb
        .from("user_roles")
        .select("loja_id")
        .eq("user_id", user?.id)
        .limit(1)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const lojaId = userRole?.loja_id;

  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores-hist"],
    queryFn: async () => {
      const { data } = await sb.from("fornecedores").select("id, nome").eq("ativo", true).order("nome");
      return data ?? [];
    },
  });

  const getDateRange = () => {
    if (dataInicio && dataFim) {
      return { from: dataInicio, to: dataFim };
    }
    const now = new Date();
    const days = parseInt(periodo) || 30;
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
    return { from, to: now.toISOString() };
  };

  const { data: ordens = [], isLoading } = useQuery<OrdemCompra[]>({
    queryKey: ["historico-compras", lojaId, periodo, fornecedorFilter, dataInicio, dataFim],
    enabled: !!lojaId,
    queryFn: async () => {
      const { from, to } = getDateRange();
      let query = sb
        .from("compras_ordens")
        .select("id, loja_id, fornecedor_id, itens, valor_total, status, created_at, fornecedores:fornecedor_id(nome)")
        .eq("loja_id", lojaId)
        .gte("created_at", from)
        .lte("created_at", to)
        .order("created_at", { ascending: false });

      if (fornecedorFilter && fornecedorFilter !== "todos") {
        query = query.eq("fornecedor_id", fornecedorFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as OrdemCompra[];
    },
  });

  // Group by fornecedor
  const groupedByFornecedor = ordens.reduce<Record<string, { nome: string; ordens: OrdemCompra[]; total: number }>>((acc, o) => {
    const key = o.fornecedor_id || "sem_fornecedor";
    const nome = (o.fornecedores as any)?.nome || "Sem fornecedor";
    if (!acc[key]) acc[key] = { nome, ordens: [], total: 0 };
    acc[key].ordens.push(o);
    acc[key].total += Number(o.valor_total || 0);
    return acc;
  }, {});

  const totalGeral = ordens.reduce((sum, o) => sum + Number(o.valor_total || 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History size={18} style={{ color: "#1E6FBF" }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#0D1117" }}>Histórico de Compras</span>
        </div>
        <div className="flex items-center gap-2" style={{ fontSize: 13, color: "#6B7A90" }}>
          Total: <span style={{ fontWeight: 600, color: "#0D1117" }}>{fmtCurrency(totalGeral)}</span>
          <Badge variant="outline" className="ml-2 text-[10px]">{ordens.length} ordens</Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl bg-white p-4 flex flex-wrap items-end gap-3" style={{ border: "0.5px solid #E8ECF2" }}>
        <div className="flex items-center gap-1">
          <Filter size={14} style={{ color: "#6B7A90" }} />
          <span style={{ fontSize: 11, color: "#6B7A90" }}>Filtros:</span>
        </div>
        <div>
          <label style={{ fontSize: 11, color: "#6B7A90" }}>Período</label>
          <Select value={periodo} onValueChange={(v) => { setPeriodo(v); setDataInicio(""); setDataFim(""); }}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="60">Últimos 60 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {periodo === "custom" && (
          <>
            <div>
              <label style={{ fontSize: 11, color: "#6B7A90" }}>De</label>
              <Input type="date" className="w-[140px] h-8 text-xs" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#6B7A90" }}>Até</label>
              <Input type="date" className="w-[140px] h-8 text-xs" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
          </>
        )}
        <div>
          <label style={{ fontSize: 11, color: "#6B7A90" }}>Fornecedor</label>
          <Select value={fornecedorFilter} onValueChange={setFornecedorFilter}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {fornecedores.map((f: any) => (
                <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grouped by fornecedor (accordion) */}
      <div className="flex flex-col gap-2">
        {Object.entries(groupedByFornecedor).map(([key, group]) => (
          <div key={key} className="rounded-xl bg-white" style={{ border: "0.5px solid #E8ECF2", overflow: "hidden" }}>
            <button
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedFornecedor(expandedFornecedor === key ? null : key)}
            >
              <div className="flex items-center gap-2">
                {expandedFornecedor === key ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span style={{ fontSize: 13, fontWeight: 500, color: "#0D1117" }}>{group.nome}</span>
                <Badge variant="outline" className="text-[10px]">{group.ordens.length} ordens</Badge>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#0D1117" }}>{fmtCurrency(group.total)}</span>
            </button>

            {expandedFornecedor === key && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead style={{ backgroundColor: "#F7F9FC" }}>
                    <tr>
                      {["Data", "Itens", "Valor Total", "Status"].map((h) => (
                        <th key={h} className="px-4 py-2 text-left" style={{ fontSize: 11, color: "#6B7A90", fontWeight: 500, textTransform: "uppercase" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {group.ordens.map((o) => {
                      const sc = statusColors[o.status] || statusColors.rascunho;
                      const itensCount = Array.isArray(o.itens) ? o.itens.length : 0;
                      return (
                        <tr key={o.id} style={{ borderTop: "0.5px solid #E8ECF2" }}>
                          <td className="px-4 py-2" style={{ fontSize: 13 }}>{fmtDate(o.created_at)}</td>
                          <td className="px-4 py-2" style={{ fontSize: 13 }}>{itensCount} itens</td>
                          <td className="px-4 py-2" style={{ fontSize: 13, fontWeight: 500 }}>{fmtCurrency(o.valor_total)}</td>
                          <td className="px-4 py-2">
                            <span
                              className="rounded px-2 py-0.5"
                              style={{ fontSize: 11, fontWeight: 500, backgroundColor: sc.bg, color: sc.text }}
                            >
                              {o.status.replace(/_/g, " ")}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      {!isLoading && ordens.length === 0 && (
        <div className="rounded-xl bg-white p-8 text-center" style={{ border: "0.5px solid #E8ECF2" }}>
          <span style={{ fontSize: 13, color: "#6B7A90" }}>Nenhuma ordem de compra encontrada no período.</span>
        </div>
      )}

      {isLoading && (
        <div className="rounded-xl bg-white p-8 text-center" style={{ border: "0.5px solid #E8ECF2" }}>
          <span style={{ fontSize: 13, color: "#6B7A90" }}>Carregando...</span>
        </div>
      )}
    </div>
  );
}
