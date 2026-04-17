import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Settings, Paperclip } from "lucide-react";

type Contrato = {
  id: string;
  cliente_nome: string;
  status: string;
  vendedor_id: string | null;
  created_at: string;
};

export default function Tecnico() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: contratos = [], isLoading } = useQuery({
    queryKey: ["contratos-tecnico-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("id,cliente_nome,status,vendedor_id,created_at")
        .eq("status", "tecnico")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Contrato[];
    },
  });

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
          <p className="text-sm text-muted-foreground">Contratos aguardando validação técnica</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          style={{ borderColor: "#1E6FBF", color: "#1E6FBF" }}
        >
          <Settings className="mr-2 h-4 w-4" />
          Configurar checklist
        </Button>
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

      <div className="rounded-xl bg-white" style={{ border: "0.5px solid #E8ECF2" }}>
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium" style={{ color: "#0D1117" }}>
              Nenhum contrato em fase técnica
            </p>
            <p className="mt-1 text-xs" style={{ color: "#6B7A90" }}>
              Contratos avançam para cá após assinatura no Comercial
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Progresso checklist</TableHead>
                <TableHead>Projeto</TableHead>
                <TableHead>Trava</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c, idx) => {
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
                        Abrir checklist
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
