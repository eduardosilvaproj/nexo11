import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Cliente = {
  id?: string;
  nome: string;
  cpf_cnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
  celular?: string | null;
  cep?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  observacoes?: string | null;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente?: Cliente | null;
  onSaved?: () => void;
}

const empty: Cliente = {
  nome: "",
  cpf_cnpj: "",
  email: "",
  telefone: "",
  celular: "",
  cep: "",
  endereco: "",
  cidade: "",
  estado: "",
  observacoes: "",
};

export function ClienteFormDialog({ open, onOpenChange, cliente, onSaved }: Props) {
  const { perfil } = useAuth();
  const [form, setForm] = useState<Cliente>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(cliente ? { ...empty, ...cliente } : empty);
  }, [cliente, open]);

  const set = (k: keyof Cliente, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (!perfil?.loja_id) {
      toast.error("Loja não definida no perfil");
      return;
    }
    setSaving(true);
    const payload = {
      nome: form.nome.trim(),
      cpf_cnpj: form.cpf_cnpj || null,
      email: form.email || null,
      telefone: form.telefone || null,
      celular: form.celular || null,
      cep: form.cep || null,
      endereco: form.endereco || null,
      cidade: form.cidade || null,
      estado: form.estado || null,
      observacoes: form.observacoes || null,
      loja_id: perfil.loja_id,
    };

    const { error } = cliente?.id
      ? await supabase.from("clientes").update(payload).eq("id", cliente.id)
      : await supabase.from("clientes").insert(payload);

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(cliente?.id ? "Cliente atualizado" : "Cliente cadastrado");
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{cliente?.id ? "Editar cliente" : "Novo cliente"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <Label>Nome *</Label>
            <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} />
          </div>
          <div>
            <Label>CPF / CNPJ</Label>
            <Input value={form.cpf_cnpj ?? ""} onChange={(e) => set("cpf_cnpj", e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input value={form.telefone ?? ""} onChange={(e) => set("telefone", e.target.value)} />
          </div>
          <div>
            <Label>Celular</Label>
            <Input value={form.celular ?? ""} onChange={(e) => set("celular", e.target.value)} />
          </div>
          <div>
            <Label>CEP</Label>
            <Input value={form.cep ?? ""} onChange={(e) => set("cep", e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Endereço</Label>
            <Input value={form.endereco ?? ""} onChange={(e) => set("endereco", e.target.value)} />
          </div>
          <div>
            <Label>Cidade</Label>
            <Input value={form.cidade ?? ""} onChange={(e) => set("cidade", e.target.value)} />
          </div>
          <div>
            <Label>Estado</Label>
            <Input value={form.estado ?? ""} maxLength={2} onChange={(e) => set("estado", e.target.value.toUpperCase())} />
          </div>
          <div className="md:col-span-2">
            <Label>Observações</Label>
            <Textarea value={form.observacoes ?? ""} onChange={(e) => set("observacoes", e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={submit} disabled={saving} style={{ backgroundColor: "#1E6FBF" }}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
