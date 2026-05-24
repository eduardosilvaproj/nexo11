import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface ExecutionControlProps {
  entidadeId: string;
  entidadeTipo: string;
  lojaId: string;
  modulo: string;
  contratoId?: string;
}

export function ExecutionControl({ 
  entidadeId, 
  entidadeTipo, 
  lojaId, 
  modulo, 
  contratoId 
}: ExecutionControlProps) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data: activeCheckin } = useQuery({
    queryKey: ["active-checkin", entidadeId],
    queryFn: async () => {
      const { data } = await supabase
        .from("operacao_checkins")
        .select("*")
        .eq("entidade_id", entidadeId)
        .eq("status", "iniciado")
        .maybeSingle();
      return data;
    },
  });

  const startCheckin = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("operacao_checkins")
        .insert({
          loja_id: lojaId,
          usuario_id: user?.id,
          entidade_tipo: entidadeTipo,
          entidade_id: entidadeId,
          modulo,
          contrato_id: contratoId,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Check-in realizado");
      qc.invalidateQueries({ queryKey: ["active-checkin", entidadeId] });
      qc.invalidateQueries({ queryKey: ["operacao-execucao-hoje"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const finishCheckin = useMutation({
    mutationFn: async () => {
      if (!activeCheckin) return;
      
      const now = new Date();
      const start = new Date(activeCheckin.iniciado_em);
      const diff = Math.round((now.getTime() - start.getTime()) / 60000);

      const { error } = await supabase
        .from("operacao_checkins")
        .update({
          status: "concluido",
          finalizado_em: now.toISOString(),
          duracao_minutos: diff,
        })
        .eq("id", activeCheckin.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Check-out realizado");
      qc.invalidateQueries({ queryKey: ["active-checkin", entidadeId] });
      qc.invalidateQueries({ queryKey: ["operacao-execucao-hoje"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (activeCheckin) {
    return (
      <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-500 animate-pulse">EM EXECUÇÃO</Badge>
            <span className="text-sm font-medium text-blue-900">
              Iniciado às {new Date(activeCheckin.iniciado_em).toLocaleTimeString()}
            </span>
          </div>
        </div>
        <Button 
          onClick={() => finishCheckin.mutate()} 
          disabled={finishCheckin.isPending}
          variant="outline"
          className="bg-white border-blue-200 text-blue-700 hover:bg-blue-100"
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Finalizar Trabalho
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-lg">
      <div className="text-sm text-slate-500">
        Pronto para iniciar? Registre o check-in operacional.
      </div>
      <Button 
        onClick={() => startCheckin.mutate()} 
        disabled={startCheckin.isPending}
        className="bg-slate-900"
      >
        <PlayCircle className="w-4 h-4 mr-2" />
        Iniciar Agora
      </Button>
    </div>
  );
}
