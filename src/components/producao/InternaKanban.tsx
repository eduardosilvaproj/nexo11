import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { NovaOrdemInternaDialog } from "./NovaOrdemInternaDialog";
import { diasRestantes } from "./PrazoBadge";

type StatusKey = "a_fazer" | "em_andamento" | "aguardando_material" | "concluido";

type OrdemInterna = {
  id: string;
  cliente_nome: string;
  fornecedor_id: string | null;
  data_prevista: string | null;
  status: StatusKey;
  prioridade: "normal" | "urgente";
  descricao: string | null;
  fornecedores?: { nome: string } | null;
};

const COLUMNS: { key: StatusKey; label: string; bg: string; headerBg: string }[] = [
  { key: "a_fazer", label: "A Fazer", bg: "#F4F6FA", headerBg: "#E8ECF2" },
  { key: "em_andamento", label: "Em Andamento", bg: "#EFF6FF", headerBg: "#DBEAFE" },
  { key: "aguardando_material", label: "Aguardando Material", bg: "#FEFCE8", headerBg: "#FEF3C7" },
  { key: "concluido", label: "Concluído", bg: "#F0FDF4", headerBg: "#D1FAE5" },
];

const NEXT_STATUS: Record<StatusKey, StatusKey | null> = {
  a_fazer: "em_andamento",
  em_andamento: "aguardando_material",
  aguardando_material: "concluido",
  concluido: null,
};

function diasBadge(dataPrevista: string | null, concluido: boolean) {
  if (concluido) return null;
  const dias = diasRestantes(dataPrevista);
  if (dias === null) return null;
  let bg = "#D1FAE5", fg = "#05873C", txt = `${dias} dias`;
  if (dias < 0) { bg = "#FDECEA"; fg = "#E53935"; txt = `Atrasado ${Math.abs(dias)}d`; }
  else if (dias <= 7) { bg = "#FEF3C7"; fg = "#A16207"; txt = `${dias} dias`; }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ backgroundColor: bg, color: fg }}>
      {txt}
    </span>
  );
}

export function InternaKanban() {
  const { perfil } = useAuth();
  const qc = useQueryClient();
  const [fornecedorFilter, setFornecedorFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [novaOpen, setNovaOpen] = useState(false);

  const { data: ordens, isLoading } = useQuery({
    queryKey: ["producao-interna-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("producao_interna")
        .select("id, cliente_nome, fornecedor_id, data_prevista, status, prioridade, descricao, fornecedores:fornecedor_id(nome)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as OrdemInterna[];
    },
  });

  const { data: fornecedores } = useQuery({
    queryKey: ["fornecedores-ativos-interna"],
    queryFn: async () => {
      const { data } = await supabase.from("fornecedores").select("id, nome").eq("ativo", true).order("nome");
      return (data ?? []) as Array<{ id: string; nome: string }>;
    },
  });

  const filtered = useMemo(() => {
    if (!ordens) return [];
    return ordens.filter((o) => {
      if (fornecedorFilter !== "all" && o.fornecedor_id !== fornecedorFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!o.cliente_nome.toLowerCase().includes(q) && !(o.descricao ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [ordens, fornecedorFilter, search]);

  const grouped = useMemo(() => {
    const map: Record<StatusKey, OrdemInterna[]> = { a_fazer: [], em_andamento: [], aguardando_material: [], concluido: [] };
    filtered.forEach((o) => map[o.status]?.push(o));
    return map;
  }, [filtered]);

  const avancar = async (ordem: OrdemInterna) => {
    const next = NEXT_STATUS[ordem.status];
    if (!next) return;
    const { error } = await supabase.from("producao_interna").update({ status: next }).eq("id", ordem.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Etapa avançada");
    qc.invalidateQueries({ queryKey: ["producao-interna-list"] });
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={fornecedorFilter} onValueChange={setFornecedorFilter}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os fornecedores</SelectItem>
            {fornecedores?.map((f) => (<SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar cliente ou descrição..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="ml-auto">
          <Button onClick={() => setNovaOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Ordem
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(4, minmax(280px, 1fr))" }}>
        {COLUMNS.map((col) => (
          <div key={col.key} className="rounded-xl flex flex-col" style={{ backgroundColor: col.bg, border: "0.5px solid #E8ECF2", minHeight: 400 }}>
            <div className="px-4 py-3 rounded-t-xl" style={{ backgroundColor: col.headerBg }}>
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 13, fontWeight: 600, color: "#0D1117" }}>{col.label}</span>
                <span style={{ fontSize: 12, color: "#6B7A90", fontWeight: 500 }}>· {grouped[col.key].length}</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 p-3 flex-1">
              {isLoading && <div className="text-center text-xs text-muted-foreground py-6">Carregando...</div>}
              {!isLoading && grouped[col.key].length === 0 && (
                <div className="text-center text-xs text-muted-foreground py-6">Nenhuma ordem</div>
              )}
              {grouped[col.key].map((ordem) => (
                <div key={ordem.id} className="bg-white rounded-lg p-3 flex flex-col gap-2" style={{ border: "0.5px solid #E8ECF2" }}>
                  <div className="flex items-start justify-between gap-2">
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0D1117" }}>{ordem.cliente_nome}</div>
                    {ordem.prioridade === "urgente" ? (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: "#FDECEA", color: "#E53935" }}>URGENTE</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: "#E8ECF2", color: "#6B7A90" }}>Normal</span>
                    )}
                  </div>
                  {ordem.fornecedores?.nome && (
                    <div style={{ fontSize: 11, color: "#6B7A90" }}>🏭 {ordem.fornecedores.nome}</div>
                  )}
                  {ordem.data_prevista && (
                    <div style={{ fontSize: 11, color: "#6B7A90" }}>
                      📅 {new Date(ordem.data_prevista).toLocaleDateString("pt-BR")}
                    </div>
                  )}
                  <div>{diasBadge(ordem.data_prevista, ordem.status === "concluido")}</div>
                  {NEXT_STATUS[ordem.status] && (
                    <Button size="sm" variant="outline" className="w-full mt-1 gap-1" onClick={() => avancar(ordem)}>
                      Avançar etapa <ArrowRight className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        </div>
      </div>

      <NovaOrdemInternaDialog
        open={novaOpen}
        onOpenChange={setNovaOpen}
        lojaId={perfil?.loja_id ?? null}
        onCreated={() => qc.invalidateQueries({ queryKey: ["producao-interna-list"] })}
      />
    </>
  );
}
