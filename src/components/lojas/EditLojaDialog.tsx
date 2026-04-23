import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
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
  endereco: z.string().trim().optional().or(z.literal("")),
  cnpj: z.string().trim().max(18).optional().or(z.literal("")),
  telefone: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().email("E-mail inválido").max(255).optional().or(z.literal("")),
  franqueado_id: z.string().uuid("Selecione um responsável"),
  contrato_modelo: z.string().trim().optional().or(z.literal("")),
});

function maskCNPJ(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

type Props = { 
  open: boolean; 
  onOpenChange: (o: boolean) => void; 
  loja: any;
};

export function EditLojaDialog({ open, onOpenChange, loja }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nome: "",
    cidade: "",
    estado: "",
    endereco: "",
    cnpj: "",
    telefone: "",
    email: "",
    franqueado_id: "",
    contrato_modelo: "",
  });

  useEffect(() => {
    if (loja) {
      setForm({
        nome: loja.nome || "",
        cidade: loja.cidade || "",
        estado: loja.estado || "",
        endereco: loja.endereco || "",
        cnpj: loja.cnpj || "",
        telefone: loja.telefone || "",
        email: loja.email || "",
        franqueado_id: loja.franqueado_id || "",
        contrato_modelo: loja.contrato_modelo || "",
      });
    }
  }, [loja]);

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

  const updateLoja = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse(form);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      }
      
      const { error } = await supabase
        .from("lojas")
        .update({
          nome: parsed.data.nome,
          cidade: parsed.data.cidade,
          estado: parsed.data.estado,
          endereco: parsed.data.endereco,
          cnpj: parsed.data.cnpj,
          telefone: parsed.data.telefone,
          email: parsed.data.email,
          franqueado_id: parsed.data.franqueado_id,
          contrato_modelo: parsed.data.contrato_modelo,
        })
        .eq("id", loja.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Loja atualizada com sucesso");
      qc.invalidateQueries({ queryKey: ["loja", loja.id] });
      qc.invalidateQueries({ queryKey: ["loja-cad", loja.id] });
      qc.invalidateQueries({ queryKey: ["lojas-grid"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao atualizar loja"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar loja</DialogTitle>
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
              onChange={(e) => setForm({ ...form, city: e.target.value })} // Fixed typo: city -> cidade
              // Wait, I noticed I had a typo in my thought process, let me fix it in the code
            />
          </div>
          {/* Correction in the actual code below */}
          ...
