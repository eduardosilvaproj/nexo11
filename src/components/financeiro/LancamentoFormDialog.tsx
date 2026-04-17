import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Tipo = "receita" | "despesa";

const CATEGORIAS: Record<Tipo, string[]> = {
  receita: ["Venda de contrato", "Outro"],
  despesa: ["Fornecedor", "Folha", "Aluguel", "Marketing", "Comissão", "Impostos", "Outro"],
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lojaId: string | null;
  onSaved?: () => void;
}

export function LancamentoFormDialog({ open, onOpenChange, lojaId, onSaved }: Props) {
  const hoje = new Date().toISOString().slice(0, 10);
  const [tipo, setTipo] = useState<Tipo>("despesa");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState<string>("");
  const [vencimento, setVencimento] = useState<string>(hoje);
  const [categoria, setCategoria] = useState<string>("");
  const [contratoId, setContratoId] = useState<string>("");
  const [observacoes, setObservacoes] = useState("");
  const [contratos, setContratos] = useState<{ id: string; cliente_nome: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTipo("despesa");
    setDescricao("");
    setValor("");
    setVencimento(hoje);
    setCategoria("");
    setContratoId("");
    setObservacoes("");
    supabase
      .from("contratos")
      .select("id, cliente_nome")
      .order("data_criacao", { ascending: false })
      .limit(50)
      .then(({ data }) => setContratos(data ?? []));
  }, [open]);

  // reset categoria ao trocar tipo
  useEffect(() => { setCategoria(""); }, [tipo]);

  async function handleSalvar() {
    if (!lojaId) { toast.error("Loja não identificada"); return; }
    const v = Number(valor.replace(",", "."));
    if (!descricao.trim() || !categoria || !vencimento || !v || v <= 0) {
      toast.error("Preencha descrição, valor, vencimento e categoria");
      return;
    }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("transacoes").insert({
      loja_id: lojaId,
      tipo,
      descricao: descricao.trim().slice(0, 200),
      categoria,
      valor: v,
      data_vencimento: vencimento,
      status: "pendente",
      contrato_id: contratoId || null,
      observacoes: observacoes.trim().slice(0, 500) || null,
      criado_por: u.user?.id ?? null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Lançamento criado");
    onSaved?.();
    onOpenChange(false);
  }

  const tipoBtn = (t: Tipo, bg: string, fg: string, label: string) => (
    <button
      type="button"
      onClick={() => setTipo(t)}
      className="flex-1 rounded-md py-2 text-sm font-medium transition-colors"
      style={
        tipo === t
          ? { background: bg, color: fg, boxShadow: `inset 0 0 0 1px ${fg}33` }
          : { background: "#F5F7FA", color: "#6B7A90" }
      }
    >
      {label}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Novo lançamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2 rounded-md p-1" style={{ background: "#F5F7FA" }}>
            {tipoBtn("receita", "#D1FAE5", "#05873C", "Receita")}
            {tipoBtn("despesa", "#FDECEA", "#E53935", "Despesa")}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">Descrição *</Label>
            <Input id="desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={200} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="valor">Valor *</Label>
              <Input
                id="valor"
                inputMode="decimal"
                placeholder="R$ 0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value.replace(/[^\d.,]/g, ""))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="venc">Data vencimento *</Label>
              <Input id="venc" type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Categoria *</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {CATEGORIAS[tipo].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Contrato</Label>
            <Select value={contratoId || "none"} onValueChange={(v) => setContratoId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {contratos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.cliente_nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="obs">Observações</Label>
            <Textarea id="obs" rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} maxLength={500} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSalvar}
            disabled={saving}
            className="text-white hover:opacity-90"
            style={{ background: "#1E6FBF" }}
          >
            {saving ? "Salvando..." : "Salvar lançamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
