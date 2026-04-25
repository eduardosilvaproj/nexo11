import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { MontadorFormDialog, type Montador } from "@/components/configuracoes/MontadorFormDialog";

const sb = supabase as unknown as { from: (t: string) => any };

const FUNCAO_BADGES: Record<string, { label: string; bg: string; color: string }> = {
  montador:   { label: "Montador",   bg: "#FAECE7", color: "#993C1D" },
  tecnico:    { label: "Técnico",    bg: "#EEEDFE", color: "#534AB7" },
  medidor:    { label: "Medidor",    bg: "#EEEDFE", color: "#534AB7" },
  conferente: { label: "Conferente", bg: "#EEEDFE", color: "#534AB7" },
  motorista:  { label: "Motorista",  bg: "#FFF4E5", color: "#B45309" },
};

function FuncaoBadges({ funcoes }: { funcoes: string[] | null | undefined }) {
  const list = funcoes ?? [];
  if (list.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {list.map((f) => {
        const cfg = FUNCAO_BADGES[f] ?? { label: f, bg: "#EEF1F5", color: "#6B7A90" };
        return (
          <span
            key={f}
            className="rounded-full px-2 py-0.5"
            style={{ fontSize: 11, fontWeight: 500, backgroundColor: cfg.bg, color: cfg.color }}
          >
            {cfg.label}
          </span>
        );
      })}
    </div>
  );
}

export function MontadoresTab() {
  const qc = useQueryClient();
  const { perfil } = useAuth();
  const lojaId = perfil?.loja_id ?? null;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Montador | null>(null);

  const { data: montadores, isLoading } = useQuery({
    queryKey: ["montadores-config", lojaId],
    enabled: !!lojaId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("tecnicos_montadores")
        .select("id, nome, telefone, email, percentual_padrao, ativo, funcoes")
        .eq("loja_id", lojaId!)
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Montador[];
    },
  });

  const toggleAtivo = async (m: Montador) => {
    const { error } = await sb
      .from("tecnicos_montadores")
      .update({ ativo: !m.ativo })
      .eq("id", m.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["montadores-config"] });
  };

  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <p style={{ fontSize: 13, color: "#6B7A90" }}>
          Cadastro de técnicos, medidores, conferentes e montadores
        </p>
        <Button onClick={() => { setEditing(null); setOpen(true); }} style={{ backgroundColor: "#1E6FBF", color: "#fff" }}>
          <Plus className="mr-2 h-4 w-4" /> Nova Pessoa
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl bg-white" style={{ border: "0.5px solid #E8ECF2" }}>
        <table className="w-full">
          <thead style={{ backgroundColor: "#F7F9FC" }}>
            <tr>
              {["Nome", "Funções", "Telefone", "Email", "% Padrão", "Ativo", "Ações"].map((h) => (
                <th key={h} className="px-4 py-3 text-left" style={{ fontSize: 11, color: "#6B7A90", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">Carregando...</td></tr>}
            {!isLoading && (!montadores || montadores.length === 0) && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhuma pessoa cadastrada</td></tr>
            )}
            {montadores?.map((m) => (
              <tr key={m.id} style={{ borderTop: "0.5px solid #E8ECF2" }}>
                <td className="px-4 py-3 text-sm font-medium">{m.nome}</td>
                <td className="px-4 py-3"><FuncaoBadges funcoes={m.funcoes} /></td>
                <td className="px-4 py-3 text-sm">{m.telefone ?? "—"}</td>
                <td className="px-4 py-3 text-sm">{m.email ?? "—"}</td>
                <td className="px-4 py-3 text-sm">{Number(m.percentual_padrao).toFixed(2).replace(".", ",")}%</td>
                <td className="px-4 py-3">
                  <Switch checked={m.ativo} onCheckedChange={() => toggleAtivo(m)} />
                </td>
                <td className="px-4 py-3">
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(m); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <MontadorFormDialog open={open} onOpenChange={setOpen} lojaId={lojaId} montador={editing} />
    </div>
  );
}
