import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Save, Layers, Target, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// Types
type FaixaEscalonamento = { faixa_min: number; faixa_max: number | null; percentual: number };
type BonusMeta = { papel_id: string; meta_contratos: number; meta_valor: number; bonus_percentual: number };
type SplitConfig = { regra_padrao: string; splits_customizados: Array<{ contrato_id: string; percentuais: number[] }> };

type RegraAvancada = {
  id: string;
  loja_id: string;
  tipo: "escalonamento" | "bonus_meta" | "split";
  config: any;
  ativo: boolean;
};

interface Props {
  lojaId: string;
}

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function RegrasAvancadas({ lojaId }: Props) {
  const qc = useQueryClient();
  const [editEscalonamento, setEditEscalonamento] = useState(false);
  const [editBonus, setEditBonus] = useState(false);
  const [editSplit, setEditSplit] = useState(false);

  const { data: regras = [], isLoading } = useQuery<RegraAvancada[]>({
    queryKey: ["comissoes-regras-avancadas", lojaId],
    enabled: !!lojaId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("comissoes_regras_avancadas")
        .select("id, loja_id, tipo, config, ativo")
        .eq("loja_id", lojaId)
        .order("tipo");
      if (error) throw error;
      return (data ?? []) as RegraAvancada[];
    },
  });

  const { data: papeis = [] } = useQuery({
    queryKey: ["papeis-comissao-lista", lojaId],
    enabled: !!lojaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("papeis_comissao")
        .select("id, nome")
        .eq("loja_id", lojaId)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; nome: string }>;
    },
  });

  const escalonamento = regras.find((r) => r.tipo === "escalonamento");
  const bonusMeta = regras.find((r) => r.tipo === "bonus_meta");
  const split = regras.find((r) => r.tipo === "split");

  const faixas: FaixaEscalonamento[] = escalonamento?.config?.faixas ?? [];
  const bonuses: BonusMeta[] = bonusMeta?.config?.metas ?? [];
  const splitConfig: SplitConfig = split?.config ?? { regra_padrao: "50/50", splits_customizados: [] };

  if (isLoading) {
    return (
      <div className="rounded-md px-4 py-12 text-center text-sm text-[#6B7A90]" style={{ background: "#F5F7FA", border: "1px dashed #B0BAC9" }}>
        Carregando regras avançadas…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Escalonamento por faixa */}
      <div className="rounded-xl" style={{ border: "0.5px solid #E8ECF2", borderTop: "3px solid #8B5CF6" }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #E8ECF2" }}>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4" style={{ color: "#8B5CF6" }} />
            <div>
              <h3 className="text-sm font-medium text-[#0D1117]">Escalonamento por faixa</h3>
              <p className="text-xs text-[#6B7A90]">Percentuais progressivos por valor de venda</p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="h-8" onClick={() => setEditEscalonamento(true)}>
            Configurar
          </Button>
        </div>
        <div className="p-4">
          {faixas.length === 0 ? (
            <p className="text-xs text-[#6B7A90] text-center py-3">Nenhuma faixa configurada</p>
          ) : (
            <table className="w-full text-sm">
              <thead style={{ color: "#6B7A90" }}>
                <tr>
                  <th className="px-2 py-1 text-left text-xs font-medium">De</th>
                  <th className="px-2 py-1 text-left text-xs font-medium">Até</th>
                  <th className="px-2 py-1 text-right text-xs font-medium">Percentual</th>
                </tr>
              </thead>
              <tbody>
                {faixas.map((f, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: "#E8ECF2" }}>
                    <td className="px-2 py-1.5 tabular-nums">{fmtBRL(f.faixa_min)}</td>
                    <td className="px-2 py-1.5 tabular-nums">{f.faixa_max ? fmtBRL(f.faixa_max) : "Sem limite"}</td>
                    <td className="px-2 py-1.5 text-right font-medium tabular-nums">{f.percentual}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Bônus por meta */}
      <div className="rounded-xl" style={{ border: "0.5px solid #E8ECF2", borderTop: "3px solid #12B76A" }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #E8ECF2" }}>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4" style={{ color: "#12B76A" }} />
            <div>
              <h3 className="text-sm font-medium text-[#0D1117]">Bônus por meta</h3>
              <p className="text-xs text-[#6B7A90]">Bônus adicional ao atingir metas mensais</p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="h-8" onClick={() => setEditBonus(true)}>
            Configurar
          </Button>
        </div>
        <div className="p-4">
          {bonuses.length === 0 ? (
            <p className="text-xs text-[#6B7A90] text-center py-3">Nenhuma meta configurada</p>
          ) : (
            <table className="w-full text-sm">
              <thead style={{ color: "#6B7A90" }}>
                <tr>
                  <th className="px-2 py-1 text-left text-xs font-medium">Papel</th>
                  <th className="px-2 py-1 text-right text-xs font-medium">Meta contratos</th>
                  <th className="px-2 py-1 text-right text-xs font-medium">Meta valor</th>
                  <th className="px-2 py-1 text-right text-xs font-medium">Bônus %</th>
                </tr>
              </thead>
              <tbody>
                {bonuses.map((b, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: "#E8ECF2" }}>
                    <td className="px-2 py-1.5">{papeis.find((p) => p.id === b.papel_id)?.nome ?? "—"}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{b.meta_contratos}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmtBRL(b.meta_valor)}</td>
                    <td className="px-2 py-1.5 text-right font-medium tabular-nums">{b.bonus_percentual}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Split entre vendedores */}
      <div className="rounded-xl" style={{ border: "0.5px solid #E8ECF2", borderTop: "3px solid #E8A020" }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #E8ECF2" }}>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" style={{ color: "#E8A020" }} />
            <div>
              <h3 className="text-sm font-medium text-[#0D1117]">Split entre vendedores</h3>
              <p className="text-xs text-[#6B7A90]">Divisão de comissão quando há múltiplos vendedores</p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="h-8" onClick={() => setEditSplit(true)}>
            Configurar
          </Button>
        </div>
        <div className="p-4">
          <p className="text-sm text-[#0D1117]">
            Regra padrão: <span className="font-medium">{splitConfig.regra_padrao || "Não definida"}</span>
          </p>
          {splitConfig.splits_customizados?.length > 0 && (
            <p className="text-xs text-[#6B7A90] mt-1">
              {splitConfig.splits_customizados.length} split(s) customizado(s)
            </p>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <EscalonamentoDialog
        open={editEscalonamento}
        onOpenChange={setEditEscalonamento}
        lojaId={lojaId}
        faixasIniciais={faixas}
        regraId={escalonamento?.id}
        onSaved={() => qc.invalidateQueries({ queryKey: ["comissoes-regras-avancadas", lojaId] })}
      />
      <BonusMetaDialog
        open={editBonus}
        onOpenChange={setEditBonus}
        lojaId={lojaId}
        metasIniciais={bonuses}
        papeis={papeis}
        regraId={bonusMeta?.id}
        onSaved={() => qc.invalidateQueries({ queryKey: ["comissoes-regras-avancadas", lojaId] })}
      />
      <SplitDialog
        open={editSplit}
        onOpenChange={setEditSplit}
        lojaId={lojaId}
        configInicial={splitConfig}
        regraId={split?.id}
        onSaved={() => qc.invalidateQueries({ queryKey: ["comissoes-regras-avancadas", lojaId] })}
      />
    </div>
  );
}

// --- Helper to upsert a rule ---
async function upsertRegra(lojaId: string, tipo: string, config: any, regraId?: string) {
  if (regraId) {
    const { error } = await (supabase as any)
      .from("comissoes_regras_avancadas")
      .update({ config, updated_at: new Date().toISOString() })
      .eq("id", regraId);
    if (error) throw error;
  } else {
    const { error } = await (supabase as any)
      .from("comissoes_regras_avancadas")
      .insert({ loja_id: lojaId, tipo, config, ativo: true });
    if (error) throw error;
  }
}

// --- Escalonamento Dialog ---
function EscalonamentoDialog({
  open, onOpenChange, lojaId, faixasIniciais, regraId, onSaved,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; lojaId: string;
  faixasIniciais: FaixaEscalonamento[]; regraId?: string; onSaved: () => void;
}) {
  const [faixas, setFaixas] = useState<FaixaEscalonamento[]>([]);
  const [saving, setSaving] = useState(false);

  // Sync when dialog opens
  useState(() => { setFaixas(faixasIniciais.length ? [...faixasIniciais] : [{ faixa_min: 0, faixa_max: 50000, percentual: 3 }]); });

  function handleOpen(v: boolean) {
    if (v) setFaixas(faixasIniciais.length ? [...faixasIniciais] : [{ faixa_min: 0, faixa_max: 50000, percentual: 3 }]);
    onOpenChange(v);
  }

  function addFaixa() {
    const last = faixas[faixas.length - 1];
    const min = last ? (last.faixa_max ?? last.faixa_min + 50000) : 0;
    setFaixas([...faixas, { faixa_min: min, faixa_max: null, percentual: 5 }]);
  }

  function removeFaixa(i: number) {
    setFaixas(faixas.filter((_, idx) => idx !== i));
  }

  function updateFaixa(i: number, field: keyof FaixaEscalonamento, value: string) {
    const updated = [...faixas];
    if (field === "faixa_max" && value === "") {
      updated[i] = { ...updated[i], faixa_max: null };
    } else {
      (updated[i] as any)[field] = Number(value);
    }
    setFaixas(updated);
  }

  async function salvar() {
    if (faixas.length === 0) { toast.error("Adicione ao menos uma faixa"); return; }
    setSaving(true);
    try {
      await upsertRegra(lojaId, "escalonamento", { faixas }, regraId);
      toast.success("Escalonamento salvo");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader><DialogTitle>Escalonamento por faixa</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {faixas.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Mínimo (R$)</Label>
                <Input type="number" min={0} value={f.faixa_min} onChange={(e) => updateFaixa(i, "faixa_min", e.target.value)} className="h-8" />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Máximo (R$)</Label>
                <Input type="number" min={0} value={f.faixa_max ?? ""} placeholder="Sem limite" onChange={(e) => updateFaixa(i, "faixa_max", e.target.value)} className="h-8" />
              </div>
              <div className="w-20 space-y-1">
                <Label className="text-xs">%</Label>
                <Input type="number" step="0.1" min={0} max={100} value={f.percentual} onChange={(e) => updateFaixa(i, "percentual", e.target.value)} className="h-8" />
              </div>
              <Button size="sm" variant="ghost" className="h-8 w-8 mt-5 text-red-500" onClick={() => removeFaixa(i)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={addFaixa} className="h-8">
            <Plus className="mr-1 h-3 w-3" /> Adicionar faixa
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving} className="text-white" style={{ background: "#1E6FBF" }}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Bonus Meta Dialog ---
function BonusMetaDialog({
  open, onOpenChange, lojaId, metasIniciais, papeis, regraId, onSaved,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; lojaId: string;
  metasIniciais: BonusMeta[]; papeis: Array<{ id: string; nome: string }>; regraId?: string; onSaved: () => void;
}) {
  const [metas, setMetas] = useState<BonusMeta[]>([]);
  const [saving, setSaving] = useState(false);

  function handleOpen(v: boolean) {
    if (v) setMetas(metasIniciais.length ? [...metasIniciais] : []);
    onOpenChange(v);
  }

  function addMeta() {
    const papelId = papeis[0]?.id ?? "";
    setMetas([...metas, { papel_id: papelId, meta_contratos: 5, meta_valor: 100000, bonus_percentual: 1 }]);
  }

  function removeMeta(i: number) {
    setMetas(metas.filter((_, idx) => idx !== i));
  }

  function updateMeta(i: number, field: keyof BonusMeta, value: string) {
    const updated = [...metas];
    if (field === "papel_id") {
      updated[i] = { ...updated[i], papel_id: value };
    } else {
      (updated[i] as any)[field] = Number(value);
    }
    setMetas(updated);
  }

  async function salvar() {
    setSaving(true);
    try {
      await upsertRegra(lojaId, "bonus_meta", { metas }, regraId);
      toast.success("Bônus por meta salvo");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader><DialogTitle>Bônus por meta mensal</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {metas.map((m, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md p-2" style={{ background: "#F5F7FA" }}>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Papel</Label>
                <Select value={m.papel_id} onValueChange={(v) => updateMeta(i, "papel_id", v)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {papeis.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-24 space-y-1">
                <Label className="text-xs">Contratos</Label>
                <Input type="number" min={0} value={m.meta_contratos} onChange={(e) => updateMeta(i, "meta_contratos", e.target.value)} className="h-8" />
              </div>
              <div className="w-28 space-y-1">
                <Label className="text-xs">Valor (R$)</Label>
                <Input type="number" min={0} value={m.meta_valor} onChange={(e) => updateMeta(i, "meta_valor", e.target.value)} className="h-8" />
              </div>
              <div className="w-20 space-y-1">
                <Label className="text-xs">Bônus %</Label>
                <Input type="number" step="0.1" min={0} max={100} value={m.bonus_percentual} onChange={(e) => updateMeta(i, "bonus_percentual", e.target.value)} className="h-8" />
              </div>
              <Button size="sm" variant="ghost" className="h-8 w-8 mt-5 text-red-500" onClick={() => removeMeta(i)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={addMeta} className="h-8">
            <Plus className="mr-1 h-3 w-3" /> Adicionar meta
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving} className="text-white" style={{ background: "#1E6FBF" }}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Split Dialog ---
function SplitDialog({
  open, onOpenChange, lojaId, configInicial, regraId, onSaved,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; lojaId: string;
  configInicial: SplitConfig; regraId?: string; onSaved: () => void;
}) {
  const [regraPadrao, setRegraPadrao] = useState("50/50");
  const [saving, setSaving] = useState(false);

  const OPCOES_SPLIT = ["50/50", "60/40", "70/30", "80/20", "Customizado por contrato"];

  function handleOpen(v: boolean) {
    if (v) setRegraPadrao(configInicial.regra_padrao || "50/50");
    onOpenChange(v);
  }

  async function salvar() {
    setSaving(true);
    try {
      const config: SplitConfig = {
        regra_padrao: regraPadrao,
        splits_customizados: configInicial.splits_customizados ?? [],
      };
      await upsertRegra(lojaId, "split", config, regraId);
      toast.success("Regra de split salva");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader><DialogTitle>Split entre vendedores</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Regra padrão de divisão</Label>
            <Select value={regraPadrao} onValueChange={setRegraPadrao}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {OPCOES_SPLIT.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-[#6B7A90]">
              Quando um contrato tem múltiplos vendedores, a comissão será dividida conforme esta regra.
            </p>
          </div>
          <div className="rounded-md p-3" style={{ background: "#F5F7FA" }}>
            <p className="text-xs text-[#6B7A90]">
              Splits customizados por contrato podem ser definidos diretamente na tela de cada contrato.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving} className="text-white" style={{ background: "#1E6FBF" }}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
