import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { z } from "zod";

export interface Condicao {
  id: string;
  loja_id: string;
  nome: string;
  parcelas: number;
  taxa: number;
  ordem: number | null;
  ativo: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  condicao: Condicao | null;
  lojaId: string | null;
  onSaved: () => void;
}

const schema = z.object({
  nome: z.string().trim().min(1, "Nome obrigatório").max(80, "Máximo 80 caracteres"),
  parcelas: z.number().int().min(1, "Mínimo 1 parcela").max(60, "Máximo 60"),
  taxa: z.number().min(0, "Taxa inválida").max(100, "Máximo 100%"),
  ordem: z.number().int().min(0).max(999),
  ativo: z.boolean(),
});

export default function CondicaoPagamentoDialog({
  open,
  onOpenChange,
  condicao,
  lojaId,
  onSaved,
}: Props) {
  const [nome, setNome] = useState("");
  const [parcelas, setParcelas] = useState<string>("1");
  const [taxa, setTaxa] = useState<string>("0");
  const [ordem, setOrdem] = useState<string>("0");
  const [ativo, setAtivo] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNome(condicao?.nome ?? "");
      setParcelas(String(condicao?.parcelas ?? 1));
      setTaxa(String(condicao?.taxa ?? 0));
      setOrdem(String(condicao?.ordem ?? 0));
      setAtivo(condicao?.ativo ?? true);
    }
  }, [open, condicao]);

  const salvar = async () => {
    if (!lojaId) {
      toast.error("Loja não identificada");
      return;
    }
    const parsed = schema.safeParse({
      nome,
      parcelas: Number(parcelas),
      taxa: Number(taxa),
      ordem: Number(ordem),
      ativo,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Dados inválidos");
      return;
    }
    setSaving(true);
    const payload = { ...parsed.data, loja_id: lojaId };
    const { error } = condicao
      ? await supabase.from("condicoes_pagamento").update(payload).eq("id", condicao.id)
      : await supabase.from("condicoes_pagamento").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success(condicao ? "Condição atualizada" : "Condição criada");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{condicao ? "Editar condição" : "Nova condição"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: 6x no cartão"
              maxLength={80}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="parcelas">Parcelas *</Label>
              <Input
                id="parcelas"
                type="number"
                min={1}
                max={60}
                value={parcelas}
                onChange={(e) => setParcelas(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxa">Taxa %</Label>
              <Input
                id="taxa"
                type="number"
                step="0.1"
                min={0}
                max={100}
                value={taxa}
                onChange={(e) => setTaxa(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Taxa embutida no valor de venda
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ordem">Ordem de exibição</Label>
            <Input
              id="ordem"
              type="number"
              min={0}
              value={ordem}
              onChange={(e) => setOrdem(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="ativo" className="cursor-pointer">
              Ativo
            </Label>
            <Switch id="ativo" checked={ativo} onCheckedChange={setAtivo} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={salvar}
            disabled={saving}
            className="bg-[#1E6FBF] hover:bg-[#1A5FA8] text-white"
          >
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
