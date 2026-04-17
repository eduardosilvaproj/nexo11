import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Settings, Paperclip, ClipboardList } from "lucide-react";
import { ChecklistTemplateDialog } from "@/components/tecnico/ChecklistTemplateDialog";

type SubEtapa = "medicao" | "conferencia";

type Contrato = {
  id: string;
  cliente_nome: string;
  status: string;
  vendedor_id: string | null;
  created_at: string;
  sub_etapa_tecnico: SubEtapa;
  medicao_responsavel_id: string | null;
  conferencia_responsavel_id: string | null;
};

export default function Tecnico() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [templateOpen, setTemplateOpen] = useState(false);
  const [aba, setAba] = useState<SubEtapa>("medicao");

  const { data: contratos = [], isLoading } = useQuery({
    queryKey: ["contratos-tecnico-list", aba],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("id,cliente_nome,status,vendedor_id,created_at,sub_etapa_tecnico,medicao_responsavel_id,conferencia_responsavel_id")
        .eq("status", "tecnico")
        .eq("sub_etapa_tecnico", aba)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Contrato[];
    },
  });

  const papelAtual = aba === "medicao" ? "medidor" : "conferente";
  const { data: responsaveis = [] } = useQuery({
    queryKey: ["responsaveis-tecnico", papelAtual],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", papelAtual);
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [] as { id: string; nome: string }[];
      const { data } = await supabase
        .from("usuarios")
        .select("id,nome")
        .in("id", ids)
        .order("nome");
      return (data ?? []) as { id: string; nome: string }[];
    },
  });

  const atribuirResponsavel = async (contratoId: string, userId: string) => {
    const payload = aba === "medicao"
      ? { medicao_responsavel_id: userId }
      : { conferencia_responsavel_id: userId };
    const { error } = await supabase
      .from("contratos")
      .update(payload)
      .eq("id", contratoId);
    if (error) {
      toast.error("Erro ao atribuir responsável");
      return;
    }
    toast.success("Responsável atribuído");
    queryClient.invalidateQueries({ queryKey: ["contratos-tecnico-list", aba] });
  };

  const contratoIds = contratos.map((c) => c.id);

  const { data: checklists = [] } = useQuery({
    queryKey: ["checklists-by-contratos", contratoIds],
    enabled: contratoIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklists_tecnicos")
        .select("contrato_id, concluido")
        .in("contrato_id", contratoIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios-min-tecnico"],
    queryFn: async () => {
      const { data } = await supabase.from("usuarios").select("id,nome");
      return data ?? [];
    },
  });
  const userMap = useMemo(() => new Map(usuarios.map((u) => [u.id, u.nome])), [usuarios]);

  const { data: arquivosMap = {} } = useQuery({
    queryKey: ["arquivos-by-contratos", contratoIds],
    enabled: contratoIds.length > 0,
    queryFn: async () => {
      const result: Record<string, { name: string } | null> = {};
      await Promise.all(
        contratoIds.map(async (id) => {
          const { data } = await supabase.storage
            .from("contrato-arquivos")
            .list(id, { limit: 1, sortBy: { column: "created_at", order: "desc" } });
          result[id] = data && data.length > 0 ? { name: data[0].name } : null;
        }),
      );
      return result;
    },
  });

  const checklistStats = useMemo(() => {
    const m = new Map<string, { total: number; done: number }>();
    for (const ch of checklists) {
      const cur = m.get(ch.contrato_id) ?? { total: 0, done: 0 };
      cur.total += 1;
      if (ch.concluido) cur.done += 1;
      m.set(ch.contrato_id, cur);
    }
    return m;
  }, [checklists]);

  const checklistStatusOf = (contratoId: string, contratoStatus: string) => {
    const s = checklistStats.get(contratoId) ?? { total: 0, done: 0 };
    if (s.total > 0 && s.done === s.total && contratoStatus !== "tecnico") return "liberado";
    if (s.total === 0 || s.done === 0) return "nao_iniciado";
    if (s.done === s.total) return "completo";
    return "em_andamento";
  };

  const filtered = contratos.filter((c) => {
    if (statusFilter !== "all" && checklistStatusOf(c.id, c.status) !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!c.cliente_nome.toLowerCase().includes(q) && !c.id.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleDownload = async (contratoId: string, name: string) => {
    const { data } = await supabase.storage
      .from("contrato-arquivos")
      .createSignedUrl(`${contratoId}/${name}`, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">NEXO Técnico</h1>
          <p className="text-sm text-muted-foreground">Medição fina e conferência técnica</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTemplateOpen(true)}
          style={{ borderColor: "#1E6FBF", color: "#1E6FBF" }}
        >
          <Settings className="mr-2 h-4 w-4" />
          Configurar conferência
        </Button>
      </div>

      <ChecklistTemplateDialog open={templateOpen} onOpenChange={setTemplateOpen} />

      <div className="flex items-center gap-6" style={{ borderBottom: "1px solid #E8ECF2" }}>
        {([
          { key: "medicao", label: "Medição fina" },
          { key: "conferencia", label: "Conferência" },
        ] as const).map((t) => {
          const active = aba === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setAba(t.key)}
              className="pb-2 -mb-px transition-colors"
              style={{
                fontSize: 14,
                fontWeight: active ? 500 : 400,
                color: active ? "#1E6FBF" : "#6B7A90",
                borderBottom: active ? "2px solid #1E6FBF" : "2px solid transparent",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="nao_iniciado">Não iniciado</SelectItem>
            <SelectItem value="em_andamento">Em andamento</SelectItem>
            <SelectItem value="completo">Completo</SelectItem>
            <SelectItem value="liberado">Liberado para produção</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Buscar por cliente ou nº..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {(() => {
        const aguardando = contratos.length;
        let emAndamento = 0;
        let liberados = 0;
        contratos.forEach((c) => {
          const s = checklistStats.get(c.id) ?? { total: 0, done: 0 };
          if (s.total > 0 && s.done < s.total) emAndamento++;
          if (s.total > 0 && s.done === s.total) liberados++;
        });
        const cards = aba === "medicao"
          ? [
              { label: "Aguardando medição", value: aguardando - emAndamento - liberados, color: "#E8A020" },
              { label: "Em andamento", value: emAndamento, color: "#1E6FBF" },
              { label: "Medição concluída", value: liberados, color: "#12B76A" },
            ]
          : [
              { label: "Aguardando conferência", value: aguardando - emAndamento - liberados, color: "#E8A020" },
              { label: "Em andamento", value: emAndamento, color: "#1E6FBF" },
              { label: "Liberados p/ produção", value: liberados, color: "#12B76A" },
            ];
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {cards.map((k) => (
              <div
                key={k.label}
                className="rounded-xl bg-white p-4"
                style={{ border: "0.5px solid #E8ECF2", borderTop: `3px solid ${k.color}` }}
              >
                <div style={{ fontSize: 12, color: "#6B7A90" }}>{k.label}</div>
                <div className="mt-1" style={{ fontSize: 24, fontWeight: 600, color: "#0D1117" }}>
                  {k.value}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      <div className="rounded-xl bg-white overflow-hidden" style={{ border: "0.5px solid #E8ECF2" }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Progresso conferência</TableHead>
              <TableHead>Projeto</TableHead>
              <TableHead>Trava</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <div className="flex flex-col items-center justify-center p-12 text-center">
                    <ClipboardList size={32} style={{ color: "#B0BAC9" }} />
                    <p className="mt-3" style={{ fontSize: 13, color: "#6B7A90", fontWeight: 500 }}>
                      {aba === "medicao"
                        ? "Nenhum contrato aguardando medição fina"
                        : "Nenhum contrato aguardando conferência"}
                    </p>
                    <p className="mt-1" style={{ fontSize: 13, color: "#6B7A90" }}>
                      Contratos aparecem aqui conforme avançam no fluxo
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c, idx) => {
                const stats = checklistStats.get(c.id) ?? { total: 0, done: 0 };
                const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
                const arquivo = arquivosMap[c.id];
                const numero = `#${String(filtered.length - idx).padStart(3, "0")}`;
                const trava =
                  stats.total === 0
                    ? { label: "Aguardando", bg: "#E8ECF2", color: "#6B7A90" }
                    : stats.done === stats.total
                    ? { label: "Liberado ✓", bg: "#D1FAE5", color: "#05873C" }
                    : { label: "Pendente", bg: "#FDECEA", color: "#E53935" };

                return (
                  <TableRow key={c.id}>
                    <TableCell style={{ fontSize: 12, color: "#6B7A90" }}>
                      {numero}
                    </TableCell>
                    <TableCell style={{ fontSize: 13, fontWeight: 500, color: "#0D1117" }}>
                      {c.cliente_nome}
                    </TableCell>
                    <TableCell style={{ fontSize: 13, color: "#6B7A90" }}>
                      {c.vendedor_id ? userMap.get(c.vendedor_id) ?? "—" : "—"}
                    </TableCell>
                    <TableCell>
                      {stats.total === 0 ? (
                        <span style={{ fontSize: 12, color: "#B0BAC9" }}>Não iniciado</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div
                            className="overflow-hidden"
                            style={{
                              width: 140,
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: "#E8ECF2",
                            }}
                          >
                            <div
                              className="h-full transition-all"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: pct === 100 ? "#12B76A" : "#1E6FBF",
                                borderRadius: 3,
                              }}
                            />
                          </div>
                          <span style={{ fontSize: 12, color: "#6B7A90" }}>
                            {stats.done}/{stats.total} itens
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {arquivo ? (
                        <button
                          onClick={() => handleDownload(c.id, arquivo.name)}
                          className="inline-flex items-center gap-1.5 hover:underline"
                          style={{ color: "#1E6FBF", fontSize: 13 }}
                        >
                          <Paperclip className="h-3 w-3" />
                          {arquivo.name.replace(/^\d+-/, "").slice(0, 24)}
                        </button>
                      ) : (
                        <span
                          className="inline-flex items-center font-medium"
                          style={{
                            backgroundColor: "#FEF3C7",
                            color: "#E8A020",
                            borderRadius: 20,
                            padding: "2px 10px",
                            fontSize: 12,
                          }}
                        >
                          Sem projeto
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className="inline-flex items-center font-medium"
                        style={{
                          backgroundColor: trava.bg,
                          color: trava.color,
                          borderRadius: 20,
                          padding: "2px 10px",
                          fontSize: 12,
                        }}
                      >
                        {trava.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => navigate(`/contratos/${c.id}?aba=tecnico`)}
                        className="text-white transition-opacity hover:opacity-90"
                        style={{
                          backgroundColor: "#1E6FBF",
                          fontSize: 12,
                          borderRadius: 6,
                          padding: "6px 14px",
                        }}
                      >
                        Abrir conferência
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
