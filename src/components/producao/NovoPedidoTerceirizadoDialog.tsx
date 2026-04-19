import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lojaId: string | null;
}

const MANUAL = "__manual__";

export function NovoPedidoTerceirizadoDialog({ open, onOpenChange, lojaId }: Props) {
  const qc = useQueryClient();
  const [contratoId, setContratoId] = useState<string>(MANUAL);
  const [numeroPedido, setNumeroPedido] = useState("");
  const [oc, setOc] = useState("");
  const [cliente, setCliente] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataPrevista, setDataPrevista] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);

  const { data: contratos } = useQuery({
    queryKey: ["contratos-para-pedido", lojaId],
    enabled: open && !!lojaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("id, cliente_nome, status")
        .eq("loja_id", lojaId!)
        .neq("status", "finalizado")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!open) {
      setContratoId(MANUAL);
      setNumeroPedido("");
      setOc("");
      setCliente("");
      setDescricao("");
      setDataPrevista("");
      setObservacoes("");
    }
  }, [open]);

  useEffect(() => {
    if (contratoId !== MANUAL && contratos) {
      const c = contratos.find((c) => c.id === contratoId);
      if (c) setCliente(c.cliente_nome);
    }
  }, [contratoId, contratos]);

  const salvar = async () => {
    if (!lojaId) return toast.error("Loja não identificada");
    if (!numeroPedido.trim()) return toast.error("Informe o nº do pedido");
    if (!cliente.trim()) return toast.error("Informe o cliente");

    setSalvando(true);
    const obsFinal = [descricao, observacoes].filter(Boolean).join(" | ");
    const payload = {
      loja_id: lojaId,
      numero_pedido: numeroPedido.trim(),
      oc: oc.trim() || cliente.trim(),
      contrato_id: contratoId === MANUAL ? null : contratoId,
      data_prevista: dataPrevista || null,
      transportadora: obsFinal || null,
      status: "aguardando_fabricacao" as const,
    };

    const sb = supabase as unknown as {
      from: (t: string) => { insert: (v: unknown) => Promise<{ error: Error | null }> };
    };
    const { error } = await sb.from("producao_terceirizada").insert(payload);
    setSalvando(false);
    if (error) return toast.error(error.message);
    toast.success("Pedido criado");
    qc.invalidateQueries({ queryKey: ["producao-terceirizada"] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo pedido no fabricante</DialogTitle>
          <DialogDescription>Acompanhe um pedido vinculado a um contrato ou em entrada manual.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Vincular a contrato</Label>
            <Select value={contratoId} onValueChange={setContratoId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={MANUAL}>Entrada manual</SelectItem>
                {contratos?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    #{c.id.slice(0, 4)} — {c.cliente_nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nº pedido *</Label>
              <Input value={numeroPedido} onChange={(e) => setNumeroPedido(e.target.value)} placeholder="Ex: 12345" />
            </div>
            <div className="space-y-1.5">
              <Label>OC</Label>
              <Input value={oc} onChange={(e) => setOc(e.target.value)} placeholder="Opcional" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Cliente *</Label>
            <Input value={cliente} onChange={(e) => setCliente(e.target.value)} disabled={contratoId !== MANUAL} />
          </div>

          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Cozinha modulada" />
          </div>

          <div className="space-y-1.5">
            <Label>Data prevista</Label>
            <Input type="date" value={dataPrevista} onChange={(e) => setDataPrevista(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando} style={{ backgroundColor: "#1E6FBF" }}>
            {salvando ? "Salvando..." : "Criar pedido"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
