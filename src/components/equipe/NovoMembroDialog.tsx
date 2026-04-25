import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const FUNCOES_DISPONIVEIS = [
  { value: "vendedor", label: "Vendedor" },
  { value: "projetista", label: "Projetista" },
  { value: "tecnico", label: "Técnico / Medidor" },
  { value: "conferente", label: "Conferente" },
  { value: "montador", label: "Montador" },
  { value: "motorista", label: "Motorista / Entregador" },
  { value: "gerente", label: "Gerente" },
  { value: "financeiro", label: "Financeiro" },
  { value: "admin", label: "Administrador" },
] as const;

export type FuncaoUsuario = typeof FUNCOES_DISPONIVEIS[number]["value"];

const NONE = "__none__";

const schema = z.object({
  nome: z.string().trim().min(1, "Nome obrigatório").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  funcoes: z.array(z.string()).min(1, "Selecione ao menos uma função"),
  funcoes_app_habilitadas: z.array(z.string()),
  equipe_id: z.string().uuid().optional().nullable(),
  papel_comissao_id: z.string().uuid().optional().nullable(),
  comissao_percentual: z.number().min(0).max(100).optional().nullable(),
});

export function NovoMembroDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [funcoes, setFuncoes] = useState<FuncaoUsuario[]>(["vendedor"]);
  const [funcoesApp, setFuncoesApp] = useState<FuncaoUsuario[]>([]);
  const [equipeId, setEquipeId] = useState<string>("");
  const [papelId, setPapelId] = useState<string>(NONE);
  const [comissaoPct, setComissaoPct] = useState<string>("");
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

  const { data: papeis } = useQuery({
    queryKey: ["papeis-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("papeis_comissao")
        .select("id, nome, percentual_padrao")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  // Pré-preenche % com o padrão do papel ao trocar de papel (se vazio ainda)
  useEffect(() => {
    if (papelId === NONE) return;
    const p = papeis?.find((x) => x.id === papelId);
    if (p) setComissaoPct(String(Number(p.percentual_padrao ?? 0)));
  }, [papelId, papeis]);

  function reset() {
    setNome(""); setEmail(""); setRole("vendedor");
    setEquipeId(""); setPapelId(NONE); setComissaoPct("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pctNum = comissaoPct.trim() === "" ? null : Number(comissaoPct.replace(",", "."));
    const parsed = schema.safeParse({
      nome,
      email,
      role,
      equipe_id: role === "montador" && equipeId ? equipeId : null,
      papel_comissao_id: papelId === NONE ? null : papelId,
      comissao_percentual: pctNum,
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
            <Label htmlFor="nome" style={{ fontSize: 12, color: "#0D1117" }}>Nome completo *</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={120} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" style={{ fontSize: 12, color: "#0D1117" }}>E-mail *</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} />
            <p style={{ fontSize: 11, color: "#6B7A90" }}>Será usado para login no sistema</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label style={{ fontSize: 12, color: "#0D1117" }}>Acesso (role) *</Label>
            <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label style={{ fontSize: 12, color: "#0D1117" }}>Papel de comissão</Label>
              <Select value={papelId} onValueChange={setPapelId}>
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
              <Label style={{ fontSize: 12, color: "#0D1117" }}>% Comissão</Label>
              <Input
                type="number"
                step="0.1"
                min={0}
                max={100}
                placeholder="0,0"
                value={comissaoPct}
                onChange={(e) => setComissaoPct(e.target.value)}
                disabled={papelId === NONE}
              />
            </div>
          </div>

          {role === "montador" && (
            <div className="flex flex-col gap-1.5">
              <Label style={{ fontSize: 12, color: "#0D1117" }}>Equipe de montagem</Label>
              <Select value={equipeId} onValueChange={setEquipeId}>
                <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
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
