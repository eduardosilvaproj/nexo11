import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  transacao: { id: string; descricao: string; valor: number; tipo: 'receita' | 'despesa' } | null;
  onConfirmed: () => void;
}

export function PagamentoConfirmDialog({ open, onOpenChange, transacao, onConfirmed }: Props) {
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [forma, setForma] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleConfirmar() {
    if (!transacao) return;
    setLoading(true);
    
    const table = transacao.tipo === 'receita' ? 'financeiro_contas_receber' : 'financeiro_contas_pagar';
    
    const { error } = await supabase
      .from(table)
      .update({
        status: "pago",
        data_pagamento: data,
        forma_pagamento: forma || null,
      })
      .eq("id", transacao.id);

    setLoading(false);
    if (error) { toast.error(error.message); return; }
    
    toast.success("Pagamento registrado com sucesso");
    onConfirmed();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Confirmar Pagamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-slate-50 p-4 border border-slate-100">
            <p className="text-sm text-slate-500">Lançamento</p>
            <p className="font-semibold text-slate-900">{transacao?.descricao}</p>
            <p className="mt-1 text-xl font-bold text-[#1E6FBF]">
              {transacao?.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Data do Pagamento</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Forma de Pagamento</Label>
            <Input placeholder="Ex: Pix, Cartão, Dinheiro..." value={forma} onChange={(e) => setForma(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button 
            className="bg-[#1E6FBF] hover:bg-[#1E6FBF]/90 text-white" 
            onClick={handleConfirmar}
            disabled={loading}
          >
            {loading ? "Confirmando..." : "Confirmar Pagamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
