import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const schema = z.object({
  nome: z.string().trim().min(2, "Nome obrigatório").max(120),
  cidade: z.string().trim().min(2, "Cidade obrigatória").max(80),
  estado: z.string().length(2, "UF obrigatória"),
  cnpj: z.string().trim().max(18).optional().or(z.literal("")),
  telefone: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().email("E-mail inválido").max(255).optional().or(z.literal("")),
  franqueado_id: z.string().uuid("Selecione um responsável"),
});

function maskCNPJ(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

type Props = { open: boolean; onOpenChange: (o: boolean) => void };

export function NovaLojaDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nome: "",
    cidade: "",
    estado: "",
    cnpj: "",
    telefone: "",
    email: "",
    franqueado_id: "",
  });

  const { data: admins = [] } = useQuery({
    queryKey: ["admins-disponiveis"],
    enabled: open,
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      const ids = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
      if (!ids.length) return [];
      const { data: users } = await supabase
        .from("usuarios_publico")
        .select("id, nome")
        .in("id", ids);
      return users ?? [];
    },
  });

  const reset = () =>
    setForm({
      nome: "",
      cidade: "",
      estado: "",
      cnpj: "",
      telefone: "",
      email: "",
      franqueado_id: "",
    });

  const createLoja = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse(form);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      }
      const payload: any = {
        nome: parsed.data.nome,
        cidade: parsed.data.cidade,
        estado: parsed.data.estado,
        franqueado_id: parsed.data.franqueado_id,
      };
      if (parsed.data.cnpj) payload.cnpj = parsed.data.cnpj;
      if (parsed.data.telefone) payload.telefone = parsed.data.telefone;
      if (parsed.data.email) payload.email = parsed.data.email;

      const { error } = await supabase.from("lojas").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Loja criada com sucesso");
      qc.invalidateQueries({ queryKey: ["lojas-grid"] });
      qc.invalidateQueries({ queryKey: ["lojas-kpi"] });
      reset();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao criar loja"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 520 }}>
        <DialogHeader>
          <DialogTitle>Nova loja</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2">
            <Label>Nome da loja *</Label>
            <Input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </div>
          <div>
            <Label>Cidade *</Label>
            <Input
              value={form.cidade}
              onChange={(e) => setForm({ ...form, cidade: e.target.value })}
            />
          </div>
          <div>
            <Label>Estado *</Label>
            <Select
              value={form.estado}
              onValueChange={(v) => setForm({ ...form, estado: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent>
                {UFS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>CNPJ</Label>
            <Input
              placeholder="XX.XXX.XXX/XXXX-XX"
              value={form.cnpj}
              onChange={(e) => setForm({ ...form, cnpj: maskCNPJ(e.target.value) })}
            />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <Label>Responsável (admin da loja) *</Label>
            <Select
              value={form.franqueado_id}
              onValueChange={(v) => setForm({ ...form, franqueado_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder={admins.length ? "Selecione um admin" : "Nenhum admin disponível"} />
              </SelectTrigger>
              <SelectContent>
                {admins.map((a: any) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => createLoja.mutate()}
            disabled={createLoja.isPending}
            style={{ background: "#1E6FBF" }}
          >
            Criar loja →
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
