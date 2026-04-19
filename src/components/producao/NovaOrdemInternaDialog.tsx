import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lojaId: string | null;
  onCreated?: () => void;
}

export function NovaOrdemInternaDialog({ open, onOpenChange, lojaId, onCreated }: Props) {
  const [clienteNome, setClienteNome] = useState("");
  const [contratoId, setContratoId] = useState<string>("none");
  const [fornecedorId, setFornecedorId] = useState<string>("none");
  const [descricao, setDescricao] = useState("");
  const [dataPrevista, setDataPrevista] = useState("");
  const [prioridade, setPrioridade] = useState<"normal" | "urgente">("normal");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setClienteNome(""); setContratoId("none"); setFornecedorId("none");
      setDescricao(""); setDataPrevista(""); setPrioridade("normal"); setObservacoes("");
    }
  }, [open]);

  const { data: contratos } = useQuery({
    queryKey: ["contratos-list-interna"],
    queryFn: async () => {
      const { data } = await supabase.from("contratos").select("id, cliente_nome").order("created_at", { ascending: false }).limit(200);
      return (data ?? []) as Array<{ id: string; cliente_nome: string }>;
    },
    enabled: open,
  });

  const { data: fornecedores } = useQuery({
    queryKey: ["fornecedores-ativos-novainterna"],
    queryFn: async () => {
      const { data } = await supabase.from("fornecedores").select("id, nome").eq("ativo", true).order("nome");
      return (data ?? []) as Array<{ id: string; nome: string }>;
    },
    enabled: open,
  });

  // Pré-preenche cliente quando contrato selecionado
  useEffect(() => {
    if (contratoId !== "none") {
      const c = contratos?.find((x) => x.id === contratoId);
      if (c && !clienteNome) setClienteNome(c.cliente_nome);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contratoId, contratos]);

  const handleSubmit = async () => {
    if (!lojaId) { toast.error("Loja não identificada"); return; }
    if (!clienteNome.trim()) { toast.error("Nome do cliente é obrigatório"); return; }
    setSaving(true);
    const { error } = await supabase.from("producao_interna").insert({
      loja_id: lojaId,
      cliente_nome: clienteNome.trim(),
      contrato_id: contratoId === "none" ? null : contratoId,
      fornecedor_id: fornecedorId === "none" ? null : fornecedorId,
      descricao: descricao.trim() || null,
      data_prevista: dataPrevista || null,
      prioridade,
      observacoes: observacoes.trim() || null,
      status: "a_fazer",
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Ordem criada");
    onCreated?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nova Ordem Interna</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Contrato (opcional)</Label>
            <Select value={contratoId} onValueChange={setContratoId}>
              <SelectTrigger><SelectValue placeholder="Sem contrato" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem contrato</SelectItem>
                {contratos?.map((c) => (<SelectItem key={c.id} value={c.id}>{c.cliente_nome} (#{c.id.slice(0, 4)})</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cliente *</Label>
            <Input value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} placeholder="Nome do cliente" />
          </div>
          <div>
            <Label>Fornecedor</Label>
            <Select value={fornecedorId} onValueChange={setFornecedorId}>
              <SelectTrigger><SelectValue placeholder="Sem fornecedor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem fornecedor</SelectItem>
                {fornecedores?.map((f) => (<SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrição</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Cozinha completa" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data prevista</Label>
              <Input type="date" value={dataPrevista} onChange={(e) => setDataPrevista(e.target.value)} />
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={prioridade} onValueChange={(v) => setPrioridade(v as "normal" | "urgente")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? "Criando..." : "Criar Ordem"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
