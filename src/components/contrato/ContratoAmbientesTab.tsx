import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";

type StatusMontagem = "pendente" | "agendado" | "concluido" | "pago";

interface Ambiente {
  id: string;
  contrato_id: string;
  loja_id: string;
  nome: string;
  valor_bruto: number;
  desconto_percentual: number;
  valor_liquido: number;
  montador_id: string | null;
  percentual_montador: number;
  valor_montador: number;
  status_montagem: StatusMontagem;
  data_montagem: string | null;
  observacoes: string | null;
  orcamento_id?: string | null;
}

interface MontadorOpt {
  id: string;
  nome: string;
  percentual_padrao: number;
  ativo: boolean;
}

interface OrcamentoOpt {
  id: string;
  nome: string;
  total_pedido: number | null;
  valor_negociado: number | null;
  status: string | null;
}

const STATUS_STYLE: Record<StatusMontagem, { bg: string; color: string; label: string }> = {
  pendente: { bg: "#F1F3F7", color: "#6B7A90", label: "Pendente" },
  agendado: { bg: "#E3F0FB", color: "#1E6FBF", label: "Agendado" },
  concluido: { bg: "#E6F4EA", color: "#05873C", label: "Concluído" },
  pago: { bg: "#EFE5FB", color: "#6E3FBF", label: "Pago" },
};

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const sb = supabase as unknown as { from: (t: string) => any };

const getOrcamentoValor = (o: { total_pedido?: number | null; valor_negociado?: number | null }) =>
  Number(o.valor_negociado ?? o.total_pedido ?? 0);

interface Props {
  contratoId: string;
  contratoLojaId: string;
}

