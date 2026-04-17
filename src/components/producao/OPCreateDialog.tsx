import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ItemOP {
  nome: string;
  qtd: string;
  material: string;
  status: string;
}

interface OPCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contratoId: string;
}

export function OPCreateDialog({ open, onOpenChange, contratoId }: OPCreateDialogProps) {
  const qc = useQueryClient();
  const [fornecedorId, setFornecedorId] = useState<string>("");
  const [dataPedido, setDataPedido] = useState(new Date().toISOString().slice(0, 10));
  const [dataPrevista, setDataPrevista] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [itens, setItens] = useState<ItemOP[]>([{ nome: "", qtd: "", material: "", status: "aguardando" }]);

  const { data: fornecedores } = useQuery({
    queryKey: ["fornecedores-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fornecedores")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const addItem = () => setItens([...itens, { nome: "", qtd: "", material: "", status: "aguardando" }]);
  const removeItem = (i: number) => setItens(itens.filter((_, idx) => idx !== i));
  const updateItem = (i: number, key: keyof ItemOP, value: string) => {
    setItens(itens.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)));
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!dataPrevista) throw new Error("Data prevista obrigatória");
      const itensValidos = itens.filter((it) => it.nome.trim());
      const { error } = await supabase.from("ordens_producao").insert({
        contrato_id: contratoId,
        fornecedor_id: fornecedorId || null,
        data_inicio: dataPedido,
        data_previsao: dataPrevista,
        observacoes: observacoes || null,
        itens_json: itensValidos,
      });
      if (error) throw error;
      await supabase.rpc("contrato_log_inserir", {
        _contrato_id: contratoId,
        _acao: "op_criada",
        _titulo: "Ordem de produção criada",
        _descricao: `${itensValidos.length} item(ns)`,
      });
    },
    onSuccess: () => {
      toast.success("Ordem de produção criada");
      qc.invalidateQueries({ queryKey: ["op", contratoId] });
      qc.invalidateQueries({ queryKey: ["producao-list"] });
      onOpenChange(false);
      setFornecedorId("");
      setObservacoes("");
      setDataPrevista("");
      setItens([{ nome: "", qtd: "", material: "", status: "aguardando" }]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar ordem de produção</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Fornecedor</Label>
            <Select value={fornecedorId} onValueChange={setFornecedorId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {fornecedores?.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                ))}
                {(!fornecedores || fornecedores.length === 0) && (
                  <div className="px-2 py-3 text-sm text-muted-foreground">Nenhum fornecedor cadastrado</div>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Data do pedido *</Label>
            <Input type="date" value={dataPedido} onChange={(e) => setDataPedido(e.target.value)} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Data prevista *</Label>
            <Input type="date" value={dataPrevista} onChange={(e) => setDataPrevista(e.target.value)} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Itens da O.P.</Label>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="mr-1 h-3 w-3" /> Adicionar item
            </Button>
          </div>
          <div className="space-y-2">
            {itens.map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <Input className="col-span-5" placeholder="Nome" value={it.nome} onChange={(e) => updateItem(i, "nome", e.target.value)} />
                <Input className="col-span-2" placeholder="Qtd" value={it.qtd} onChange={(e) => updateItem(i, "qtd", e.target.value)} />
                <Input className="col-span-4" placeholder="Material" value={it.material} onChange={(e) => updateItem(i, "material", e.target.value)} />
                <Button type="button" variant="ghost" size="icon" className="col-span-1" onClick={() => removeItem(i)} disabled={itens.length === 1}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Criando..." : "Criar O.P."}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
