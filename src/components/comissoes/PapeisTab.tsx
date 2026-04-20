import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Tipo =
  | "vendedor" | "projetista" | "vendedor_projetista"
  | "gerente_comercial" | "gerente_operacional" | "gerente_montagem";
type Regra = "contrato_assinado" | "por_ambiente_tecnico" | "por_ambiente_montagem";

const TIPO_LABELS: Record<Tipo, string> = {
  vendedor: "Vendedor",
  projetista: "Projetista",
  vendedor_projetista: "Vendedor / Projetista",
  gerente_comercial: "Gerente Comercial",
  gerente_operacional: "Gerente Operacional",
  gerente_montagem: "Gerente de Montagem",
};
const REGRA_LABELS: Record<Regra, string> = {
  contrato_assinado: "Contrato assinado",
  por_ambiente_tecnico: "Por ambiente técnico concluído",
  por_ambiente_montagem: "Por ambiente montado",
};

type Papel = {
  id: string;
  loja_id: string;
  nome: string;
  tipo: Tipo;
  percentual_padrao: number;
  regra_pagamento: Regra;
  ativo: boolean;
};

interface Props {
  lojaId: string | null;
  podeEditar: boolean;
}

export function PapeisTab({ lojaId, podeEditar }: Props) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPct, setEditPct] = useState<string>("");
  const [novoOpen, setNovoOpen] = useState(false);

  const { data: papeis = [], isLoading } = useQuery({
    queryKey: ["papeis-comissao", lojaId],
    enabled: !!lojaId,
    queryFn: async (): Promise<Papel[]> => {
      const { data, error } = await supabase
        .from("papeis_comissao")
        .select("id, loja_id, nome, tipo, percentual_padrao, regra_pagamento, ativo")
        .eq("loja_id", lojaId!)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as Papel[];
    },
  });

  async function salvarPct(p: Papel) {
    const v = Number(editPct.replace(",", "."));
    if (!Number.isFinite(v) || v < 0 || v > 100) {
      toast.error("Percentual inválido");
      return;
    }
    const { error } = await supabase
      .from("papeis_comissao")
      .update({ percentual_padrao: v })
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Percentual atualizado");
    setEditingId(null);
    qc.invalidateQueries({ queryKey: ["papeis-comissao", lojaId] });
  }

  async function toggleAtivo(p: Papel, ativo: boolean) {
    const { error } = await supabase
      .from("papeis_comissao")
      .update({ ativo })
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["papeis-comissao", lojaId] });
  }

  return (
    <div className="rounded-md border bg-white" style={{ borderColor: "#E8ECF2" }}>
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid #E8ECF2" }}
      >
        <div>
          <h3 className="text-sm font-medium text-[#0D1117]">Papéis de comissão</h3>
          <p className="text-xs text-[#6B7A90]">
            Cada pessoa herda o % padrão do papel — o valor pode ser ajustado individualmente em /equipe.
          </p>
        </div>
        {podeEditar && (
          <Button
            size="sm"
            onClick={() => setNovoOpen(true)}
            className="h-8 text-white"
            style={{ background: "#1E6FBF" }}
          >
            <Plus className="mr-1 h-3 w-3" /> Novo papel
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="p-6 text-sm text-[#6B7A90]">Carregando…</p>
      ) : papeis.length === 0 ? (
        <p className="p-6 text-sm text-[#6B7A90]">Nenhum papel cadastrado.</p>
      ) : (
        <table className="w-full text-sm">
          <thead style={{ background: "#F5F7FA", color: "#6B7A90" }}>
            <tr>
              <th className="px-3 py-2 text-left font-medium">Papel</th>
              <th className="px-3 py-2 text-left font-medium">Tipo</th>
              <th className="px-3 py-2 text-right font-medium">% Padrão</th>
              <th className="px-3 py-2 text-left font-medium">Regra de pagamento</th>
              <th className="px-3 py-2 text-center font-medium">Ativo</th>
              <th className="px-3 py-2 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "#E8ECF2" }}>
            {papeis.map((p) => {
              const editing = editingId === p.id;
              return (
                <tr key={p.id}>
                  <td className="px-3 py-2 font-medium text-[#0D1117]">{p.nome}</td>
                  <td className="px-3 py-2 text-[#6B7A90]">{TIPO_LABELS[p.tipo] ?? p.tipo}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {editing ? (
                      <Input
                        autoFocus
                        type="number"
                        step="0.1"
                        min={0}
                        max={100}
                        value={editPct}
                        onChange={(e) => setEditPct(e.target.value)}
                        className="ml-auto h-7 w-20 text-right"
                      />
                    ) : (
                      <span>{Number(p.percentual_padrao).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[#6B7A90]">{REGRA_LABELS[p.regra_pagamento] ?? p.regra_pagamento}</td>
                  <td className="px-3 py-2 text-center">
                    <Switch
                      checked={p.ativo}
                      onCheckedChange={(v) => toggleAtivo(p, v)}
                      disabled={!podeEditar}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      {podeEditar && !editing && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7"
                          onClick={() => {
                            setEditingId(p.id);
                            setEditPct(String(p.percentual_padrao));
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                      {editing && (
                        <>
                          <Button
                            size="sm"
                            className="h-7 text-white"
                            style={{ background: "#05873C" }}
                            onClick={() => salvarPct(p)}
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <NovoPapelDialog
        open={novoOpen}
        onOpenChange={setNovoOpen}
        lojaId={lojaId}
        onCreated={() => qc.invalidateQueries({ queryKey: ["papeis-comissao", lojaId] })}
      />
    </div>
  );
}

function NovoPapelDialog({
  open, onOpenChange, lojaId, onCreated,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; lojaId: string | null; onCreated: () => void;
}) {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<Tipo>("vendedor");
  const [pct, setPct] = useState("0");
  const [regra, setRegra] = useState<Regra>("contrato_assinado");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) { setNome(""); setTipo("vendedor"); setPct("0"); setRegra("contrato_assinado"); }
  }, [open]);

  async function salvar() {
    if (!lojaId || !nome.trim()) { toast.error("Nome obrigatório"); return; }
    const v = Number(pct.replace(",", "."));
    if (!Number.isFinite(v) || v < 0 || v > 100) { toast.error("Percentual inválido"); return; }
    setSaving(true);
    const { error } = await supabase.from("papeis_comissao").insert({
      loja_id: lojaId,
      nome: nome.trim(),
      tipo,
      percentual_padrao: v,
      regra_pagamento: regra,
      ativo: true,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Papel criado");
    onCreated();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader><DialogTitle>Novo papel de comissão</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Consultor Sênior" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as Tipo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(TIPO_LABELS) as Tipo[]).map((t) => (
                  <SelectItem key={t} value={t}>{TIPO_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>% Padrão</Label>
            <Input type="number" step="0.1" min={0} max={100} value={pct} onChange={(e) => setPct(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Regra de pagamento</Label>
            <Select value={regra} onValueChange={(v) => setRegra(v as Regra)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(REGRA_LABELS) as Regra[]).map((r) => (
                  <SelectItem key={r} value={r}>{REGRA_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving} className="text-white" style={{ background: "#1E6FBF" }}>
            {saving ? "Salvando…" : "Criar papel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
