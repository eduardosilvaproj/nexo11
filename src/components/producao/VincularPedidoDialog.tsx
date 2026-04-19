import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  pedidoId: string | null;
  lojaId: string | null;
}

const NONE = "__none__";

export function VincularPedidoDialog({ open, onOpenChange, pedidoId, lojaId }: Props) {
  const qc = useQueryClient();
  const [clienteId, setClienteId] = useState<string>(NONE);
  const [contratoId, setContratoId] = useState<string>(NONE);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) { setClienteId(NONE); setContratoId(NONE); }
  }, [open]);

  const { data: clientes } = useQuery({
    queryKey: ["clientes-vincular", lojaId],
    enabled: open && !!lojaId,
    queryFn: async () => {
      const { data } = await supabase.from("clientes").select("id, nome").eq("loja_id", lojaId!).order("nome");
      return data ?? [];
    },
  });

  const { data: contratos } = useQuery({
    queryKey: ["contratos-vincular", lojaId, clienteId],
    enabled: open && !!lojaId,
    queryFn: async () => {
      let q = supabase.from("contratos").select("id, cliente_nome, cliente_id").eq("loja_id", lojaId!).neq("status", "finalizado");
      if (clienteId !== NONE) q = q.eq("cliente_id", clienteId);
      const { data } = await q.order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const salvar = async () => {
    if (!pedidoId) return;
    if (clienteId === NONE && contratoId === NONE) return toast.error("Selecione cliente e/ou contrato");
    setSalvando(true);
    const sb = supabase as unknown as {
      from: (t: string) => { update: (v: unknown) => { eq: (c: string, v: string) => Promise<{ error: Error | null }> } };
    };
    const { error } = await sb.from("producao_terceirizada").update({
      contrato_id: contratoId === NONE ? null : contratoId,
      vinculo_status: "vinculado",
    }).eq("id", pedidoId);
    setSalvando(false);
    if (error) return toast.error(error.message);
    toast.success("Pedido vinculado");
    qc.invalidateQueries({ queryKey: ["producao-terceirizada"] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Vincular pedido</DialogTitle>
          <DialogDescription>Associe este pedido importado a um cliente e contrato.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Cliente</Label>
            <Select value={clienteId} onValueChange={(v) => { setClienteId(v); setContratoId(NONE); }}>
              <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>—</SelectItem>
                {clientes?.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Contrato</Label>
            <Select value={contratoId} onValueChange={setContratoId}>
              <SelectTrigger><SelectValue placeholder="Selecione um contrato" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>—</SelectItem>
                {contratos?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>#{c.id.slice(0, 4)} — {c.cliente_nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando} style={{ backgroundColor: "#1E6FBF" }}>
            {salvando ? "Salvando..." : "Vincular"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
