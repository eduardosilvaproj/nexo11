
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MovimentacaoDialogProps {
  item: any;
  type: 'entrada' | 'saida';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function MovimentacaoDialog({ item, type, open, onOpenChange, onSuccess }: MovimentacaoDialogProps) {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  useEffect(() => {
    if (open) {
      reset({
        quantidade: "",
        valor_unitario: type === 'entrada' ? "" : item?.custo_medio_unitario,
        observacoes: "",
      });
    }
  }, [open, type, item, reset]);

  const onSubmit = async (data: any) => {
    if (!item) return;
    const qtd = Number(data.quantidade);
    
    if (isNaN(qtd) || qtd <= 0) {
      return toast.error("Quantidade deve ser maior que zero");
    }

    const disponivel = (item.quantidade_total || 0) - (item.quantidade_reservada || 0);
    if (type === 'saida' && qtd > disponivel) {
      return toast.error(`Saldo insuficiente. Disponível: ${disponivel}`);
    }

    try {
      const valorUnit = Number(data.valor_unitario || 0);
      const valorTotal = qtd * valorUnit;

      // 1. Inserir movimentação
      const { error: movError } = await supabase
        .from("estoque_movimentacoes")
        .insert({
          item_id: item.id,
          tipo: type,
          subtipo: "manual",
          quantidade: qtd,
          valor_unitario: valorUnit,
          valor_total: valorTotal,
          loja_id: item.loja_id,
          observacoes: data.observacoes,
          data: new Date().toISOString(),
        });

      if (movError) throw movError;

      // 2. Atualizar item
      const novaQtdTotal = type === 'entrada' 
        ? Number(item.quantidade_total || 0) + qtd 
        : Number(item.quantidade_total || 0) - qtd;

      const updateData: any = {
        quantidade_total: novaQtdTotal,
        updated_at: new Date().toISOString(),
      };

      // Se for entrada e tiver valor unitário, atualizar custo médio simples
      if (type === 'entrada' && valorUnit > 0) {
        const oldTotal = Number(item.quantidade_total || 0);
        const oldCusto = Number(item.custo_medio_unitario || 0);
        const novoCusto = ((oldTotal * oldCusto) + (qtd * valorUnit)) / novaQtdTotal;
        updateData.custo_medio_unitario = novoCusto;
      }

      const { error: itemError } = await supabase
        .from("estoque_itens")
        .update(updateData)
        .eq("id", item.id);

      if (itemError) throw itemError;

      toast.success(`${type === 'entrada' ? 'Entrada' : 'Saída'} registrada com sucesso`);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao processar movimentação");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {type === 'entrada' ? 'Entrada de Estoque' : 'Saída de Estoque'}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <p className="text-sm font-medium text-slate-700">{item?.descricao}</p>
          <p className="text-xs text-slate-500">Saldo atual: {item?.quantidade_total} {item?.unidade}</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quantidade">Quantidade *</Label>
            <Input 
              id="quantidade" 
              type="number" 
              step="any" 
              {...register("quantidade", { required: true })} 
              placeholder="0.00"
              autoFocus
            />
          </div>
          {type === 'entrada' && (
            <div className="space-y-2">
              <Label htmlFor="valor_unitario">Valor Unitário (R$)</Label>
              <Input 
                id="valor_unitario" 
                type="number" 
                step="0.01" 
                {...register("valor_unitario")} 
                placeholder="0.00"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="observacoes">{type === 'saida' ? 'Motivo / Observações' : 'Observações'}</Label>
            <Textarea 
              id="observacoes" 
              {...register("observacoes")} 
              placeholder="Opcional"
              className="resize-none"
            />
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className={type === 'entrada' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}
            >
              Confirmar {type === 'entrada' ? 'Entrada' : 'Saída'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