export function ContratoAmbientesTab({ contratoId, contratoLojaId }: Props) {
  const qc = useQueryClient();
  const { perfil } = useAuth();
  const lojaId = contratoLojaId || perfil?.loja_id || null;
  const [importing, setImporting] = useState(false);
  const [openNew, setOpenNew] = useState(false);
  const [editingValor, setEditingValor] = useState<string | null>(null);
  const [agendarFor, setAgendarFor] = useState<Ambiente | null>(null);

  const { data: ambientes, isLoading } = useQuery<Ambiente[]>({
    queryKey: ["contrato_ambientes", contratoId],
    enabled: !!contratoId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("contrato_ambientes")
        .select("*")
        .eq("contrato_id", contratoId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Ambiente[];
    },
  });

  const { data: montadores } = useQuery<MontadorOpt[]>({
    queryKey: ["montadores-options", lojaId],
    enabled: !!lojaId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("tecnicos_montadores")
        .select("id, nome, percentual_padrao, ativo, funcoes")
        .eq("loja_id", lojaId)
        .contains("funcoes", ["montador"])
        .eq("ativo", true)
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MontadorOpt[];
    },
  });

  const { data: orcamentos } = useQuery<OrcamentoOpt[]>({
    queryKey: ["orcamentos-do-contrato", contratoId],
    enabled: !!contratoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamentos")
        .select("id, nome, total_pedido, valor_negociado, status")
        .eq("contrato_id", contratoId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as OrcamentoOpt[];
    },
  });

  // Auto-import: 1 orçamento = 1 ambiente
  useEffect(() => {
    const tryImport = async () => {
      if (!contratoId || !lojaId || isLoading) return;
      if ((ambientes?.length ?? 0) > 0) return;
      if (!orcamentos || orcamentos.length === 0) return;
      if (importing) return;
      setImporting(true);
      try {
        const rows = orcamentos.map((o) => ({
          contrato_id: contratoId,
          loja_id: lojaId,
          nome: o.nome || "Ambiente",
          valor_bruto: getOrcamentoValor(o),
          desconto_percentual: 0,
          percentual_montador: 0,
          status_montagem: "pendente" as const,
        }));
        const { error: insErr } = await sb.from("contrato_ambientes").insert(rows);
        if (insErr) throw insErr;
        qc.invalidateQueries({ queryKey: ["contrato_ambientes", contratoId] });
        toast.success(`${rows.length} ambiente${rows.length === 1 ? "" : "s"} importado${rows.length === 1 ? "" : "s"} do orçamento`);
      } catch (e) {
        console.warn("Import ambientes:", e);
      } finally {
        setImporting(false);
      }
    };
    tryImport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contratoId, lojaId, ambientes?.length, isLoading, orcamentos?.length]);

  const updateAmbiente = async (id: string, patch: Partial<Ambiente>) => {
    const { error } = await sb.from("contrato_ambientes").update(patch).eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    qc.invalidateQueries({ queryKey: ["contrato_ambientes", contratoId] });
    return true;
  };

  const handleMontadorChange = (a: Ambiente, montadorId: string) => {
    const realId = montadorId === "__none__" ? null : montadorId;
    const m = montadores?.find((x) => x.id === realId);
    updateAmbiente(a.id, {
      montador_id: realId,
      percentual_montador: m ? Number(m.percentual_padrao) : a.percentual_montador,
    });
  };

  const recalcularDreMontagem = async () => {
    // Soma valor_montador dos ambientes pagos do contrato
    const { data, error } = await sb
      .from("contrato_ambientes")
      .select("valor_montador,status_montagem")
      .eq("contrato_id", contratoId);
    if (error) return;
    const total = ((data ?? []) as Array<{ valor_montador: number; status_montagem: StatusMontagem }>)
      .filter((x) => x.status_montagem === "pago")
      .reduce((s, x) => s + Number(x.valor_montador || 0), 0);
    await sb.from("dre_contrato").update({ custo_montagem_real: total }).eq("contrato_id", contratoId);
    qc.invalidateQueries({ queryKey: ["contrato_dre_view", contratoId] });
    qc.invalidateQueries({ queryKey: ["dre", contratoId] });
    qc.invalidateQueries({ queryKey: ["dre-tab", contratoId] });
  };

  const handleStatusChange = async (a: Ambiente, novo: StatusMontagem) => {
    if (novo === a.status_montagem) return;

    if (novo === "agendado") {
      setAgendarFor(a);
      return;
    }

    const ok = await updateAmbiente(a.id, { status_montagem: novo });
    if (!ok) return;

    if (novo === "pago") {
      const m = montadores?.find((x) => x.id === a.montador_id);
      const nomeMontador = m?.nome ?? "—";
      const valor = fmtBRL(Number(a.valor_montador || 0));
      try {
        await (supabase as any).rpc("contrato_log_inserir", {
          _contrato_id: contratoId,
          _acao: "montador_pago",
          _titulo: "Pagamento de montador",
          _descricao: `Montador ${nomeMontador} pago — Ambiente ${a.nome} — ${valor}`,
        });
      } catch (e) {
        console.warn("log montador_pago:", e);
      }
      await recalcularDreMontagem();
      qc.invalidateQueries({ queryKey: ["contrato_logs", contratoId] });
      toast.success("Pagamento registrado e DRE atualizado");
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await sb.from("contrato_ambientes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["contrato_ambientes", contratoId] });
  };

  const totals = useMemo(() => {
    const list = ambientes ?? [];
    const totalLiquido = list.reduce((s, a) => s + Number(a.valor_liquido || 0), 0);
    const totalMontador = list.reduce((s, a) => s + Number(a.valor_montador || 0), 0);
    const counts: Record<StatusMontagem, number> = { pendente: 0, agendado: 0, concluido: 0, pago: 0 };
    list.forEach((a) => { counts[a.status_montagem] = (counts[a.status_montagem] ?? 0) + 1; });
    return { totalLiquido, totalMontador, counts };
  }, [ambientes]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0D1117" }}>Ambientes</h2>
          <p style={{ fontSize: 12, color: "#6B7A90" }}>
            {importing ? "Importando ambientes do orçamento..." : "1 orçamento = 1 ambiente. Edite nome e valores se necessário."}
          </p>
        </div>
        <Button onClick={() => setOpenNew(true)} style={{ backgroundColor: "#1E6FBF", color: "#fff" }}>
          <Plus className="mr-2 h-4 w-4" /> Novo Ambiente
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white" style={{ border: "0.5px solid #E8ECF2" }}>
        <table className="w-full" style={{ minWidth: 1100 }}>
          <thead style={{ backgroundColor: "#F7F9FC" }}>
            <tr>
              {["Ambiente", "Valor bruto", "Desc %", "Valor líquido", "Montador", "%", "Valor montador", "Status", "Ações"].map((h) => (
                <th key={h} className="px-3 py-3 text-left" style={{ fontSize: 11, color: "#6B7A90", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-muted-foreground">Carregando...</td></tr>
            )}
            {!isLoading && (ambientes?.length ?? 0) === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-muted-foreground">
                Nenhum ambiente cadastrado. Clique em "Novo Ambiente" ou vincule um orçamento ao contrato.
              </td></tr>
            )}
            {ambientes?.map((a) => {
              const st = STATUS_STYLE[a.status_montagem];
              const isEditingValor = editingValor === a.id;
              return (
                <tr key={a.id} style={{ borderTop: "0.5px solid #E8ECF2" }}>
                  <td className="px-3 py-2" style={{ minWidth: 240 }}>
                    <Input
                      defaultValue={a.nome}
                      onBlur={(e) => e.target.value !== a.nome && updateAmbiente(a.id, { nome: e.target.value })}
                      style={{ height: 32, fontSize: 13, width: "100%" }}
                    />
                  </td>
                  <td className="px-3 py-2" style={{ width: 150 }}>
                    {isEditingValor ? (
                      <Input
                        type="number"
                        step="0.01"
                        autoFocus
                        defaultValue={Number(a.valor_bruto)}
                        onBlur={(e) => {
                          const v = parseFloat(e.target.value) || 0;
                          if (v !== Number(a.valor_bruto)) updateAmbiente(a.id, { valor_bruto: v });
                          setEditingValor(null);
                        }}
                        style={{ height: 32, fontSize: 13 }}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingValor(a.id)}
                        className="w-full rounded px-2 py-1 text-left text-sm font-medium hover:bg-[#F1F3F7]"
                        style={{ color: "#0D1117" }}
                      >
                        {fmtBRL(Number(a.valor_bruto))}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2" style={{ width: 90 }}>
                    <Input
                      type="number"
                      step="0.01"
                      defaultValue={Number(a.desconto_percentual)}
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value) || 0;
                        if (v !== Number(a.desconto_percentual)) updateAmbiente(a.id, { desconto_percentual: v });
                      }}
                      style={{ height: 32, fontSize: 13 }}
                    />
                  </td>
                  <td className="px-3 py-2 text-sm font-medium" style={{ color: "#0D1117", whiteSpace: "nowrap" }}>
                    {fmtBRL(Number(a.valor_liquido))}
                  </td>
                  <td className="px-3 py-2" style={{ minWidth: 160 }}>
                    <Select
                      value={a.montador_id ?? "__none__"}
                      onValueChange={(v) => handleMontadorChange(a, v)}
                    >
                      <SelectTrigger style={{ height: 32, fontSize: 13 }}>
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Sem montador —</SelectItem>
                        {montadores?.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2" style={{ width: 80 }}>
                    <Input
                      type="number"
                      step="0.01"
                      defaultValue={Number(a.percentual_montador)}
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value) || 0;
                        if (v !== Number(a.percentual_montador)) updateAmbiente(a.id, { percentual_montador: v });
                      }}
                      style={{ height: 32, fontSize: 13 }}
                    />
                  </td>
                  <td className="px-3 py-2 text-sm" style={{ color: "#0D1117", whiteSpace: "nowrap" }}>
                    {fmtBRL(Number(a.valor_montador))}
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      value={a.status_montagem}
                      onValueChange={(v) => handleStatusChange(a, v as StatusMontagem)}
                    >
                      <SelectTrigger style={{ height: 28, fontSize: 12, backgroundColor: st.bg, color: st.color, border: "none", fontWeight: 500, width: 120 }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="agendado">Agendado</SelectItem>
                        <SelectItem value="concluido">Concluído</SelectItem>
                        <SelectItem value="pago">Pago</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)}>
                      <Trash2 className="h-4 w-4" style={{ color: "#E53935" }} />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {(ambientes?.length ?? 0) > 0 && (
          <div
            className="grid gap-4 px-4 py-3"
            style={{
              gridTemplateColumns: "1fr 1fr 1fr",
              borderTop: "0.5px solid #E8ECF2",
              backgroundColor: "#F7F9FC",
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: "#6B7A90", textTransform: "uppercase", letterSpacing: "0.04em" }}>Total líquido ambientes</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#0D1117" }}>{fmtBRL(totals.totalLiquido)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#6B7A90", textTransform: "uppercase", letterSpacing: "0.04em" }}>Total a pagar montadores</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#6E3FBF" }}>{fmtBRL(totals.totalMontador)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#6B7A90", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Por status</div>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(STATUS_STYLE) as StatusMontagem[]).map((k) => (
                  <span key={k} style={{ fontSize: 12, padding: "2px 8px", borderRadius: 12, backgroundColor: STATUS_STYLE[k].bg, color: STATUS_STYLE[k].color, fontWeight: 500 }}>
                    {STATUS_STYLE[k].label}: {totals.counts[k]}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <NovoAmbienteDialog
        open={openNew}
        onOpenChange={setOpenNew}
        contratoId={contratoId}
        lojaId={lojaId}
        orcamentos={orcamentos ?? []}
        onCreated={() => qc.invalidateQueries({ queryKey: ["contrato_ambientes", contratoId] })}
      />

      <AgendarMontagemDialog
        open={!!agendarFor}
        onOpenChange={(v) => { if (!v) setAgendarFor(null); }}
        ambiente={agendarFor}
        contratoId={contratoId}
        montadores={montadores ?? []}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["contrato_ambientes", contratoId] });
          qc.invalidateQueries({ queryKey: ["agendamentos"] });
          setAgendarFor(null);
        }}
      />
    </div>
  );
}

