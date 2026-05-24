import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TriggerType, AutomationAction } from "@/services/automationService";
import { toast } from "sonner";

export function useAutomacoes(lojaId?: string) {
  const queryClient = useQueryClient();

  const { data: regras = [], isLoading: isLoadingRegras } = useQuery({
    queryKey: ["automacao_regras", lojaId],
    enabled: !!lojaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automacao_regras")
        .select("*")
        .eq("loja_id", lojaId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: execucoes = [], isLoading: isLoadingExecucoes } = useQuery({
    queryKey: ["automacao_execucoes", lojaId],
    enabled: !!lojaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automacao_execucoes")
        .select("*, automacao_regras(nome)")
        .eq("loja_id", lojaId!)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  const salvarRegra = useMutation({
    mutationFn: async (regra: any) => {
      const { data, error } = await supabase
        .from("automacao_regras")
        .upsert({ ...regra, loja_id: lojaId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automacao_regras"] });
      toast.success("Regra de automação salva com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao salvar regra: " + error.message);
    },
  });

  const alternarAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("automacao_regras")
        .update({ ativo } as any)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automacao_regras"] });
    },
  });

  const excluirRegra = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("automacao_regras").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automacao_regras"] });
      toast.success("Regra excluída");
    },
  });

  return {
    regras,
    execucoes,
    isLoading: isLoadingRegras || isLoadingExecucoes,
    salvarRegra,
    alternarAtivo,
    excluirRegra,
  };
}
