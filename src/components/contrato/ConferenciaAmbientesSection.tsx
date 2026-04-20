import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, AlertTriangle, CheckCircle2, Lock, Send, Plus, Trash2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { parsePromobXml } from "@/lib/promob-xml";

const sb = supabase as unknown as { from: (t: string) => any; rpc?: any };
const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

type ConferenciaStatus = "pendente" | "aprovada" | "bloqueada" | "liberada";

interface Ambiente {
  id: string;
  nome: string;
  loja_id: string;
  contrato_id: string;
  custo_original: number | null;
  custo_conferencia: number | null;
  variacao_pct: number | null;
  conferencia_status: ConferenciaStatus;
  itens_original_json: any[];
  itens_conferencia_json: any[];
  aprovacao_solicitada_em: string | null;
}

interface ItemExtra {
  id: string;
  ambiente_id: string;
  descricao: string;
  quantidade: number;
  unidade: string | null;
  origem: "comprar" | "almoxarifado";
  status_compra: string;
}

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function StatusBadge({ status, variacao }: { status: ConferenciaStatus; variacao: number | null }) {
  const styles: Record<ConferenciaStatus, { bg: string; fg: string; label: string }> = {
    pendente: { bg: "#F1F3F7", fg: "#6B7A90", label: "Aguardando conferência" },
    aprovada: {
      bg: "#E6F4EA",
      fg: "#05873C",
      label: variacao != null ? `🟢 Aprovado — variação ${variacao.toFixed(1)}%` : "🟢 Aprovado",
    },
    bloqueada: {
      bg: "#FEE4E2",
      fg: "#B42318",
      label: variacao != null ? `🔴 Bloqueado — variação +${variacao.toFixed(1)}%` : "🔴 Bloqueado",
    },
    liberada: { bg: "#E0F2FE", fg: "#1E6FBF", label: "✅ Liberado para Produção" },
  };
  const s = styles[status];
  return (
    <span
      className="inline-flex items-center rounded px-2 py-1"
      style={{ fontSize: 11, fontWeight: 500, backgroundColor: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}

export function ConferenciaAmbientesSection({ contratoId }: { contratoId: string }) {
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const canEdit = hasRole("admin") || hasRole("gerente") || hasRole("tecnico");
  const canApprove = hasRole("admin") || hasRole("gerente");
  const [openAmbId, setOpenAmbId] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data: ambientes = [], isLoading } = useQuery<Ambiente[]>({
    queryKey: ["conferencia-ambientes", contratoId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("contrato_ambientes")
        .select(
          "id, nome, loja_id, contrato_id, custo_original, custo_conferencia, variacao_pct, conferencia_status, itens_original_json, itens_conferencia_json, aprovacao_solicitada_em",
        )
        .eq("contrato_id", contratoId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Ambiente[];
    },
  });

  const { data: orcamento } = useQuery({
    queryKey: ["orcamento-do-contrato", contratoId],
    queryFn: async () => {
      const { data } = await sb
        .from("orcamentos")
        .select("id, xml_raw, total_pedido, categorias, itens")
        .eq("contrato_id", contratoId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const handleImportXml = async (amb: Ambiente, file: File) => {
    try {
      const text = await file.text();
      const parsed = parsePromobXml(text);

      // Match category by ambiente.nome (case/diacritic insensitive contains)
      const target = norm(amb.nome);
      let cat = parsed.categorias.find((c) => norm(c.description) === target);
      if (!cat) cat = parsed.categorias.find((c) => norm(c.description).includes(target) || target.includes(norm(c.description)));

      const custoConferencia = cat?.pedido ?? parsed.total_pedido ?? 0;
      const itensConfer = cat?.itens ?? parsed.itens;

      // Original cost: prefer matching CATEGORY in saved orcamento; fallback to ambiente custo_original or orcamento.total_pedido
      let custoOriginal = Number(amb.custo_original) || 0;
      let itensOriginais: any[] = (amb.itens_original_json as any[]) || [];
      if ((!custoOriginal || itensOriginais.length === 0) && orcamento?.xml_raw) {
        try {
          const origParsed = parsePromobXml(orcamento.xml_raw);
          let oc = origParsed.categorias.find((c) => norm(c.description) === target);
          if (!oc) oc = origParsed.categorias.find((c) => norm(c.description).includes(target) || target.includes(norm(c.description)));
          if (oc) {
            custoOriginal = oc.pedido;
            itensOriginais = oc.itens as any[];
          }
        } catch {}
      }
      if (!custoOriginal && orcamento?.total_pedido) {
        custoOriginal = Number(orcamento.total_pedido) / Math.max(1, ambientes.length);
      }

      if (!custoOriginal || custoOriginal <= 0) {
        toast.error("Não foi possível determinar o custo original deste ambiente. Confira se o orçamento está vinculado.");
        return;
      }

      const variacao = ((custoConferencia - custoOriginal) / custoOriginal) * 100;
      const novoStatus: ConferenciaStatus = variacao > 10 ? "bloqueada" : "aprovada";

      const { error } = await sb
        .from("contrato_ambientes")
        .update({
          custo_original: custoOriginal,
          custo_conferencia: custoConferencia,
          variacao_pct: Number(variacao.toFixed(2)),
          conferencia_status: novoStatus,
          conferencia_xml_raw: text,
          itens_original_json: itensOriginais,
          itens_conferencia_json: itensConfer,
          conferencia_aprovada_em: novoStatus === "aprovada" ? new Date().toISOString() : null,
          aprovacao_solicitada_em: null,
        })
        .eq("id", amb.id);
      if (error) throw error;

      // Auto-create itens extras (descriptions present in conference but not in original)
      const origSet = new Set(itensOriginais.map((i: any) => norm(String(i.description || ""))));
      const extras = itensConfer.filter((i: any) => !origSet.has(norm(String(i.description || ""))));
      if (extras.length > 0) {
        const rows = extras.map((i: any) => ({
          ambiente_id: amb.id,
          contrato_id: contratoId,
          loja_id: amb.loja_id,
          descricao: i.description || "Item",
          quantidade: Number(i.quantity) || 1,
          unidade: i.unit || null,
          origem: "comprar",
          status_compra: "pendente",
        }));
        await sb.from("ambiente_itens_extras").insert(rows);
      }

      qc.invalidateQueries({ queryKey: ["conferencia-ambientes", contratoId] });
      qc.invalidateQueries({ queryKey: ["itens-extras", amb.id] });
      toast.success(
        novoStatus === "aprovada"
          ? `Conferência aprovada (variação ${variacao.toFixed(1)}%)`
          : `Conferência bloqueada (variação +${variacao.toFixed(1)}%)`,
      );
    } catch (e: any) {
      toast.error(e?.message || "Falha ao importar XML");
    }
  };

  const solicitarAprovacao = async (amb: Ambiente) => {
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await sb
      .from("contrato_ambientes")
      .update({
        aprovacao_solicitada_em: new Date().toISOString(),
        aprovacao_solicitada_por: auth.user?.id ?? null,
      })
      .eq("id", amb.id);
    if (error) return toast.error(error.message);
    toast.success("Aprovação solicitada ao gerente");
    qc.invalidateQueries({ queryKey: ["conferencia-ambientes", contratoId] });
  };

  const aprovarComoGerente = async (amb: Ambiente) => {
    const { data, error } = await (sb as any).rpc("aprovar_conferencia_ambiente", { _ambiente_id: amb.id });
    if (error) return toast.error(error.message);
    const r = data as { ok: boolean; erro?: string };
    if (!r?.ok) return toast.error(r?.erro || "Falha");
    toast.success("Conferência aprovada");
    qc.invalidateQueries({ queryKey: ["conferencia-ambientes", contratoId] });
  };

  const liberarParaProducao = async (amb: Ambiente) => {
    const { error } = await sb
      .from("contrato_ambientes")
      .update({ conferencia_status: "liberada" })
      .eq("id", amb.id);
    if (error) return toast.error(error.message);
    toast.success("Ambiente liberado para Produção ✓");
    qc.invalidateQueries({ queryKey: ["conferencia-ambientes", contratoId] });
  };

  return (
    <div className="rounded-xl bg-white" style={{ border: "0.5px solid #E8ECF2", overflow: "hidden" }}>
      <div className="flex items-center justify-between px-5 py-4">
        <h3 style={{ fontSize: 15, fontWeight: 500, color: "#0D1117" }}>Conferência por ambiente — XML</h3>
        <span style={{ fontSize: 12, color: "#6B7A90" }}>
          {ambientes.length} ambiente{ambientes.length === 1 ? "" : "s"}
        </span>
      </div>

      <div style={{ borderTop: "0.5px solid #E8ECF2" }}>
        {isLoading && <div className="p-6 text-sm text-muted-foreground">Carregando…</div>}
        {!isLoading && ambientes.length === 0 && (
          <div className="p-6 text-sm text-muted-foreground">Nenhum ambiente cadastrado.</div>
        )}
        {ambientes.map((a) => {
          const variacao = a.variacao_pct;
          const status = a.conferencia_status;
          const aguardandoAprov = status === "bloqueada" && !!a.aprovacao_solicitada_em;
          return (
            <div key={a.id} className="px-5 py-4" style={{ borderTop: "0.5px solid #E8ECF2" }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#0D1117" }}>{a.nome}</span>
                    <StatusBadge status={status} variacao={variacao} />
                    {aguardandoAprov && (
                      <span
                        className="inline-flex items-center rounded px-2 py-0.5"
                        style={{ fontSize: 11, fontWeight: 500, backgroundColor: "#FFF3CD", color: "#92400E" }}
                      >
                        ⏳ Aguardando gerente
                      </span>
                    )}
                  </div>
                  <div className="flex gap-6" style={{ fontSize: 12, color: "#6B7A90" }}>
                    <span>Original: <strong style={{ color: "#0D1117" }}>{fmtBRL(Number(a.custo_original) || 0)}</strong></span>
                    <span>Conferência: <strong style={{ color: "#0D1117" }}>{fmtBRL(Number(a.custo_conferencia) || 0)}</strong></span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <input
                    ref={(el) => (fileRefs.current[a.id] = el)}
                    type="file"
                    accept=".xml,text/xml,application/xml"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleImportXml(a, f);
                      e.target.value = "";
                    }}
                  />
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileRefs.current[a.id]?.click()}
                      disabled={status === "liberada"}
                    >
                      <Upload size={14} className="mr-1.5" />
                      Importar XML
                    </Button>
                  )}
                  {status === "bloqueada" && canEdit && !aguardandoAprov && (
                    <Button size="sm" variant="outline" onClick={() => solicitarAprovacao(a)}>
                      <Send size={14} className="mr-1.5" />
                      Solicitar aprovação
                    </Button>
                  )}
                  {status === "bloqueada" && canApprove && (
                    <Button size="sm" onClick={() => aprovarComoGerente(a)}>
                      <ShieldCheck size={14} className="mr-1.5" />
                      Aprovar como gerente
                    </Button>
                  )}
                  {(status === "aprovada" || status === "bloqueada") && (
                    <Button variant="outline" size="sm" onClick={() => setOpenAmbId(a.id)}>
                      Itens extras
                    </Button>
                  )}
                  {status === "aprovada" && canEdit && (
                    <Button size="sm" onClick={() => liberarParaProducao(a)}>
                      <CheckCircle2 size={14} className="mr-1.5" />
                      Liberar para Produção
                    </Button>
                  )}
                </div>
              </div>

              {status === "bloqueada" && (
                <div
                  className="mt-3 flex items-start gap-2 rounded-md p-3"
                  style={{ backgroundColor: "#FEF3F2", color: "#B42318", fontSize: 12 }}
                >
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>
                    O custo de conferência superou 10% do contrato original. Necessário aprovação do gerente ou
                    nova cobrança ao cliente.
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ItensExtrasDrawer
        ambiente={ambientes.find((a) => a.id === openAmbId) ?? null}
        onClose={() => setOpenAmbId(null)}
        canEdit={canEdit}
      />
    </div>
  );
}

function ItensExtrasDrawer({
  ambiente,
  onClose,
  canEdit,
}: {
  ambiente: Ambiente | null;
  onClose: () => void;
  canEdit: boolean;
}) {
  const qc = useQueryClient();
  const open = !!ambiente;
  const [novo, setNovo] = useState({ descricao: "", quantidade: 1, unidade: "un", origem: "comprar" as const });

  const { data: itens = [] } = useQuery<ItemExtra[]>({
    queryKey: ["itens-extras", ambiente?.id],
    enabled: !!ambiente?.id,
    queryFn: async () => {
      const { data, error } = await sb
        .from("ambiente_itens_extras")
        .select("id, ambiente_id, descricao, quantidade, unidade, origem, status_compra")
        .eq("ambiente_id", ambiente!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ItemExtra[];
    },
  });

  const reload = () => qc.invalidateQueries({ queryKey: ["itens-extras", ambiente?.id] });

  const updateItem = async (id: string, patch: Partial<ItemExtra>) => {
    const { error } = await sb.from("ambiente_itens_extras").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    reload();
  };

  const removeItem = async (id: string) => {
    const { error } = await sb.from("ambiente_itens_extras").delete().eq("id", id);
    if (error) return toast.error(error.message);
    reload();
  };

  const addItem = async () => {
    if (!ambiente) return;
    if (!novo.descricao.trim()) return toast.error("Descrição obrigatória");
    const { error } = await sb.from("ambiente_itens_extras").insert({
      ambiente_id: ambiente.id,
      contrato_id: ambiente.contrato_id,
      loja_id: ambiente.loja_id,
      descricao: novo.descricao.trim(),
      quantidade: novo.quantidade,
      unidade: novo.unidade,
      origem: novo.origem,
      status_compra: "pendente",
    });
    if (error) return toast.error(error.message);
    setNovo({ descricao: "", quantidade: 1, unidade: "un", origem: "comprar" });
    reload();
  };

  const enviarParaCompras = async () => {
    if (!ambiente) return;
    const pendentes = itens.filter((i) => i.status_compra === "pendente");
    if (pendentes.length === 0) return toast.error("Nenhum item pendente para enviar");
    const { data: auth } = await supabase.auth.getUser();

    const { error: e1 } = await sb.from("requisicoes_compra").insert({
      loja_id: ambiente.loja_id,
      contrato_id: ambiente.contrato_id,
      ambiente_id: ambiente.id,
      itens_json: pendentes.map((i) => ({
        id: i.id,
        descricao: i.descricao,
        quantidade: i.quantidade,
        unidade: i.unidade,
        origem: i.origem,
        status: "pendente",
      })),
      status: "aberta",
      created_by: auth.user?.id ?? null,
    });
    if (e1) return toast.error(e1.message);

    const ids = pendentes.map((i) => i.id);
    await sb.from("ambiente_itens_extras").update({ status_compra: "enviado_compras" }).in("id", ids);

    toast.success("Requisição de compra criada ✓");
    reload();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Itens extras — {ambiente?.nome}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 flex flex-col gap-3">
          {itens.length === 0 && (
            <div className="text-sm text-muted-foreground">Nenhum item extra detectado.</div>
          )}
          {itens.map((it) => (
            <div
              key={it.id}
              className="rounded-md border p-3 flex flex-col gap-2"
              style={{ borderColor: "#E8ECF2" }}
            >
              <div className="flex items-start justify-between gap-2">
                <Input
                  defaultValue={it.descricao}
                  onBlur={(e) => e.target.value !== it.descricao && updateItem(it.id, { descricao: e.target.value })}
                  disabled={!canEdit || it.status_compra !== "pendente"}
                  className="text-sm"
                />
                {canEdit && it.status_compra === "pendente" && (
                  <Button variant="ghost" size="icon" onClick={() => removeItem(it.id)}>
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  step="0.01"
                  defaultValue={it.quantidade}
                  onBlur={(e) => updateItem(it.id, { quantidade: parseFloat(e.target.value) || 0 })}
                  disabled={!canEdit || it.status_compra !== "pendente"}
                />
                <Input
                  defaultValue={it.unidade ?? ""}
                  onBlur={(e) => updateItem(it.id, { unidade: e.target.value })}
                  disabled={!canEdit || it.status_compra !== "pendente"}
                  placeholder="un"
                />
                <Select
                  value={it.origem}
                  onValueChange={(v) => updateItem(it.id, { origem: v as any })}
                  disabled={!canEdit || it.status_compra !== "pendente"}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comprar">🛒 Comprar</SelectItem>
                    <SelectItem value="almoxarifado">📦 Almoxarifado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div style={{ fontSize: 11, color: "#6B7A90" }}>
                Status: <strong>{it.status_compra}</strong>
              </div>
            </div>
          ))}

          {canEdit && (
            <div className="rounded-md p-3 mt-2" style={{ backgroundColor: "#F7F9FC" }}>
              <div className="text-xs font-medium mb-2">Adicionar item</div>
              <div className="flex flex-col gap-2">
                <Input
                  placeholder="Descrição"
                  value={novo.descricao}
                  onChange={(e) => setNovo((n) => ({ ...n, descricao: e.target.value }))}
                />
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    type="number"
                    value={novo.quantidade}
                    onChange={(e) => setNovo((n) => ({ ...n, quantidade: parseFloat(e.target.value) || 0 }))}
                  />
                  <Input
                    value={novo.unidade}
                    onChange={(e) => setNovo((n) => ({ ...n, unidade: e.target.value }))}
                  />
                  <Select value={novo.origem} onValueChange={(v) => setNovo((n) => ({ ...n, origem: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comprar">🛒 Comprar</SelectItem>
                      <SelectItem value="almoxarifado">📦 Almoxarifado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" variant="outline" onClick={addItem}>
                  <Plus size={14} className="mr-1.5" /> Adicionar
                </Button>
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <Button onClick={enviarParaCompras} disabled={!canEdit || itens.filter(i => i.status_compra === "pendente").length === 0}>
              <Send size={14} className="mr-1.5" />
              Enviar para Compras
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
