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
  transacao: { id: string; descricao: string; valor: number; tipo: 'receita' | 'despesa'; status?: string } | null;
  onConfirmed: () => void;
}

export function PagamentoConfirmDialog({ open, onOpenChange, transacao, onConfirmed }: Props) {
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [forma, setForma] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleConfirmar() {
    if (!transacao) return;
    setLoading(true);
    
    try {
      const table = transacao.tipo === 'receita' ? 'financeiro_contas_receber' : 'financeiro_contas_pagar';
      
      const { error } = await supabase
        .from(table)
        .update({
          status: "pago",
          data_pagamento: data,
          forma_pagamento: forma || null,
        })
        .eq("id", transacao.id);

      if (error) throw error;
      
      // Registrar evento no contrato se houver contrato_id
      const { data: lancamento } = await supabase.from(table).select("contrato_id, descricao").eq("id", transacao.id).single();
      if (lancamento?.contrato_id) {
        const { registrarEventoContrato } = await import("@/services/contratoEventos");
        await registrarEventoContrato({
          contratoId: lancamento.contrato_id,
          tipo: transacao.tipo === 'receita' ? "pagamento_recebido" : "pagamento_efetuado",
          modulo: "financeiro",
          titulo: transacao.tipo === 'receita' ? "Pagamento Recebido" : "Pagamento Efetuado",
          descricao: `Lançamento: ${transacao.descricao}. Valor: ${transacao.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
          entidadeTipo: table,
          entidadeId: transacao.id
        });
      }
      
      toast.success("Pagamento registrado com sucesso");
      onConfirmed();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleEstornar() {
    if (!transacao || !window.confirm("Deseja realmente estornar este pagamento? O status voltará para pendente.")) return;
    setLoading(true);
    try {
      const { error } = await supabase.rpc('estornar_lancamento', {
        p_id: transacao.id,
        p_tipo: transacao.tipo === 'receita' ? 'receita' : 'despesa'
      });
      if (error) throw error;

      // Registrar evento no contrato se houver contrato_id
      const table = transacao.tipo === 'receita' ? 'financeiro_contas_receber' : 'financeiro_contas_pagar';
      const { data: lancamento } = await supabase.from(table).select("contrato_id").eq("id", transacao.id).single();
      if (lancamento?.contrato_id) {
        const { registrarEventoContrato } = await import("@/services/contratoEventos");
        await registrarEventoContrato({
          contratoId: lancamento.contrato_id,
          tipo: "pagamento_estornado",
          modulo: "financeiro",
          titulo: "Pagamento Estornado",
          descricao: `Estorno do lançamento: ${transacao.descricao}`,
          entidadeTipo: table,
          entidadeId: transacao.id
        });
      }

      toast.success("Pagamento estornado com sucesso");
      onConfirmed();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  const isPago = transacao?.status === 'pago';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{isPago ? 'Detalhes do Pagamento' : 'Confirmar Pagamento'}</DialogTitle>
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
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} disabled={isPago} />
          </div>

          <div className="space-y-1.5">
            <Label>Forma de Pagamento</Label>
            <Input placeholder="Ex: Pix, Cartão, Dinheiro..." value={forma} onChange={(e) => setForma(e.target.value)} disabled={isPago} />
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="sm:flex-1" onClick={() => onOpenChange(false)}>
            {isPago ? 'Fechar' : 'Cancelar'}
          </Button>
          {isPago ? (
            <Button 
              variant="destructive"
              className="sm:flex-1" 
              onClick={handleEstornar}
              disabled={loading}
            >
              {loading ? "Estornando..." : "Estornar Pagamento"}
            </Button>
          ) : (
            <Button 
              className="bg-[#1E6FBF] hover:bg-[#1E6FBF]/90 text-white sm:flex-1" 
              onClick={handleConfirmar}
              disabled={loading}
            >
              {loading ? "Confirmando..." : "Confirmar Pagamento"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}