import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contratoId: string;
  prefill?: {
    transportadora?: string | null;
    data_prevista?: string | null;
    pedido?: string | null;
  } | null;
}

export function EntregaCreateDialog({ open, onOpenChange, contratoId, prefill }: Props) {
  const qc = useQueryClient();
  const [transportadora, setTransportadora] = useState("");
  const [dataPrevista, setDataPrevista] = useState("");
  const [rota, setRota] = useState("");
  const [custoFrete, setCustoFrete] = useState("");

  useEffect(() => {
    if (open && prefill) {
      if (prefill.transportadora) setTransportadora(prefill.transportadora);
      if (prefill.data_prevista) setDataPrevista(prefill.data_prevista);
    }
  }, [open, prefill]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!transportadora.trim()) throw new Error("Transportadora obrigatória");
      if (!dataPrevista) throw new Error("Data prevista obrigatória");
      const custo = parseFloat(custoFrete.replace(",", ".")) || 0;
      const { error } = await supabase.from("entregas").insert({
        contrato_id: contratoId,
        transportadora,
        data_prevista: dataPrevista,
        rota: rota || null,
        custo_frete: custo,
      });
      if (error) throw error;
      await supabase.rpc("contrato_log_inserir", {
        _contrato_id: contratoId,
        _acao: "entrega_cadastrada",
        _titulo: "Entrega cadastrada",
        _descricao: transportadora,
      });
    },
    onSuccess: () => {
      toast.success("Entrega cadastrada");
      qc.invalidateQueries({ queryKey: ["entrega", contratoId] });
      qc.invalidateQueries({ queryKey: ["logistica-list"] });
      onOpenChange(false);
      setTransportadora(""); setDataPrevista(""); setRota(""); setCustoFrete("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Cadastrar entrega</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {prefill?.pedido && (
            <div
              style={{
                backgroundColor: "#E6F3FF",
                border: "1px solid #1E6FBF",
                borderRadius: 8,
                padding: 10,
                fontSize: 12,
                color: "#0D1117",
              }}
            >
              <div style={{ fontWeight: 600, color: "#1E6FBF", marginBottom: 2 }}>
                Pré-preenchido com dados do Promob
              </div>
              Pedido <strong>#{prefill.pedido}</strong> — você pode editar antes de salvar.
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Transportadora *</Label>
            <Input value={transportadora} onChange={(e) => setTransportadora(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Data prevista *</Label>
            <Input type="date" value={dataPrevista} onChange={(e) => setDataPrevista(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Rota / endereço</Label>
            <Textarea value={rota} onChange={(e) => setRota(e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Custo do frete (R$) *</Label>
            <Input type="number" step="0.01" value={custoFrete} onChange={(e) => setCustoFrete(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
