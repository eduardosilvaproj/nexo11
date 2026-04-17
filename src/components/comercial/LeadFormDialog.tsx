import { useState } from "react";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const schema = z.object({
  nome: z.string().trim().min(2, "Nome muito curto").max(120, "Máx. 120 caracteres"),
  contato: z.string().trim().max(80, "Máx. 80 caracteres").optional(),
  origem: z.string().trim().max(40, "Máx. 40 caracteres").optional(),
});

const ORIGENS = ["Indicação", "Instagram", "Google", "Loja", "Site", "WhatsApp", "Outros"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadFormDialog({ open, onOpenChange }: Props) {
  const { perfil, user } = useAuth();
  const queryClient = useQueryClient();
  const [nome, setNome] = useState("");
  const [contato, setContato] = useState("");
  const [origem, setOrigem] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = () => {
    setNome("");
    setContato("");
    setOrigem("");
    setErrors({});
  };

  const create = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse({ nome, contato: contato || undefined, origem: origem || undefined });
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        parsed.error.issues.forEach((i) => {
          errs[i.path[0] as string] = i.message;
        });
        setErrors(errs);
        throw new Error("validação");
      }
      if (!perfil?.loja_id) throw new Error("Sem loja vinculada");

      const { error } = await supabase.from("leads").insert({
        nome: parsed.data.nome,
        contato: parsed.data.contato ?? null,
        origem: parsed.data.origem ?? null,
        loja_id: perfil.loja_id,
        vendedor_id: user?.id ?? null,
        status: "novo",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Lead criado", description: "Adicionado ao funil em 'Novo'." });
      queryClient.invalidateQueries({ queryKey: ["leads", perfil?.loja_id] });
      reset();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      if (err.message !== "validação") {
        toast({ title: "Erro ao criar lead", description: err.message, variant: "destructive" });
      }
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo lead</DialogTitle>
          <DialogDescription>Cadastre um lead no funil comercial.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="lead-nome">Nome *</Label>
            <Input
              id="lead-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Maria Silva"
              maxLength={120}
            />
            {errors.nome && <p className="mt-1 text-xs text-nexo-red">{errors.nome}</p>}
          </div>
          <div>
            <Label htmlFor="lead-contato">Contato</Label>
            <Input
              id="lead-contato"
              value={contato}
              onChange={(e) => setContato(e.target.value)}
              placeholder="Telefone, e-mail..."
              maxLength={80}
            />
            {errors.contato && <p className="mt-1 text-xs text-nexo-red">{errors.contato}</p>}
          </div>
          <div>
            <Label htmlFor="lead-origem">Origem</Label>
            <Select value={origem} onValueChange={setOrigem}>
              <SelectTrigger id="lead-origem">
                <SelectValue placeholder="Selecione a origem" />
              </SelectTrigger>
              <SelectContent>
                {ORIGENS.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
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
            className="bg-nexo-blue hover:bg-nexo-blue-dark"
            onClick={() => create.mutate()}
            disabled={create.isPending}
          >
            {create.isPending ? "Salvando..." : "Criar lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
