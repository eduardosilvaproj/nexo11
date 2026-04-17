import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Eye, Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Database } from "@/integrations/supabase/types";

type ChamadoTipo = Database["public"]["Enums"]["chamado_tipo"];
type ChamadoStatus = Database["public"]["Enums"]["chamado_status"];

const TIPO_LABEL: Record<ChamadoTipo, string> = {
  assistencia: "Assistência",
  reclamacao: "Reclamação",
  garantia: "Garantia",
  solicitacao: "Solicitação",
};

const STATUS_LABEL: Record<ChamadoStatus, string> = {
  aberto: "Aberto",
  em_andamento: "Em andamento",
  resolvido: "Resolvido",
};

const STATUS_BADGE: Record<ChamadoStatus, { bg: string; fg: string }> = {
  aberto: { bg: "#FEE2E2", fg: "#E53935" },
  em_andamento: { bg: "#FEF3C7", fg: "#E8A020" },
  resolvido: { bg: "#D1FAE5", fg: "#05873C" },
};

function MetricCard({
  label,
  value,
  borderTop,
  valueColor,
}: {
  label: string;
  value: string;
  borderTop: string;
  valueColor?: string;
}) {
  return (
    <div
      className="rounded-xl bg-white p-5"
      style={{ border: "0.5px solid #E8ECF2", borderTop: `3px solid ${borderTop}` }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#6B7A90",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 600,
          color: valueColor ?? "#0D1117",
          marginTop: 6,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function PosVenda() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"chamados" | "nps">("chamados");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  // dialog "abrir chamado"
  const [open, setOpen] = useState(false);
  const [contratoId, setContratoId] = useState("");
  const [tipo, setTipo] = useState<ChamadoTipo>("assistencia");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [custo, setCusto] = useState("");

  const { data: chamados, isLoading } = useQuery({
    queryKey: ["pos-venda-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chamados_pos_venda")
        .select(
          `id, contrato_id, tipo, status, descricao, custo, nps,
           data_abertura, data_fechamento, updated_at,
           contratos:contrato_id ( cliente_nome )`,
        )
        .order("data_abertura", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: contratos = [] } = useQuery({
    queryKey: ["contratos-pos-venda"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contratos")
        .select("id, cliente_nome, status")
        .in("status", ["montagem", "pos_venda", "finalizado"])
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: open,
  });

  const metrics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    let abertos = 0;
    let andamento = 0;
    let resolvidosHoje = 0;
    const npsMes: number[] = [];

    for (const c of chamados ?? []) {
      if (c.status === "aberto") abertos++;
      if (c.status === "em_andamento") andamento++;
      if (c.status === "resolvido" && c.data_fechamento) {
        const df = new Date(c.data_fechamento);
        df.setHours(0, 0, 0, 0);
        if (df.getTime() === today.getTime()) resolvidosHoje++;
      }
      if (typeof c.nps === "number") {
        const ref = new Date(c.data_fechamento ?? c.updated_at);
        if (ref >= monthStart) npsMes.push(c.nps);
      }
    }

    const npsAvg =
      npsMes.length > 0
        ? npsMes.reduce((s, n) => s + n, 0) / npsMes.length
        : null;

    return { abertos, andamento, resolvidosHoje, npsAvg };
  }, [chamados]);

  const npsColor = (n: number | null) =>
    n === null ? "#0D1117" : n >= 8 ? "#12B76A" : n >= 6 ? "#E8A020" : "#E53935";

  const filtered = useMemo(() => {
    if (!chamados) return [];
    return chamados.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (tipoFilter !== "all" && c.tipo !== tipoFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const cliente =
          (c as { contratos?: { cliente_nome?: string } }).contratos?.cliente_nome?.toLowerCase() ?? "";
        const num = c.contrato_id?.slice(0, 4) ?? "";
        const desc = (c.descricao ?? "").toLowerCase();
        if (!cliente.includes(q) && !num.includes(q) && !desc.includes(q)) return false;
      }
      return true;
    });
  }, [chamados, statusFilter, tipoFilter, search]);

  const reset = () => {
    setContratoId("");
    setTipo("assistencia");
    setTitulo("");
    setDescricao("");
    setCusto("");
  };

  const abrirChamado = useMutation({
    mutationFn: async () => {
      if (!contratoId) throw new Error("Selecione um contrato");
      if (!titulo && !descricao) throw new Error("Informe título ou descrição");
      const desc = titulo
        ? `${titulo}${descricao ? "\n\n" + descricao : ""}`
        : descricao;
      const { error } = await supabase.from("chamados_pos_venda").insert({
        contrato_id: contratoId,
        tipo,
        descricao: desc,
        custo: Number(custo) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Chamado aberto");
      qc.invalidateQueries({ queryKey: ["pos-venda-list"] });
      setOpen(false);
      reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resolverChamado = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("chamados_pos_venda")
        .update({
          status: "resolvido",
          data_fechamento: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Chamado resolvido");
      qc.invalidateQueries({ queryKey: ["pos-venda-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: "#0D1117" }}>NEXO Pós-venda</h1>
          <p style={{ fontSize: 13, color: "#6B7A90" }}>Assistências, chamados e NPS</p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) reset();
          }}
        >
          <DialogTrigger asChild>
            <button
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-white"
              style={{ backgroundColor: "#1E6FBF", fontSize: 13 }}
            >
              <Plus className="h-4 w-4" /> Abrir chamado
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Abrir chamado</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <Label>Contrato</Label>
                <Select value={contratoId} onValueChange={setContratoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {contratos.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.cliente_nome} · #{c.id.slice(0, 4)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label>Tipo</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as ChamadoTipo)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TIPO_LABEL) as ChamadoTipo[]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {TIPO_LABEL[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label>Título</Label>
                <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <Label>Descrição</Label>
                <Textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label>Custo de assistência (R$)</Label>
                <Input
                  type="number"
                  value={custo}
                  onChange={(e) => setCusto(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => abrirChamado.mutate()}
                disabled={abrirChamado.isPending}
                style={{ backgroundColor: "#1E6FBF" }}
              >
                Abrir chamado
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Chamados abertos"
          value={String(metrics.abertos)}
          borderTop="#E53935"
        />
        <MetricCard
          label="Em andamento"
          value={String(metrics.andamento)}
          borderTop="#E8A020"
        />
        <MetricCard
          label="NPS médio (mês)"
          value={metrics.npsAvg === null ? "—" : metrics.npsAvg.toFixed(1)}
          borderTop="#12B76A"
          valueColor={npsColor(metrics.npsAvg)}
        />
        <MetricCard
          label="Resolvidos hoje"
          value={String(metrics.resolvidosHoje)}
          borderTop="#1E6FBF"
        />
      </div>

      <div
        className="mb-4 flex items-center gap-6"
        style={{ borderBottom: "0.5px solid #E8ECF2" }}
      >
        {([
          ["chamados", "Chamados"],
          ["nps", "NPS"],
        ] as const).map(([key, label]) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="pb-2 -mb-px"
              style={{
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                color: active ? "#1E6FBF" : "#6B7A90",
                borderBottom: active ? "2px solid #1E6FBF" : "2px solid transparent",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {tab === "chamados" && (
      <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {(Object.keys(STATUS_LABEL) as ChamadoStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {(Object.keys(TIPO_LABEL) as ChamadoTipo[]).map((t) => (
              <SelectItem key={t} value={t}>
                {TIPO_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar cliente, nº ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div
        className="overflow-hidden rounded-xl bg-white"
        style={{ border: "0.5px solid #E8ECF2" }}
      >
        <table className="w-full">
          <thead style={{ backgroundColor: "#F7F9FC" }}>
            <tr>
              {["Nº", "Cliente", "Tipo", "Título", "Aberto em", "NPS", "Status", "Ações"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left"
                    style={{
                      fontSize: 11,
                      color: "#6B7A90",
                      fontWeight: 500,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Carregando...
                </td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhum chamado encontrado.
                </td>
              </tr>
            )}
            {filtered.map((c) => {
              const cliente =
                (c as { contratos?: { cliente_nome?: string } }).contratos?.cliente_nome;
              const tituloChamado = (c.descricao ?? "").split("\n")[0];
              const badge = STATUS_BADGE[c.status];
              return (
                <tr key={c.id} style={{ borderTop: "0.5px solid #E8ECF2" }}>
                  <td className="px-4 py-3 text-sm font-medium">
                    #{c.contrato_id?.slice(0, 4)}
                  </td>
                  <td className="px-4 py-3 text-sm">{cliente ?? "—"}</td>
                  <td className="px-4 py-3 text-sm">{TIPO_LABEL[c.tipo]}</td>
                  <td className="px-4 py-3 text-sm">{tituloChamado || "—"}</td>
                  <td className="px-4 py-3 text-sm">
                    {new Date(c.data_abertura).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {typeof c.nps === "number" ? (
                      <span style={{ color: npsColor(c.nps), fontWeight: 600 }}>{c.nps}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5"
                      style={{
                        backgroundColor: badge.bg,
                        color: badge.fg,
                        fontSize: 11,
                        fontWeight: 500,
                      }}
                    >
                      {STATUS_LABEL[c.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {c.status !== "resolvido" && (
                        <Button
                          size="sm"
                          style={{ backgroundColor: "#12B76A" }}
                          onClick={() => resolverChamado.mutate(c.id)}
                        >
                          Resolver
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => navigate(`/contratos/${c.contrato_id}?tab=pos-venda`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </>
      )}

      {tab === "nps" && (
        <div
          className="rounded-xl bg-white p-6"
          style={{ border: "0.5px solid #E8ECF2" }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "#0D1117" }}>
            Avaliações NPS
          </h2>
          <p style={{ fontSize: 12, color: "#6B7A90", marginBottom: 16 }}>
            Notas registradas pelos clientes nos chamados.
          </p>
          <div className="overflow-hidden rounded-lg" style={{ border: "0.5px solid #E8ECF2" }}>
            <table className="w-full">
              <thead style={{ backgroundColor: "#F7F9FC" }}>
                <tr>
                  {["Nº", "Cliente", "Nota", "Data", "Comentário"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left"
                      style={{
                        fontSize: 11,
                        color: "#6B7A90",
                        fontWeight: 500,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(chamados ?? [])
                  .filter((c) => typeof c.nps === "number")
                  .map((c) => {
                    const cliente =
                      (c as { contratos?: { cliente_nome?: string } }).contratos?.cliente_nome;
                    return (
                      <tr key={c.id} style={{ borderTop: "0.5px solid #E8ECF2" }}>
                        <td className="px-4 py-3 text-sm font-medium">
                          #{c.contrato_id?.slice(0, 4)}
                        </td>
                        <td className="px-4 py-3 text-sm">{cliente ?? "—"}</td>
                        <td className="px-4 py-3 text-sm">
                          <span style={{ color: npsColor(c.nps as number), fontWeight: 600 }}>
                            {c.nps}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {new Date(c.data_fechamento ?? c.updated_at).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {(c as { nps_comentario?: string }).nps_comentario ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                {(chamados ?? []).filter((c) => typeof c.nps === "number").length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Nenhum NPS registrado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
