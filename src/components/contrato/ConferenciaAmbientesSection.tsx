import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, AlertTriangle, CheckCircle2, Send, Plus, Trash2, ShieldCheck, Package } from "lucide-react";
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
  valor_liquido: number;
  custo_original: number | null;
  custo_conferencia: number | null;
  variacao_pct: number | null;
  conferencia_status: ConferenciaStatus;
  conferente_id: string | null;
  percentual_conferente: number;
  valor_conferente: number;
  itens_original_json: any[];
  itens_conferencia_json: any[];
  aprovacao_solicitada_em: string | null;
}

interface PessoaOpt {
  id: string;
  nome: string;
  percentual_padrao: number;
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

interface Props {
  contratoId: string;
  lojaId: string | null | undefined;
}

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function StatusBadge({ status, variacao }: { status: ConferenciaStatus; variacao: number | null }) {
  const styles: Record<ConferenciaStatus, { bg: string; fg: string; label: string }> = {
    pendente: { bg: "#F1F3F7", fg: "#6B7A90", label: "Pendente" },
    aprovada: { bg: "#E6F4EA", fg: "#05873C", label: "✅ Aprovado" },
    bloqueada: { bg: "#FEE4E2", fg: "#B42318", label: "🔴 Bloqueado" },
    liberada: { bg: "#E0F2FE", fg: "#1E6FBF", label: "Liberado p/ Produção" },
  };
  const s = styles[status];
  return (
    <span
      className="inline-flex items-center rounded px-2 py-0.5"
      style={{ fontSize: 11, fontWeight: 500, backgroundColor: s.bg, color: s.fg, whiteSpace: "nowrap" }}
    >
      {s.label}
    </span>
  );
}

export function ConferenciaAmbientesSection({ contratoId, lojaId }: Props) {
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
          "id, nome, loja_id, contrato_id, valor_liquido, custo_original, custo_conferencia, variacao_pct, conferencia_status, conferente_id, percentual_conferente, valor_conferente, itens_original_json, itens_conferencia_json, aprovacao_solicitada_em, status_medicao",
        )
        .eq("contrato_id", contratoId)
        .eq("status_medicao" as any, "liberado_conferencia")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Ambiente[];
    },
  });

  const { data: conferentes } = useQuery<PessoaOpt[]>({
    queryKey: ["tec-options", lojaId, "conferente"],
    enabled: !!lojaId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("tecnicos_montadores")
        .select("id, nome, percentual_padrao, ativo, funcoes")
        .eq("loja_id", lojaId)
        .contains("funcoes", ["conferente"])
        .eq("ativo", true)
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PessoaOpt[];
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

  const updateAmbiente = async (id: string, patch: Record<string, any>) => {
    const { error } = await sb.from("contrato_ambientes").update(patch).eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    qc.invalidateQueries({ queryKey: ["conferencia-ambientes", contratoId] });
    qc.invalidateQueries({ queryKey: ["contrato_ambientes", contratoId] });
    return true;
  };

  const handleConferenteChange = (a: Ambiente, value: string) => {
    const realId = value === "__none__" ? null : value;
    const m = conferentes?.find((x) => x.id === realId);
    updateAmbiente(a.id, {
      conferente_id: realId,
      percentual_conferente: m ? Number(m.percentual_padrao) : a.percentual_conferente,
    });
  };

  const handleImportXml = async (amb: Ambiente, file: File) => {
    try {
      const text = await file.text();
      const parsed = parsePromobXml(text);

      const target = norm(amb.nome);
      let cat = parsed.categorias.find((c) => norm(c.description) === target);
      if (!cat) cat = parsed.categorias.find((c) => norm(c.description).includes(target) || target.includes(norm(c.description)));

      const custoConferencia = cat?.pedido ?? parsed.total_pedido ?? 0;
      const itensConfer = cat?.itens ?? parsed.itens;

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

  const totalConferentes = ambientes.reduce((acc, a) => acc + (Number(a.valor_conferente) || 0), 0);

  return (
    <div className="rounded-xl bg-white" style={{ border: "0.5px solid #E8ECF2", overflow: "hidden" }}>
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 500, color: "#0D1117" }}>Conferência</h3>
          <p style={{ fontSize: 12, color: "#6B7A90", marginTop: 2 }}>
            Conferência técnica com importação de XML por ambiente
          </p>
        </div>
        <span style={{ fontSize: 12, color: "#6B7A90" }}>
          {ambientes.length} ambiente{ambientes.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="overflow-x-auto" style={{ borderTop: "0.5px solid #E8ECF2" }}>
        <table className="w-full" style={{ minWidth: 1100 }}>
          <thead style={{ backgroundColor: "#F7F9FC" }}>
            <tr>
              {["Ambiente", "Valor líquido", "Conferente", "%", "Valor conferente", "Status", "Variação", "Ações"].map((h) => (
                <th
                  key={h}
                  className="px-3 py-3 text-left"
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
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Carregando...
                </td>
              </tr>
            )}
            {!isLoading && ambientes.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhum ambiente cadastrado neste contrato.
                </td>
              </tr>
            )}
            {ambientes.map((a) => {
              const status = a.conferencia_status;
              const variacao = a.variacao_pct;
              const aguardandoAprov = status === "bloqueada" && !!a.aprovacao_solicitada_em;
              const variacaoColor = variacao == null ? "#6B7A90" : variacao > 10 ? "#B42318" : variacao < -10 ? "#1E6FBF" : "#05873C";
              return (
                <tr key={a.id} style={{ borderTop: "0.5px solid #E8ECF2" }}>
                  <td className="px-3 py-2 text-sm font-medium" style={{ minWidth: 180, color: "#0D1117" }}>
                    {a.nome}
                  </td>
                  <td className="px-3 py-2 text-sm" style={{ whiteSpace: "nowrap", color: "#0D1117" }}>
                    {fmtBRL(Number(a.valor_liquido))}
                  </td>
                  <td className="px-3 py-2" style={{ minWidth: 180 }}>
                    <Select
                      value={a.conferente_id ?? "__none__"}
                      onValueChange={(v) => handleConferenteChange(a, v)}
                      disabled={!canEdit}
                    >
                      <SelectTrigger style={{ height: 32, fontSize: 13 }}>
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Sem conferente —</SelectItem>
                        {conferentes?.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2" style={{ width: 80 }}>
                    <Input
                      type="number"
                      step="0.01"
                      defaultValue={Number(a.percentual_conferente)}
                      disabled={!canEdit}
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value) || 0;
                        if (v !== Number(a.percentual_conferente))
                          updateAmbiente(a.id, { percentual_conferente: v });
                      }}
                      style={{ height: 32, fontSize: 13 }}
                    />
                  </td>
                  <td className="px-3 py-2 text-sm" style={{ whiteSpace: "nowrap", color: "#0D1117" }}>
                    {fmtBRL(Number(a.valor_conferente))}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={status} variacao={variacao} />
                      {aguardandoAprov && (
                        <span
                          className="inline-flex items-center rounded px-2 py-0.5"
                          style={{ fontSize: 10, fontWeight: 500, backgroundColor: "#FFF3CD", color: "#92400E", whiteSpace: "nowrap" }}
                        >
                          ⏳ Aguardando gerente
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-sm" style={{ whiteSpace: "nowrap", fontWeight: 500, color: variacaoColor }}>
                    {variacao == null ? "—" : `${variacao > 0 ? "+" : ""}${variacao.toFixed(1)}%`}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1.5">
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
                      {canEdit && status !== "liberada" && (
                        <Button
                          variant="outline"
                          size="sm"
                          style={{ height: 28, fontSize: 11 }}
                          onClick={() => fileRefs.current[a.id]?.click()}
                        >
                          <Upload size={12} className="mr-1" />
                          XML
                        </Button>
                      )}
                      {(status === "aprovada" || status === "bloqueada" || status === "liberada") && (
                        <Button
                          variant="outline"
                          size="sm"
                          style={{ height: 28, fontSize: 11 }}
                          onClick={() => setOpenAmbId(a.id)}
                        >
                          <Package size={12} className="mr-1" />
                          Itens Extras
                        </Button>
                      )}
                      {status === "bloqueada" && canEdit && !aguardandoAprov && (
                        <Button
                          variant="outline"
                          size="sm"
                          style={{ height: 28, fontSize: 11 }}
                          onClick={() => solicitarAprovacao(a)}
                        >
                          <Send size={12} className="mr-1" />
                          Aprovação
                        </Button>
                      )}
                      {status === "bloqueada" && canApprove && (
                        <Button
                          size="sm"
                          style={{ height: 28, fontSize: 11 }}
                          onClick={() => aprovarComoGerente(a)}
                        >
                          <ShieldCheck size={12} className="mr-1" />
                          Aprovar
                        </Button>
                      )}
                      {status === "aprovada" && canEdit && (
                        <Button
                          size="sm"
                          style={{ height: 28, fontSize: 11 }}
                          onClick={() => liberarParaProducao(a)}
                        >
                          <CheckCircle2 size={12} className="mr-1" />
                          Liberar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div
        className="flex items-center justify-end gap-3 px-5 py-3"
        style={{ borderTop: "0.5px solid #E8ECF2", backgroundColor: "#FAFBFD" }}
      >
        <span style={{ fontSize: 12, color: "#6B7A90" }}>Total a pagar conferentes:</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#0D1117" }}>
          {fmtBRL(totalConferentes)}
        </span>
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
            <div className="text-sm text-muted-foreground">
              Nenhum item extra detectado. Adicione manualmente abaixo se necessário.
            </div>
          )}
          {itens.map((it) => (
            <div
              key={it.id}
              className="flex items-center gap-2 rounded-md border p-2"
              style={{ borderColor: "#E8ECF2" }}
            >
              <Input
                defaultValue={it.descricao}
                onBlur={(e) => e.target.value !== it.descricao && updateItem(it.id, { descricao: e.target.value })}
                disabled={!canEdit || it.status_compra !== "pendente"}
                className="flex-1 h-8 text-sm"
              />
              <Input
                type="number"
                step="0.01"
                defaultValue={it.quantidade}
                onBlur={(e) => {
                  const v = parseFloat(e.target.value) || 0;
                  if (v !== it.quantidade) updateItem(it.id, { quantidade: v });
                }}
                disabled={!canEdit || it.status_compra !== "pendente"}
                className="w-20 h-8 text-sm"
              />
              <Input
                defaultValue={it.unidade ?? ""}
                onBlur={(e) => e.target.value !== it.unidade && updateItem(it.id, { unidade: e.target.value || null })}
                disabled={!canEdit || it.status_compra !== "pendente"}
                className="w-16 h-8 text-sm"
              />
              <Select
                value={it.origem}
                onValueChange={(v) => updateItem(it.id, { origem: v as any })}
                disabled={!canEdit || it.status_compra !== "pendente"}
              >
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comprar">🛒 Comprar</SelectItem>
                  <SelectItem value="almoxarifado">📦 Almoxarifado</SelectItem>
                </SelectContent>
              </Select>
              {it.status_compra === "pendente" ? (
                canEdit && (
                  <button
                    onClick={() => removeItem(it.id)}
                    className="rounded p-1 hover:bg-muted"
                    aria-label="Remover"
                  >
                    <Trash2 size={14} style={{ color: "#B42318" }} />
                  </button>
                )
              ) : (
                <span className="text-[11px] text-muted-foreground">enviado</span>
              )}
            </div>
          ))}

          {canEdit && (
            <div
              className="mt-2 flex items-center gap-2 rounded-md border-dashed border p-2"
              style={{ borderColor: "#B0BAC9" }}
            >
              <Input
                placeholder="Nova descrição..."
                value={novo.descricao}
                onChange={(e) => setNovo({ ...novo, descricao: e.target.value })}
                className="flex-1 h-8 text-sm"
              />
              <Input
                type="number"
                step="0.01"
                value={novo.quantidade}
                onChange={(e) => setNovo({ ...novo, quantidade: parseFloat(e.target.value) || 0 })}
                className="w-20 h-8 text-sm"
              />
              <Input
                value={novo.unidade}
                onChange={(e) => setNovo({ ...novo, unidade: e.target.value })}
                className="w-16 h-8 text-sm"
              />
              <Button size="sm" onClick={addItem}>
                <Plus size={14} />
              </Button>
            </div>
          )}

          {canEdit && itens.some((i) => i.status_compra === "pendente") && (
            <Button onClick={enviarParaCompras} className="mt-2">
              📦 Enviar para Compras
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
