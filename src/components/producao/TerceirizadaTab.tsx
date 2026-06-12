import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, AlertTriangle, Link2, FileSpreadsheet, Package, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { NovoPedidoTerceirizadoDialog } from "@/components/producao/NovoPedidoTerceirizadoDialog";
import { VincularPedidoDialog } from "@/components/producao/VincularPedidoDialog";
import { ImportFabricanteXlsDialog } from "@/components/producao/ImportFabricanteXlsDialog";
import { useAuth } from "@/contexts/AuthContext";

type StatusT = "aguardando_fabricacao" | "em_producao" | "pronto_retirada" | "atrasado";

interface Pedido {
  id: string;
  numero_pedido: string;
  oc: string | null;
  contrato_id: string | null;
  cliente_id?: string | null;
  fornecedor_id: string | null;
  data_prevista: string | null;
  transportadora: string | null;
  status: StatusT;
  importado_em: string;
  tipo_entrada?: string;
  tipo?: string | null;
  situacao?: string | null;
  valor?: number | null;
  vinculo_status?: string;
  cliente_nome?: string | null;
  contratos?: { cliente_nome?: string } | null;
  fornecedores?: { nome?: string } | null;
}

const STATUS_OPTS: { value: StatusT; label: string; bg: string; fg: string }[] = [
  { value: "aguardando_fabricacao", label: "Aguardando fabricação", bg: "#FEF3C7", fg: "#E8A020" },
  { value: "em_producao", label: "Em produção", bg: "#E6F3FF", fg: "#1E6FBF" },
  { value: "pronto_retirada", label: "Pronto para retirada", bg: "#D1FAE5", fg: "#05873C" },
  { value: "atrasado", label: "Atrasado", bg: "#FEE4E2", fg: "#E53935" },
];

const statusInfo = (s: StatusT) => STATUS_OPTS.find((o) => o.value === s)!;

const ALL = "__all__";

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

// Extrai o "cliente base" removendo sufixos " - 285004 - CONFERÊNCIA"
const clienteBaseDe = (raw: string | null | undefined): string => {
  const s = (raw || "").toString().trim();
  if (!s) return "(sem cliente)";
  const parts = s.split(/\s+-\s+/);
  if (parts.length > 1) return parts[0].trim();
  const idx = s.indexOf("-");
  return (idx > 0 ? s.slice(0, idx) : s).trim() || s;
};

function MetricCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl bg-white p-5" style={{ border: "0.5px solid #E8ECF2", borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 11, color: "#6B7A90", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600, color: "#0D1117", marginTop: 6 }}>{value}</div>
    </div>
  );
}

function diasRestantes(data: string | null) {
  if (!data) return null;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const d = new Date(data); d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - hoje.getTime()) / 86400000);
  if (diff < 0) return { texto: `${Math.abs(diff)} dias atraso`, color: "#E53935", warn: true };
  if (diff < 3) return { texto: `${diff}d`, color: "#E53935", warn: true };
  if (diff <= 7) return { texto: `${diff}d`, color: "#E8A020", warn: false };
  return { texto: `${diff}d`, color: "#12B76A", warn: false };
}

