import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Database } from "@/integrations/supabase/types";

type OpStatus = Database["public"]["Enums"]["op_status"];

const NEXT: Record<OpStatus, { next: OpStatus; label: string } | null> = {
  aguardando: { next: "em_corte", label: "Iniciar corte" },
  em_corte: { next: "em_montagem", label: "Iniciar montagem" },
  em_montagem: { next: "concluido", label: "Marcar concluída" },
  concluido: null,
};

interface Props {
  opId: string;
  contratoId: string;
  status: OpStatus;
}

export function OPStatusActions({ opId, contratoId, status }: Props) {
  const qc = useQueryClient();
  const next = NEXT[status];

  const mutation = useMutation({
    mutationFn: async () => {
      if (!next) return;
      const updates: Record<string, unknown> = { status: next.next };
      if (next.next === "concluido") {
        updates.data_conclusao = new Date().toISOString();
      }
      const { error } = await (supabase.from("ordens_producao") as unknown as {
        update: (u: unknown) => { eq: (c: string, v: string) => Promise<{ error: Error | null }> };
      }).update(updates).eq("id", opId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(next?.next === "concluido" ? "Produção concluída ✓" : "Status atualizado");
      qc.invalidateQueries({ queryKey: ["op", contratoId] });
      qc.invalidateQueries({ queryKey: ["producao-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!next) return null;
  return (
    <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
      {mutation.isPending ? "Salvando..." : next.label}
    </Button>
  );
}
