import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, ChevronsUpDown, Eye, Plus, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  assistencia: "Assistência técnica",
  reclamacao: "Reclamação",
  garantia: "Garantia",
  solicitacao: "Solicitação",
};

const TIPO_BADGE: Record<ChamadoTipo, { bg: string; fg: string }> = {
  assistencia: { bg: "#E6F3FF", fg: "#1E6FBF" },
  reclamacao: { bg: "#FDECEA", fg: "#E53935" },
  garantia: { bg: "#EEEDFE", fg: "#534AB7" },
  solicitacao: { bg: "#E8ECF2", fg: "#6B7A90" },
};

const STATUS_LABEL: Record<ChamadoStatus, string> = {
  aberto: "Aberto",
  em_andamento: "Em andamento",
  resolvido: "Resolvido",
};

const STATUS_BADGE: Record<ChamadoStatus, { bg: string; fg: string }> = {
  aberto: { bg: "#FDECEA", fg: "#E53935" },
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
      const tit = titulo.trim().slice(0, 80);
      if (!tit) throw new Error("Informe um título");
      const desc = `${tit}${descricao.trim() ? "\n\n" + descricao.trim() : ""}`;
      const custoNum = custo === "" ? 0 : Number(custo);
      if (Number.isNaN(custoNum) || custoNum < 0) throw new Error("Custo inválido");
      const { error } = await supabase.from("chamados_pos_venda").insert({
        contrato_id: contratoId,
        tipo,
        descricao: desc,
        custo: custoNum,
      });
      if (error) throw error;
      // log no contrato (autor_id obrigatório pela RLS é injetado via trigger SECURITY DEFINER)
      await supabase.rpc("contrato_log_inserir", {
        _contrato_id: contratoId,
        _acao: "chamado_aberto",
        _titulo: `Chamado aberto: ${tit}`,
        _descricao: TIPO_LABEL[tipo],
      });
    },
    onSuccess: () => {
      toast.success("Chamado aberto com sucesso");
      qc.invalidateQueries({ queryKey: ["pos-venda-list"] });
      setOpen(false);
      reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Resolver chamado dialog
  type ChamadoRow = {
    id: string;
    contrato_id: string;
    tipo: ChamadoTipo;
    descricao: string;
    custo: number | null;
  };
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveTarget, setResolveTarget] = useState<ChamadoRow | null>(null);
  const [resolveCusto, setResolveCusto] = useState("");
  const [resolveDesc, setResolveDesc] = useState("");
  const [resolveData, setResolveData] = useState(() => new Date().toISOString().slice(0, 10));

  const openResolveDialog = (c: ChamadoRow) => {
    setResolveTarget(c);
    setResolveCusto(c.custo != null ? String(c.custo) : "");
    setResolveDesc("");
    setResolveData(new Date().toISOString().slice(0, 10));
    setResolveOpen(true);
  };

  const resolverChamado = useMutation({
    mutationFn: async () => {
      if (!resolveTarget) throw new Error("Chamado não selecionado");
      const resolucao = resolveDesc.trim();
      if (!resolucao) throw new Error("Descreva a resolução");
      const custoNum = resolveCusto === "" ? 0 : Number(resolveCusto);
      if (Number.isNaN(custoNum) || custoNum < 0) throw new Error("Custo inválido");
      const tituloOrig = resolveTarget.descricao.split("\n")[0];
      const novaDesc = `${resolveTarget.descricao}\n\n--- Resolução (${resolveData}) ---\n${resolucao}`;
      const { error } = await supabase
        .from("chamados_pos_venda")
        .update({
          status: "resolvido",
          data_fechamento: new Date(`${resolveData}T12:00:00`).toISOString(),
          custo: custoNum,
          descricao: novaDesc,
        })
        .eq("id", resolveTarget.id);
      if (error) throw error;
      await supabase.rpc("contrato_log_inserir", {
        _contrato_id: resolveTarget.contrato_id,
        _acao: "chamado_resolvido",
        _titulo: `Chamado resolvido: ${tituloOrig}`,
        _descricao: resolucao,
      });
    },
    onSuccess: () => {
      toast.success("Chamado resolvido. DRE atualizado.");
      qc.invalidateQueries({ queryKey: ["pos-venda-list"] });
      setResolveOpen(false);
      setResolveTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // NPS dialog state
  const [npsOpen, setNpsOpen] = useState(false);
  const [npsTarget, setNpsTarget] = useState<{ id: string; cliente?: string } | null>(null);
  const [npsNota, setNpsNota] = useState<string>("");
  const [npsComentario, setNpsComentario] = useState("");

  const registrarNps = useMutation({
    mutationFn: async () => {
      if (!npsTarget) throw new Error("Selecione um chamado");
      const n = Number(npsNota);
      if (!Number.isInteger(n) || n < 0 || n > 10) {
        throw new Error("Nota deve ser um inteiro entre 0 e 10");
      }
      const comentario = npsComentario.trim().slice(0, 500);
      const { error } = await supabase
        .from("chamados_pos_venda")
        .update({ nps: n, nps_comentario: comentario || null })
        .eq("id", npsTarget.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("NPS registrado");
      qc.invalidateQueries({ queryKey: ["pos-venda-list"] });
      setNpsOpen(false);
      setNpsTarget(null);
      setNpsNota("");
      setNpsComentario("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openNpsDialog = (id: string, cliente?: string, current?: number | null, comentario?: string | null) => {
    setNpsTarget({ id, cliente });
    setNpsNota(current != null ? String(current) : "");
    setNpsComentario(comentario ?? "");
    setNpsOpen(true);
  };

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
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Abrir chamado</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>
                  Contrato <span style={{ color: "#E53935" }}>*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <span className={contratoId ? "" : "text-muted-foreground"}>
                        {(() => {
                          const c = contratos.find((x) => x.id === contratoId);
                          return c
                            ? `#${c.id.slice(0, 4)} — ${c.cliente_nome}`
                            : "Selecione um contrato";
                        })()}
                      </span>
                      <ChevronsUpDown className="h-4 w-4 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[420px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar cliente ou nº..." />
                      <CommandList>
                        <CommandEmpty>Nenhum contrato encontrado.</CommandEmpty>
                        <CommandGroup>
                          {contratos.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={`${c.id.slice(0, 4)} ${c.cliente_nome}`}
                              onSelect={() => setContratoId(c.id)}
                            >
                              #{c.id.slice(0, 4)} — {c.cliente_nome}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>
                  Tipo <span style={{ color: "#E53935" }}>*</span>
                </Label>
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

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label>
                    Título <span style={{ color: "#E53935" }}>*</span>
                  </Label>
                  <span style={{ fontSize: 11, color: "#6B7A90" }}>
                    {titulo.length}/80
                  </span>
                </div>
                <Input
                  maxLength={80}
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Descrição</Label>
                <Textarea
                  rows={4}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Custo de assistência (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder=""
                  value={custo}
                  onChange={(e) => setCusto(e.target.value)}
                />
                <span style={{ fontSize: 12, color: "#E8A020" }}>
                  Valores acima de R$ 0 serão adicionados ao DRE do contrato
                </span>
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
                className="gap-1.5"
              >
                Abrir chamado <ArrowRight className="h-4 w-4" />
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
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar cliente ou nº..."
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
              {["Nº", "Contrato", "Cliente", "Tipo", "Título", "Status", "Custo", "Aberto em", "Ações"].map(
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
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Carregando...
                </td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-12 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle2 className="h-10 w-10" style={{ color: "#12B76A" }} />
                    <div style={{ color: "#12B76A", fontSize: 14, fontWeight: 500 }}>
                      Nenhum chamado aberto ✓
                    </div>
                  </div>
                </td>
              </tr>
            )}
            {filtered.map((c, idx) => {
              const cliente =
                (c as { contratos?: { cliente_nome?: string } }).contratos?.cliente_nome;
              const tituloChamado = (c.descricao ?? "").split("\n")[0];
              const statusBadge = STATUS_BADGE[c.status];
              const tipoBadge = TIPO_BADGE[c.tipo];
              const custoNum = Number(c.custo) || 0;
              const rowBg = c.status === "aberto" ? "#FFF8F8" : undefined;
              return (
                <tr
                  key={c.id}
                  style={{ borderTop: "0.5px solid #E8ECF2", backgroundColor: rowBg }}
                >
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: "#6B7A90" }}>
                    {String(idx + 1).padStart(3, "0")}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">
                    #{c.contrato_id?.slice(0, 4)}
                  </td>
                  <td className="px-4 py-3 text-sm">{cliente ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5"
                      style={{
                        backgroundColor: tipoBadge.bg,
                        color: tipoBadge.fg,
                        fontSize: 11,
                        fontWeight: 500,
                      }}
                    >
                      {TIPO_LABEL[c.tipo]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{tituloChamado || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5"
                      style={{
                        backgroundColor: statusBadge.bg,
                        color: statusBadge.fg,
                        fontSize: 11,
                        fontWeight: 500,
                      }}
                    >
                      {STATUS_LABEL[c.status]}
                    </span>
                  </td>
                  <td
                    className="px-4 py-3 text-sm"
                    style={{
                      color: custoNum > 0 ? "#E53935" : "#B0BAC9",
                      fontWeight: custoNum > 0 ? 600 : 400,
                    }}
                  >
                    {custoNum.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {new Date(c.data_abertura).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {c.status !== "resolvido" && (
                        <Button
                          size="sm"
                          style={{ backgroundColor: "#12B76A" }}
                          onClick={() =>
                            openResolveDialog({
                              id: c.id,
                              contrato_id: c.contrato_id,
                              tipo: c.tipo,
                              descricao: c.descricao,
                              custo: Number(c.custo ?? 0),
                            })
                          }
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
          {(() => {
            const notas = (chamados ?? [])
              .map((c) => c.nps)
              .filter((n): n is number => typeof n === "number");
            const total = notas.length;
            const promotores = notas.filter((n) => n >= 9).length;
            const neutros = notas.filter((n) => n >= 7 && n <= 8).length;
            const detratores = notas.filter((n) => n <= 6).length;
            const pctP = total ? (promotores / total) * 100 : 0;
            const pctN = total ? (neutros / total) * 100 : 0;
            const pctD = total ? (detratores / total) * 100 : 0;
            const score = total ? Math.round(pctP - pctD) : null;
            const scoreColor =
              score === null ? "#0D1117" : score >= 50 ? "#12B76A" : score >= 0 ? "#E8A020" : "#E53935";
            return (
              <div
                className="mb-4 grid grid-cols-1 gap-4 rounded-lg p-4 md:grid-cols-4"
                style={{ border: "0.5px solid #E8ECF2", backgroundColor: "#F7F9FC" }}
              >
                <div>
                  <div style={{ fontSize: 11, color: "#6B7A90", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    NPS Score
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: scoreColor, marginTop: 4 }}>
                    {score === null ? "—" : score}
                  </div>
                  <div style={{ fontSize: 11, color: "#6B7A90" }}>
                    {total} {total === 1 ? "avaliação" : "avaliações"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#6B7A90", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Promotores (9-10)
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: "#12B76A", marginTop: 4 }}>
                    {pctP.toFixed(0)}% <span style={{ fontSize: 12, color: "#6B7A90", fontWeight: 400 }}>· {promotores}</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#6B7A90", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Neutros (7-8)
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: "#E8A020", marginTop: 4 }}>
                    {pctN.toFixed(0)}% <span style={{ fontSize: 12, color: "#6B7A90", fontWeight: 400 }}>· {neutros}</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#6B7A90", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Detratores (0-6)
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: "#E53935", marginTop: 4 }}>
                    {pctD.toFixed(0)}% <span style={{ fontSize: 12, color: "#6B7A90", fontWeight: 400 }}>· {detratores}</span>
                  </div>
                </div>
              </div>
            );
          })()}
          <div className="overflow-hidden rounded-lg" style={{ border: "0.5px solid #E8ECF2" }}>
            <table className="w-full">
              <thead style={{ backgroundColor: "#F7F9FC" }}>
                <tr>
                  {["Nº", "Cliente", "Nota", "Data", "Comentário", "Ações"].map((h) => (
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
                {(chamados ?? []).map((c) => {
                  const cliente =
                    (c as { contratos?: { cliente_nome?: string } }).contratos?.cliente_nome;
                  const comentario = (c as { nps_comentario?: string }).nps_comentario;
                  const hasNps = typeof c.nps === "number";
                  return (
                    <tr key={c.id} style={{ borderTop: "0.5px solid #E8ECF2" }}>
                      <td className="px-4 py-3 text-sm font-medium">
                        #{c.contrato_id?.slice(0, 4)}
                      </td>
                      <td className="px-4 py-3 text-sm">{cliente ?? "—"}</td>
                      <td className="px-4 py-3 text-sm">
                        {hasNps ? (
                          <span style={{ color: npsColor(c.nps as number), fontWeight: 600 }}>
                            {c.nps}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(c.data_fechamento ?? c.updated_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {comentario ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openNpsDialog(c.id, cliente, c.nps, comentario)}
                        >
                          {hasNps ? "Editar" : "Registrar"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {(chamados ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Nenhum chamado encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={npsOpen} onOpenChange={setNpsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Registrar NPS{npsTarget?.cliente ? ` · ${npsTarget.cliente}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label>Nota (0 a 10)</Label>
              <Input
                type="number"
                min={0}
                max={10}
                value={npsNota}
                onChange={(e) => setNpsNota(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Comentário (opcional)</Label>
              <Textarea
                maxLength={500}
                value={npsComentario}
                onChange={(e) => setNpsComentario(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNpsOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => registrarNps.mutate()}
              disabled={registrarNps.isPending}
              style={{ backgroundColor: "#1E6FBF" }}
            >
              Salvar NPS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