function DataPrevistaCell({ pedido, onSaved }: { pedido: Pedido; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const value = pedido.data_prevista ? new Date(pedido.data_prevista + "T00:00:00") : undefined;

  const handleSelect = async (date: Date | undefined) => {
    if (!date) return;
    const iso = format(date, "yyyy-MM-dd");
    const sb = supabase as unknown as {
      from: (t: string) => { update: (u: unknown) => { eq: (c: string, v: string) => Promise<{ error: Error | null }> } };
    };
    const { error } = await sb.from("producao_terceirizada").update({ data_prevista: iso }).eq("id", pedido.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Data atualizada");
    setOpen(false);
    onSaved();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="text-sm hover:underline focus:outline-none"
          style={{ color: pedido.data_prevista ? "#0D1117" : "#6B7A90" }}
        >
          {pedido.data_prevista ? new Date(pedido.data_prevista + "T00:00:00").toLocaleDateString("pt-BR") : "Definir data"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleSelect}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}

function TipoBadge({ tipo }: { tipo: string | null | undefined }) {
  const t = (tipo || "").toUpperCase();
  if (t === "V") return <span className="inline-flex items-center rounded-full px-2 py-0.5" style={{ backgroundColor: "#E6F3FF", color: "#1E6FBF", fontSize: 11, fontWeight: 500 }}>Venda</span>;
  if (t === "A") return <span className="inline-flex items-center rounded-full px-2 py-0.5" style={{ backgroundColor: "#FEF3C7", color: "#E8A020", fontSize: 11, fontWeight: 500 }}>Assistência</span>;
  if (t === "B") return <span className="inline-flex items-center rounded-full px-2 py-0.5" style={{ backgroundColor: "#F3E8FF", color: "#7C3AED", fontSize: 11, fontWeight: 500 }}>Bonificação</span>;
  return <span className="text-sm text-muted-foreground">—</span>;
}

function SituacaoBadge({ situacao }: { situacao: string | null | undefined }) {
  const s = (situacao || "").toUpperCase();
  if (s === "L") return <span className="inline-flex items-center rounded-full px-2 py-0.5" style={{ backgroundColor: "#FEF3C7", color: "#B45309", fontSize: 11, fontWeight: 500 }}>Em Fabricação</span>;
  if (s === "T") return <span className="inline-flex items-center rounded-full px-2 py-0.5" style={{ backgroundColor: "#D1FAE5", color: "#05873C", fontSize: 11, fontWeight: 500 }}>Em Transporte</span>;
  return <span className="text-sm text-muted-foreground">—</span>;
}

export function TerceirizadaTab() {
  const qc = useQueryClient();
  const { perfil, hasRole } = useAuth();
  const lojaId = perfil?.loja_id ?? null;
  const podeCriar = hasRole("admin") || hasRole("gerente") || hasRole("tecnico");
  const [novoOpen, setNovoOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [vincularId, setVincularId] = useState<string | null>(null);
  const [filtroFornecedor, setFiltroFornecedor] = useState<string>(ALL);
  const [busca, setBusca] = useState("");

  const { data: fornecedores } = useQuery({
    queryKey: ["fornecedores-filtro-producao", lojaId],
    enabled: !!lojaId,
    queryFn: async () => {
      const { data } = await (supabase as unknown as {
        from: (t: string) => { select: (s: string) => { eq: (c: string, v: unknown) => { eq: (c: string, v: unknown) => { order: (c: string) => Promise<{ data: { id: string; nome: string }[] | null }> } } } };
      }).from("fornecedores").select("id, nome").eq("loja_id", lojaId!).eq("ativo", true).order("nome");
      return data ?? [];
    },
  });

  const { data: pedidos, isLoading } = useQuery({
    queryKey: ["producao-terceirizada"],
    queryFn: async () => {
      const sb = supabase as unknown as {
        from: (t: string) => { select: (s: string) => { order: (c: string, o: { ascending: boolean }) => Promise<{ data: Pedido[] | null; error: Error | null }> } };
      };
      const { data, error } = await sb
        .from("producao_terceirizada")
        .select("id, numero_pedido, oc, contrato_id, cliente_id, fornecedor_id, data_prevista, transportadora, status, importado_em, tipo_entrada, tipo, situacao, valor, vinculo_status, cliente_nome, contratos:contrato_id(cliente_nome), fornecedores:fornecedor_id(nome)")
        .order("data_prevista", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Filtro por fornecedor + busca livre
  const filtered = useMemo(() => {
    if (!pedidos) return [];
    let list = pedidos;
    if (filtroFornecedor !== ALL) list = list.filter((p) => p.fornecedor_id === filtroFornecedor);
    if (busca.trim()) {
      const q = busca.trim().toLowerCase();
      list = list.filter((p) =>
        (p.numero_pedido || "").toLowerCase().includes(q) ||
        (p.oc || "").toLowerCase().includes(q) ||
        (p.cliente_nome || "").toLowerCase().includes(q) ||
        (p.contratos?.cliente_nome || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [pedidos, filtroFornecedor, busca]);

  // Agrupa por cliente base (prioriza contrato->cliente_nome, fallback cliente_nome)
  const grupos = useMemo(() => {
    const map = new Map<string, { key: string; clienteBase: string; itens: Pedido[]; valorTotal: number; piorAtraso: number | null }>();
    for (const p of filtered) {
      const raw = p.contratos?.cliente_nome || p.cliente_nome || "(sem cliente)";
      const base = clienteBaseDe(raw);
      const key = base.toLowerCase();
      if (!map.has(key)) {
        map.set(key, { key, clienteBase: base, itens: [], valorTotal: 0, piorAtraso: null });
      }
      const g = map.get(key)!;
      g.itens.push(p);
      g.valorTotal += Number(p.valor || 0);
      const dr = diasRestantes(p.data_prevista);
      if (dr?.warn) {
        const dias = dr.texto.includes("atraso")
          ? -parseInt(dr.texto, 10)
          : parseInt(dr.texto, 10);
        if (g.piorAtraso == null || dias < g.piorAtraso) g.piorAtraso = dias;
      }
    }
    return Array.from(map.values()).sort((a, b) => a.clienteBase.localeCompare(b.clienteBase, "pt-BR"));
  }, [filtered]);

  const metrics = useMemo(() => {
    const m = { aguardando: 0, pronto: 0, atrasado: 0, ambientes: 0, clientes: 0, valor: 0 };
    for (const g of grupos) {
      m.clientes += 1;
      m.ambientes += g.itens.length;
      m.valor += g.valorTotal;
      for (const p of g.itens) {
        if (p.status === "pronto_retirada") m.pronto++;
        else if (p.status === "atrasado" || (p.data_prevista && new Date(p.data_prevista) < new Date(new Date().setHours(0, 0, 0, 0)))) m.atrasado++;
        else if (p.status === "aguardando_fabricacao") m.aguardando++;
      }
    }
    return m;
  }, [grupos]);

  const updateStatus = async (p: Pedido, novo: StatusT) => {
    const sb = supabase as unknown as {
      from: (t: string) => { update: (u: unknown) => { eq: (c: string, v: string) => Promise<{ error: Error | null }> } };
    };
    const { error } = await sb.from("producao_terceirizada").update({ status: novo }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }

    if (novo === "pronto_retirada" && p.contrato_id) {
      const sb2 = supabase as unknown as {
        from: (t: string) => { update: (u: unknown) => { eq: (c: string, v: string) => Promise<unknown> } };
      };
      await sb2.from("contratos").update({ trava_producao_ok: true }).eq("id", p.contrato_id);
      const { data: userData } = await supabase.auth.getUser();
      await supabase.from("contrato_logs").insert({
        contrato_id: p.contrato_id,
        acao: "producao_terceirizada_concluida",
        etapa: "producao",
        titulo: "Produção terceirizada concluída",
        descricao: `Pedido #${p.numero_pedido} pronto para retirada`,
        usuario_nome: userData.user?.user_metadata?.nome || userData.user?.email || "Sistema",
      });
      toast.success("Produção marcada como pronta! Logística liberada.");
    } else {
      toast.success("Status atualizado");
    }
    qc.invalidateQueries({ queryKey: ["producao-terceirizada"] });
  };

  const gruposAtrasados = grupos.filter((g) => (g.piorAtraso ?? 1) < 0);
  const defaultOpen = gruposAtrasados.length > 0 ? gruposAtrasados.map((g) => g.key) : grupos.slice(0, 5).map((g) => g.key);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0D1117" }}>Pedidos no fabricante</h2>
          <div style={{ fontSize: 12, color: "#6B7A90", marginTop: 2 }}>
            {metrics.clientes} cliente{metrics.clientes !== 1 ? "s" : ""} · {metrics.ambientes} ambiente{metrics.ambientes !== 1 ? "s" : ""} · {fmtBRL(metrics.valor)}
          </div>
        </div>
        {podeCriar && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Importar XLSX do Fabricante
            </Button>
            <Button onClick={() => setNovoOpen(true)} style={{ backgroundColor: "#1E6FBF", color: "#fff" }}>
              <Plus className="mr-2 h-4 w-4" /> Novo Pedido
            </Button>
          </div>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard label="Aguardando fabricação" value={metrics.aguardando} color="#E8A020" />
        <MetricCard label="Pronto para retirada" value={metrics.pronto} color="#12B76A" />
        <MetricCard label="Atrasados" value={metrics.atrasado} color="#E53935" />
        <MetricCard label="Total ambientes" value={metrics.ambientes} color="#1E6FBF" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={filtroFornecedor} onValueChange={setFiltroFornecedor}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os fornecedores</SelectItem>
            {fornecedores?.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por cliente, OC ou nº pedido…"
          className="h-9 w-72 rounded-md border border-input bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6FBF]/30"
        />
      </div>

      {isLoading && (
        <div className="rounded-xl bg-white border border-[#E8ECF2] p-8 text-center text-sm text-muted-foreground">
          Carregando...
        </div>
      )}

      {!isLoading && grupos.length === 0 && (
        <div className="rounded-xl bg-white border border-[#E8ECF2] p-8 text-center text-sm text-muted-foreground">
          Nenhum pedido cadastrado. Use "+ Novo Pedido" ou importe o XLSX do fabricante.
        </div>
      )}

      {!isLoading && grupos.length > 0 && (
        <div className="rounded-xl bg-white border border-[#E8ECF2] overflow-hidden">
          <Accordion type="multiple" defaultValue={defaultOpen} className="w-full">
            {grupos.map((g) => {
              const atrasadosNoGrupo = g.itens.filter((p) => {
                const dr = diasRestantes(p.data_prevista);
                return dr?.warn;
              }).length;
              const totalGrupo = g.itens.length;
              const headerColor = atrasadosNoGrupo > 0 ? "#E53935" : "#0D1117";
              return (
                <AccordionItem key={g.key} value={g.key} style={{ borderTop: "0.5px solid #E8ECF2", borderBottom: "none" }}>
                  <AccordionTrigger className="px-4 hover:no-underline hover:bg-[#F7F9FC]">
                    <div className="flex w-full items-center justify-between pr-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-full"
                          style={{ backgroundColor: atrasadosNoGrupo > 0 ? "#FEE4E2" : "#E6F3FF" }}
                        >
                          <Package className="h-4 w-4" style={{ color: atrasadosNoGrupo > 0 ? "#E53935" : "#1E6FBF" }} />
                        </div>
                        <div className="text-left">
                          <div style={{ fontSize: 14, fontWeight: 600, color: headerColor }}>{g.clienteBase}</div>
                          <div style={{ fontSize: 11, color: "#6B7A90", marginTop: 2 }}>
                            {totalGrupo} ambiente{totalGrupo !== 1 ? "s" : ""} · {fmtBRL(g.valorTotal)}
                            {atrasadosNoGrupo > 0 && (
                              <span style={{ color: "#E53935", marginLeft: 8 }}>
                                · {atrasadosNoGrupo} em atraso
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="overflow-x-auto border-t border-[#E8ECF2]">
                      <table className="w-full min-w-[1000px]">
                        <thead style={{ backgroundColor: "#F7F9FC" }}>
                          <tr>
                            {["Nº pedido", "OC / Ambiente", "Data prevista", "Dias", "Tipo", "Situação", "Valor", "Vínculo", "Status", "Ações"].map((h) => (
                              <th
                                key={h}
                                className="px-4 py-2 text-left"
                                style={{ fontSize: 10, color: "#6B7A90", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {g.itens.map((p) => {
                            const dr = diasRestantes(p.data_prevista);
                            const info = statusInfo(p.status);
                            const isPendente = p.vinculo_status === "pendente";
                            return (
                              <tr
                                key={p.id}
                                style={{
                                  borderTop: "0.5px solid #E8ECF2",
                                  backgroundColor: isPendente ? "#FFFBEB" : dr?.warn ? "#FFF7F7" : undefined,
                                }}
                              >
                                <td className="px-4 py-2 text-sm font-medium">#{p.numero_pedido}</td>
                                <td className="px-4 py-2 text-sm" style={{ color: "#0D1117" }}>
                                  {p.oc ?? "—"}
                                </td>
                                <td className="px-4 py-2">
                                  <DataPrevistaCell pedido={p} onSaved={() => qc.invalidateQueries({ queryKey: ["producao-terceirizada"] })} />
                                </td>
                                <td className="px-4 py-2">
                                  {dr ? (
                                    <span className="inline-flex items-center gap-1" style={{ fontSize: 12, fontWeight: 500, color: dr.color }}>
                                      {dr.warn && <AlertTriangle className="h-3 w-3" />}
                                      {dr.texto}
                                    </span>
                                  ) : <span className="text-sm text-muted-foreground">—</span>}
                                </td>
                                <td className="px-4 py-2"><TipoBadge tipo={p.tipo} /></td>
                                <td className="px-4 py-2"><SituacaoBadge situacao={p.situacao} /></td>
                                <td className="px-4 py-2 text-sm" style={{ color: "#0D1117" }}>
                                  {p.valor != null ? fmtBRL(Number(p.valor)) : <span className="text-muted-foreground">—</span>}
                                </td>
                                <td className="px-4 py-2">
                                  {isPendente ? (
                                    <span
                                      className="inline-flex items-center rounded-full px-2 py-0.5"
                                      style={{ backgroundColor: "#FEF3C7", color: "#B45309", fontSize: 11, fontWeight: 500 }}
                                    >
                                      ⚠ Pendente
                                    </span>
                                  ) : p.contrato_id ? (
                                    <span
                                      className="inline-flex items-center rounded-full px-2 py-0.5"
                                      style={{ backgroundColor: "#D1FAE5", color: "#05873C", fontSize: 11, fontWeight: 500 }}
                                    >
                                      ✓ Vinculado
                                    </span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">avulso</span>
                                  )}
                                </td>
                                <td className="px-4 py-2">
                                  <Select value={p.status} onValueChange={(v) => updateStatus(p, v as StatusT)}>
                                    <SelectTrigger
                                      className="h-7 w-40 text-xs"
                                      style={{ backgroundColor: info.bg, color: info.fg, borderColor: "transparent" }}
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {STATUS_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="px-4 py-2">
                                  {isPendente && (
                                    <Button size="sm" variant="outline" onClick={() => setVincularId(p.id)}>
                                      <Link2 className="h-3 w-3 mr-1" /> Vincular
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      )}

      <NovoPedidoTerceirizadoDialog open={novoOpen} onOpenChange={setNovoOpen} lojaId={lojaId} />
      <ImportFabricanteXlsDialog open={importOpen} onOpenChange={setImportOpen} lojaId={lojaId} fornecedorId={null} />
      <VincularPedidoDialog open={!!vincularId} onOpenChange={(o) => !o && setVincularId(null)} pedidoId={vincularId} lojaId={lojaId} />
    </>
  );
}
