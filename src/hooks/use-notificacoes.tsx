import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Notificacao {
  id: string;
  loja_id: string;
  usuario_id: string | null;
  perfil_destino: string | null;
  tipo: string;
  prioridade: "baixa" | "media" | "alta" | "critica";
  modulo: string;
  titulo: string;
  mensagem: string;
  entidade_tipo: string | null;
  entidade_id: string | null;
  link: string | null;
  lida: boolean;
  lida_at: string | null;
  resolvida: boolean;
  resolvida_at: string | null;
  created_at: string;
}

export function useNotificacoes() {
  const { user, roles, perfil } = useAuth();
  const queryClient = useQueryClient();

  const { data: notificacoes = [], isLoading } = useQuery({
    queryKey: ["notificacoes", user?.id, roles],
    enabled: !!user && !!perfil?.loja_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notificacoes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar notificações:", error);
        return [];
      }
      return data as Notificacao[];
    },
  });

  const marcarComoLida = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notificacoes")
        .update({ lida: true, lida_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
    },
  });

  const marcarTodasComoLidas = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notificacoes")
        .update({ lida: true, lida_at: new Date().toISOString() } as any)
        .eq("lida", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
      toast.success("Todas as notificações foram marcadas como lidas");
    },
  });

  const marcarComoResolvida = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notificacoes")
        .update({ resolvida: true, resolvida_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
    },
  });

  return {
    notificacoes,
    isLoading,
    naoLidas: notificacoes.filter(n => !n.lida).length,
    marcarComoLida,
    marcarTodasComoLidas,
    marcarComoResolvida
  };
}

export async function criarNotificacao(params: any) {
  const { error } = await supabase.from("notificacoes").insert([params]);
  if (error) {
    console.error("Erro ao criar notificação:", error);
    return { error };
  }
  return { error: null };
}