interface AgendarDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ambiente: Ambiente | null;
  contratoId: string;
  montadores: MontadorOpt[];
  onSaved: () => void;
}

function AgendarMontagemDialog({ open, onOpenChange, ambiente, contratoId, montadores, onSaved }: AgendarDialogProps) {
  const [data, setData] = useState<string>("");
  const [montadorId, setMontadorId] = useState<string>("__none__");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && ambiente) {
      setData(ambiente.data_montagem ?? new Date().toISOString().slice(0, 10));
      setMontadorId(ambiente.montador_id ?? "__none__");
    }
  }, [open, ambiente]);

  const handleSave = async () => {
    if (!ambiente) return;
    if (!data) return toast.error("Informe a data de montagem");
    const realMontadorId = montadorId === "__none__" ? null : montadorId;
    const m = montadores.find((x) => x.id === realMontadorId);
    setSaving(true);
    try {
      // 1) Atualiza ambiente
      const patch: Partial<Ambiente> = {
        status_montagem: "agendado",
        data_montagem: data,
        montador_id: realMontadorId,
      };
      if (m && (!ambiente.percentual_montador || ambiente.montador_id !== realMontadorId)) {
        patch.percentual_montador = Number(m.percentual_padrao);
      }
      const { error: upErr } = await sb.from("contrato_ambientes").update(patch).eq("id", ambiente.id);
      if (upErr) throw upErr;

      // 2) Cria registro em agendamentos_montagem (1 por ambiente/data)
      const { error: insErr } = await sb.from("agendamentos_montagem").insert({
        contrato_id: contratoId,
        data,
        status: "agendado",
      });
      if (insErr) {
        // Não bloqueia se falhar (ex: trigger de conflito) — apenas avisa
        console.warn("agendamento insert:", insErr);
        toast.warning("Ambiente agendado, mas registro em Montagem falhou: " + insErr.message);
      } else {
        toast.success("Ambiente agendado e registrado em Montagem");
      }
      onSaved();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao agendar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agendar montagem — {ambiente?.nome}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label>Data de montagem</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Confirmar montador</Label>
            <Select value={montadorId} onValueChange={setMontadorId}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Sem montador —</SelectItem>
                {montadores.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nome} ({Number(m.percentual_padrao)}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} style={{ backgroundColor: "#1E6FBF", color: "#fff" }}>
            {saving ? "Salvando..." : "Agendar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface NovoAmbienteDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contratoId: string;
  lojaId: string | null;
  orcamentos: OrcamentoOpt[];
  onCreated: () => void;
}

function NovoAmbienteDialog({ open, onOpenChange, contratoId, lojaId, orcamentos, onCreated }: NovoAmbienteDialogProps) {
  const [nome, setNome] = useState("");
  const [orcamentoId, setOrcamentoId] = useState<string>("__manual__");
  const [valorManual, setValorManual] = useState<string>("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNome("");
      setOrcamentoId("__manual__");
      setValorManual("0");
    }
  }, [open]);

  const orcSelecionado = orcamentos.find((o) => o.id === orcamentoId);

  const handleSave = async () => {
    if (!lojaId) return toast.error("Loja não identificada");
    if (!nome.trim()) return toast.error("Informe o nome do ambiente");
    const valor = orcSelecionado ? getOrcamentoValor(orcSelecionado) : parseFloat(valorManual) || 0;
    setSaving(true);
    try {
      const { error } = await sb.from("contrato_ambientes").insert({
        contrato_id: contratoId,
        loja_id: lojaId,
        nome: nome.trim(),
        valor_bruto: valor,
        desconto_percentual: 0,
        percentual_montador: 0,
        status_montagem: "pendente",
      });
      if (error) throw error;
      toast.success("Ambiente adicionado");
      onCreated();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Ambiente</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label>Nome do ambiente</Label>
            <Input
              placeholder="Ex.: Cozinha, Suíte Principal"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Vincular a orçamento</Label>
            <Select value={orcamentoId} onValueChange={setOrcamentoId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__manual__">— Valor manual —</SelectItem>
                {orcamentos.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.nome} · {fmtBRL(getOrcamentoValor(o))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {orcSelecionado ? (
            <div className="flex flex-col gap-1">
              <Label>Valor bruto (do orçamento)</Label>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{fmtBRL(getOrcamentoValor(orcSelecionado))}</div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label>Valor bruto (manual)</Label>
              <Input
                type="number"
                step="0.01"
                value={valorManual}
                onChange={(e) => setValorManual(e.target.value)}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} style={{ backgroundColor: "#1E6FBF", color: "#fff" }}>
            {saving ? "Salvando..." : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
