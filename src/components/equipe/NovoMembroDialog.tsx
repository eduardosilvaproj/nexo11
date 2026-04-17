import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ROLES = [
  { value: "vendedor", label: "Vendedor" },
  { value: "tecnico", label: "Técnico" },
  { value: "montador", label: "Montador" },
  { value: "gerente", label: "Gerente" },
  { value: "admin", label: "Admin" },
] as const;

const schema = z.object({
  nome: z.string().trim().min(1, "Nome obrigatório").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  role: z.enum(["vendedor", "tecnico", "montador", "gerente", "admin"]),
  equipe_id: z.string().uuid().optional().nullable(),
});

export function NovoMembroDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<typeof ROLES[number]["value"]>("vendedor");
  const [equipeId, setEquipeId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const { data: equipes } = useQuery({
    queryKey: ["equipes-ativas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipes")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  function reset() {
    setNome("");
    setEmail("");
    setRole("vendedor");
    setEquipeId("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({
      nome,
      email,
      role,
      equipe_id: role === "montador" && equipeId ? equipeId : null,
    });
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      toast.error(first ?? "Verifique os campos");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("equipe-invite-member", {
        body: parsed.data,
      });
      if (error) throw error;
      toast.success(`Convite enviado para ${email}`);
      qc.invalidateQueries({ queryKey: ["equipe-membros"] });
      reset();
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao enviar convite";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!submitting) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle style={{ fontSize: 16, fontWeight: 600, color: "#0D1117" }}>
            Novo membro
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nome" style={{ fontSize: 12, color: "#0D1117" }}>
              Nome completo *
            </Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              maxLength={120}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" style={{ fontSize: 12, color: "#0D1117" }}>
              E-mail *
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={255}
            />
            <p style={{ fontSize: 11, color: "#6B7A90" }}>
              Será usado para login no sistema
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label style={{ fontSize: 12, color: "#0D1117" }}>Papel *</Label>
            <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {role === "montador" && (
            <div className="flex flex-col gap-1.5">
              <Label style={{ fontSize: 12, color: "#0D1117" }}>
                Equipe de montagem
              </Label>
              <Select value={equipeId} onValueChange={setEquipeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {equipes?.map((eq) => (
                    <SelectItem key={eq.id} value={eq.id}>{eq.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-white disabled:opacity-60"
              style={{ backgroundColor: "#1E6FBF", fontSize: 13 }}
            >
              {submitting ? "Enviando…" : "Criar membro"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
