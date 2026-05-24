
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
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any;
  onSuccess: () => void;
  lojaId: string;
}

export function ItemFormDialog({ open, onOpenChange, item, onSuccess, lojaId }: ItemFormDialogProps) {
  const { register, handleSubmit, reset, setValue, watch } = useForm();
  const isActive = watch("ativo", true);

  useEffect(() => {
    if (item) {
      reset({
        descricao: item.descricao,
        codigo: item.codigo,
        categoria: item.categoria,
        unidade: item.unidade,
        estoque_minimo: item.estoque_minimo,
        custo_medio_unitario: item.custo_medio_unitario,
        ativo: item.ativo,
      });
    } else {
      reset({
        descricao: "",
        codigo: "",
        categoria: "",
        unidade: "un",
        estoque_minimo: 0,
        custo_medio_unitario: 0,
        quantidade_inicial: 0,
        ativo: true,
      });
    }
  }, [item, reset, open]);

  const onSubmit = async (data: any) => {
    try {
      if (item) {
        const { error } = await supabase
          .from("estoque_itens")
          .update({
            descricao: data.descricao,
            codigo: data.codigo,
            categoria: data.categoria,
            unidade: data.unidade,
            estoque_minimo: Number(data.estoque_minimo),
            custo_medio_unitario: Number(data.custo_medio_unitario),
            ativo: data.ativo,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        if (error) throw error;
        toast.success("Item atualizado com sucesso");
      } else {
        const { error } = await supabase
          .from("estoque_itens")
          .insert({
            descricao: data.descricao,
            codigo: data.codigo,
            categoria: data.categoria,
            unidade: data.unidade,
            quantidade_total: Number(data.quantidade_inicial || 0),
            estoque_minimo: Number(data.estoque_minimo),
            custo_medio_unitario: Number(data.custo_medio_unitario),
            ativo: data.ativo,
            loja_id: lojaId,
          });

        if (error) throw error;
        toast.success("Item criado com sucesso");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar item");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{item ? "Editar Item" : "Novo Item"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="descricao">Descrição *</Label>
              <Input id="descricao" {...register("descricao", { required: true })} placeholder="Ex: Parafuso 4x40mm" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="codigo">Código</Label>
              <Input id="codigo" {...register("codigo")} placeholder="Opcional" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Input id="categoria" {...register("categoria")} placeholder="Ex: Ferragens" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unidade">Unidade *</Label>
              <Input id="unidade" {...register("unidade", { required: true })} placeholder="un, kg, m, etc" />
            </div>
            {!item && (
              <div className="space-y-2">
                <Label htmlFor="quantidade_inicial">Qtd Inicial</Label>
                <Input id="quantidade_inicial" type="number" step="any" {...register("quantidade_inicial")} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="estoque_minimo">Estoque Mínimo</Label>
              <Input id="estoque_minimo" type="number" step="any" {...register("estoque_minimo")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custo_medio_unitario">Custo Médio (R$)</Label>
              <Input id="custo_medio_unitario" type="number" step="0.01" {...register("custo_medio_unitario")} />
            </div>
            <div className="flex items-center space-x-2 pt-8">
              <Switch 
                id="ativo" 
                checked={isActive} 
                onCheckedChange={(checked) => setValue("ativo", checked)} 
              />
              <Label htmlFor="ativo">Ativo</Label>
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
