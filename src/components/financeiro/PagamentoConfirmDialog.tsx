import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  transacao: { id: string; descricao: string; valor: number } | null;
  onConfirmed?: () => void;
}

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PagamentoConfirmDialog({ open, onOpenChange, transacao, onConfirmed }: Props) {
  const hoje = new Date().toISOString().slice(0, 10);
  const [data, setData] = useState(hoje);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setData(hoje); }, [open]);

  async function handleConfirm() {
    if (!transacao) return;
    if (!data) { toast.error("Informe a data de pagamento"); return; }
    setSaving(true);
    const { error } = await supabase
      .from("transacoes")
      .update({ status: "pago", data_pagamento: data })
      .eq("id", transacao.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Pagamento registrado");
    onConfirmed?.();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Confirmar pagamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input value={transacao?.descricao ?? ""} readOnly className="bg-muted" />
          </div>
          <div className="space-y-1.5">
            <Label>Valor</Label>
            <Input value={transacao ? fmtBRL(transacao.valor) : ""} readOnly className="bg-muted" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="data-pgto">Data de pagamento *</Label>
            <Input id="data-pgto" type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleConfirm}
            disabled={saving}
            className="text-white hover:opacity-90"
            style={{ background: "#12B76A" }}
          >
            <Check className="mr-1 h-4 w-4" />
            {saving ? "Salvando..." : "Confirmar pagamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
