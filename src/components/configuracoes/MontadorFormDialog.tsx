import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

export type Montador = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  percentual_padrao: number;
  ativo: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lojaId: string | null;
  montador: Montador | null;
};

export function MontadorFormDialog({ open, onOpenChange, lojaId, montador }: Props) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [percentual, setPercentual] = useState<string>("0");
  const [ativo, setAtivo] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNome(montador?.nome ?? "");
      setTelefone(montador?.telefone ?? "");
      setEmail(montador?.email ?? "");
      setPercentual(String(montador?.percentual_padrao ?? 0));
      setAtivo(montador?.ativo ?? true);
    }
  }, [open, montador]);

  const handleSave = async () => {
    if (!lojaId) return toast.error("Loja não identificada");
    if (!nome.trim()) return toast.error("Informe o nome");
    const pct = Number(String(percentual).replace(",", "."));
    if (Number.isNaN(pct) || pct < 0 || pct > 100) return toast.error("Percentual inválido");

    setSaving(true);
    const payload = {
      loja_id: lojaId,
      nome: nome.trim(),
      telefone: telefone.trim() || null,
      email: email.trim() || null,
      percentual_padrao: pct,
      ativo,
    };

    const client = supabase as unknown as {
      from: (t: string) => {
        insert: (v: unknown) => Promise<{ error: Error | null }>;
        update: (v: unknown) => { eq: (c: string, v: string) => Promise<{ error: Error | null }> };
      };
    };

    const { error } = montador
      ? await client.from("montadores").update(payload).eq("id", montador.id)
      : await client.from("montadores").insert(payload);

    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(montador ? "Montador atualizado" : "Montador cadastrado");
    qc.invalidateQueries({ queryKey: ["montadores-config"] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{montador ? "Editar montador" : "Novo montador"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Nome *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do montador" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Telefone</Label>
              <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Percentual padrão (%)</Label>
              <Input
                type="number" step="0.1" min="0" max="100"
                value={percentual}
                onChange={(e) => setPercentual(e.target.value)}
                placeholder="Ex: 8.5"
              />
            </div>
            <div className="flex items-end gap-2">
              <Switch checked={ativo} onCheckedChange={setAtivo} />
              <span className="text-sm text-muted-foreground">{ativo ? "Ativo" : "Inativo"}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} style={{ backgroundColor: "#1E6FBF", color: "#fff" }}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
