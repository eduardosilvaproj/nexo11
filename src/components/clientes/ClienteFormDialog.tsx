import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  onSaved?: (id: string) => void;
}

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR",
  "PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const empty: Cliente = {
  nome: "", cpf_cnpj: "", email: "", telefone: "", celular: "",
  cep: "", endereco: "", cidade: "", estado: "", observacoes: "",
};

// Máscaras
const maskTelefone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, a, b, c) =>
    [a && `(${a}`, a && a.length === 2 ? ") " : "", b, c && `-${c}`].filter(Boolean).join(""));
  return d.replace(/(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3");
};
const maskCep = (v: string) => v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
const maskCpfCnpj = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 11)
    return d.replace(/(\d{0,3})(\d{0,3})(\d{0,3})(\d{0,2}).*/, (_, a, b, c, dd) =>
      [a, b && `.${b}`, c && `.${c}`, dd && `-${dd}`].filter(Boolean).join(""));
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2}).*/, "$1.$2.$3/$4-$5");
};

const schema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório").max(120),
  email: z.string().trim().max(255).email("E-mail inválido").optional().or(z.literal("")),
  telefone: z.string().trim().max(20).optional().or(z.literal("")),
  celular: z.string().trim().max(20).optional().or(z.literal("")),
  cpf_cnpj: z.string().trim().max(20).optional().or(z.literal("")),
  cep: z.string().trim().max(10).optional().or(z.literal("")),
  endereco: z.string().trim().max(200).optional().or(z.literal("")),
  cidade: z.string().trim().max(80).optional().or(z.literal("")),
  estado: z.string().trim().length(2).optional().or(z.literal("")),
  observacoes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export function ClienteFormDialog({ open, onOpenChange, cliente, onSaved }: Props) {
  const { perfil } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<Cliente>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(cliente ? { ...empty, ...cliente } : empty);
  }, [cliente, open]);

  const set = (k: keyof Cliente, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (!perfil?.loja_id) {
      toast.error("Loja não definida no perfil");
      return;
    }
    setSaving(true);
    const v = parsed.data;
    const payload = {
      nome: v.nome,
      cpf_cnpj: v.cpf_cnpj || null,
      email: v.email || null,
      telefone: v.telefone || null,
      celular: v.celular || null,
      cep: v.cep || null,
      endereco: v.endereco || null,
      cidade: v.cidade || null,
      estado: v.estado || null,
      observacoes: v.observacoes || null,
      loja_id: perfil.loja_id,
    };

    const isEdit = !!cliente?.id;
    const { data, error } = isEdit
      ? await supabase.from("clientes").update(payload).eq("id", cliente!.id!).select("id").single()
      : await supabase.from("clientes").insert(payload).select("id").single();

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(isEdit ? "Cliente atualizado" : "Cliente cadastrado");
    onOpenChange(false);
    const id = data?.id ?? cliente?.id;
    if (id) {
      onSaved?.(id);
      if (!isEdit) navigate(`/clientes/${id}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{cliente?.id ? "Editar cliente" : "Novo cliente"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Nome completo *</Label>
            <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} maxLength={120} />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input
              value={form.telefone ?? ""}
              onChange={(e) => set("telefone", maskTelefone(e.target.value))}
              placeholder="(XX) XXXXX-XXXX"
            />
          </div>
          <div>
            <Label>Celular / WhatsApp</Label>
            <Input
              value={form.celular ?? ""}
              onChange={(e) => set("celular", maskTelefone(e.target.value))}
              placeholder="(XX) XXXXX-XXXX"
            />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} maxLength={255} />
          </div>
          <div>
            <Label>CPF / CNPJ</Label>
            <Input value={form.cpf_cnpj ?? ""} onChange={(e) => set("cpf_cnpj", maskCpfCnpj(e.target.value))} />
          </div>
          <div>
            <Label>Endereço</Label>
            <Input value={form.endereco ?? ""} onChange={(e) => set("endereco", e.target.value)} maxLength={200} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label>Cidade</Label>
              <Input value={form.cidade ?? ""} onChange={(e) => set("cidade", e.target.value)} maxLength={80} />
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={form.estado ?? ""} onValueChange={(v) => set("estado", v)}>
                <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                <SelectContent>
                  {UFS.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>CEP</Label>
            <Input value={form.cep ?? ""} onChange={(e) => set("cep", maskCep(e.target.value))} placeholder="00000-000" />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea
              rows={2}
              value={form.observacoes ?? ""}
              onChange={(e) => set("observacoes", e.target.value)}
              maxLength={1000}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={submit} disabled={saving} style={{ backgroundColor: "#1E6FBF" }}>
            {saving ? "Salvando..." : "Salvar cliente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
