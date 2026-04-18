import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PrazoCell } from "@/components/producao/PrazoBadge";
import type { Database } from "@/integrations/supabase/types";

type OpStatus = Database["public"]["Enums"]["op_status"];

const STATUS_LABEL: Record<OpStatus, string> = {
  aguardando: "Aguardando",
  em_corte: "Em corte",
  em_montagem: "Em montagem",
  concluido: "Concluído",
};

const STATUS_BADGE: Record<OpStatus, { bg: string; fg: string }> = {
  aguardando: { bg: "#E8ECF2", fg: "#6B7A90" },
  em_corte: { bg: "#FEF3C7", fg: "#E8A020" },
  em_montagem: { bg: "#E6F3FF", fg: "#1E6FBF" },
  concluido: { bg: "#D1FAE5", fg: "#05873C" },
};

export default function Producao() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [fornecedorFilter, setFornecedorFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: ops, isLoading } = useQuery({
    queryKey: ["producao-list"],
    queryFn: async () => {
      const { data, error } = await (supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => { order: (c: string, o: { ascending: boolean }) => Promise<{ data: unknown[] | null; error: Error | null }> };
        };
      })
        .from("ordens_producao")
        .select(`
          id, status, data_previsao, data_conclusao, fornecedor_id, contrato_id,
          contratos:contrato_id ( id, cliente_nome ),
          fornecedores:fornecedor_id ( id, nome )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        status: OpStatus;
        data_previsao: string | null;
        data_conclusao: string | null;
        fornecedor_id: string | null;
        contrato_id: string;
        contratos?: { cliente_nome?: string } | null;
        fornecedores?: { nome?: string } | null;
      }>;
    },
  });

  const { data: fornecedores } = useQuery({
    queryKey: ["fornecedores-ativos"],
    queryFn: async () => {
      const { data } = await (supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => { eq: (c: string, v: boolean) => { order: (c: string) => Promise<{ data: Array<{ id: string; nome: string }> | null }> } };
        };
      })
        .from("fornecedores")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    if (!ops) return [];
    return ops.filter((op) => {
      if (statusFilter !== "all" && op.status !== statusFilter) return false;
      if (fornecedorFilter !== "all" && op.fornecedor_id !== fornecedorFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const cliente = op.contratos?.cliente_nome?.toLowerCase() ?? "";
        const num = op.contrato_id?.slice(0, 4) ?? "";
        if (!cliente.includes(q) && !num.includes(q)) return false;
      }
      return true;
    });
  }, [ops, statusFilter, fornecedorFilter, search]);

  const tableNode = (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {(Object.keys(STATUS_LABEL) as OpStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={fornecedorFilter} onValueChange={setFornecedorFilter}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os fornecedores</SelectItem>
            {fornecedores?.map((f) => (
              <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar cliente ou nº..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white" style={{ border: "0.5px solid #E8ECF2" }}>
        <table className="w-full">
          <thead style={{ backgroundColor: "#F7F9FC" }}>
            <tr>
              {["Nº", "Cliente", "Fornecedor", "Status O.P.", "Prazo", "Dias restantes", "Ações"].map((h) => (
                <th key={h} className="px-4 py-3 text-left" style={{ fontSize: 11, color: "#6B7A90", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">Carregando...</td></tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhuma ordem de produção encontrada.</td></tr>
            )}
            {filtered.map((op) => {
              const badge = STATUS_BADGE[op.status];
              return (
                <tr key={op.id} style={{ borderTop: "0.5px solid #E8ECF2" }} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm font-medium">#{op.contrato_id?.slice(0, 4)}</td>
                  <td className="px-4 py-3 text-sm">{op.contratos?.cliente_nome ?? "—"}</td>
                  <td className="px-4 py-3 text-sm">{op.fornecedores?.nome ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5" style={{ backgroundColor: badge.bg, color: badge.fg, fontSize: 11, fontWeight: 500 }}>
                      {STATUS_LABEL[op.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {op.data_previsao ? new Date(op.data_previsao).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <PrazoCell dataPrevista={op.data_previsao} concluido={op.status === "concluido"} />
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" onClick={() => navigate(`/contratos/${op.contrato_id}?tab=producao`)}>
                      Abrir O.P.
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 style={{ fontSize: 22, fontWeight: 600, color: "#0D1117" }}>NEXO Produção</h1>
        <p style={{ fontSize: 13, color: "#6B7A90" }}>Ordens de produção ativas</p>
      </div>

      <Tabs defaultValue="terceirizada" className="w-full">
        <TabsList className="bg-transparent p-0 h-auto rounded-none border-b border-[#E8ECF2] w-full justify-start gap-6 mb-6">
          <TabsTrigger
            value="terceirizada"
            className="rounded-none bg-transparent px-0 pb-3 pt-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-[#1E6FBF] data-[state=active]:border-b-2 data-[state=active]:border-[#1E6FBF] text-[#6B7A90] text-sm font-medium"
          >
            Terceirizada (Promob)
          </TabsTrigger>
          <TabsTrigger
            value="interna"
            className="rounded-none bg-transparent px-0 pb-3 pt-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-[#1E6FBF] data-[state=active]:border-b-2 data-[state=active]:border-[#1E6FBF] text-[#6B7A90] text-sm font-medium"
          >
            Interna
          </TabsTrigger>
        </TabsList>

        <TabsContent value="terceirizada" className="mt-0">
          {tableNode}
        </TabsContent>
        <TabsContent value="interna" className="mt-0">
          <div
            className="rounded-xl flex flex-col items-center justify-center gap-2 py-16"
            style={{ backgroundColor: "#F5F7FA", border: "1px dashed #B0BAC9" }}
          >
            <span style={{ fontSize: 14, color: "#0D1117", fontWeight: 500 }}>Produção interna em breve</span>
            <span style={{ fontSize: 12, color: "#6B7A90" }}>Acompanhe ordens executadas pela equipe interna aqui.</span>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
