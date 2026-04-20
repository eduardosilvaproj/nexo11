import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NONE = "__none__";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string | null;
  nome: string;
};

export function EditarComissaoDialog({ open, onOpenChange, userId, nome }: Props) {
  const qc = useQueryClient();
  const [papelId, setPapelId] = useState<string>(NONE);
  const [pct, setPct] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const { data: papeis } = useQuery({
    queryKey: ["papeis-ativos"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("papeis_comissao")
        .select("id, nome, percentual_padrao")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!open || !userId) return;
    (async () => {
      const { data } = await supabase
        .from("usuarios")
        .select("papel_comissao_id, comissao_percentual")
        .eq("id", userId)
        .maybeSingle();
      setPapelId(data?.papel_comissao_id ?? NONE);
      setPct(data?.comissao_percentual != null ? String(data.comissao_percentual) : "");
    })();
  }, [open, userId]);

  function aoTrocarPapel(v: string) {
    setPapelId(v);
    if (v === NONE) return;
    if (pct.trim() === "") {
      const p = papeis?.find((x) => x.id === v);
      if (p) setPct(String(Number(p.percentual_padrao ?? 0)));
    }
  }

  async function salvar() {
    if (!userId) return;
    const pctNum = pct.trim() === "" ? null : Number(pct.replace(",", "."));
    if (pctNum != null && (!Number.isFinite(pctNum) || pctNum < 0 || pctNum > 100)) {
      toast.error("Percentual inválido");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("usuarios")
      .update({
        papel_comissao_id: papelId === NONE ? null : papelId,
        comissao_percentual: pctNum,
      })
      .eq("id", userId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Comissão atualizada");
    qc.invalidateQueries({ queryKey: ["equipe-membros"] });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!saving) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Comissão de {nome}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Papel de comissão</Label>
            <Select value={papelId} onValueChange={aoTrocarPapel}>
              <SelectTrigger><SelectValue placeholder="Sem comissão" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sem comissão</SelectItem>
                {papeis?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>% Comissão</Label>
            <Input
              type="number" step="0.1" min={0} max={100}
              value={pct}
              onChange={(e) => setPct(e.target.value)}
              disabled={papelId === NONE}
              placeholder="0,0"
            />
            <p className="text-xs text-[#6B7A90]">
              Ao escolher um papel, sugerimos seu % padrão — você pode ajustar individualmente.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving} className="text-white" style={{ background: "#1E6FBF" }}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
