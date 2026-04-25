import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Ruler, CheckSquare, ArrowRight, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface TecnicoTabProps {
  contratoId: string;
}

export function ContratoTecnicoTab({ contratoId }: TecnicoTabProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  
  const { data: contrato } = useQuery({
    queryKey: ["contrato-tecnico", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("id, loja_id, status, contrato_ambientes(id, medicao_concluido, status_medicao, conferencia_status)")
        .eq("id", contratoId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`tecnico-contrato-${contratoId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "contratos", filter: `id=eq.${contratoId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["contrato-tecnico", contratoId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [contratoId, qc]);

  const ambientes = Array.isArray(contrato?.contrato_ambientes) ? (contrato.contrato_ambientes as any[]) : [];
  const totalAmbientes = ambientes.length;
  
  // Nova lógica de desbloqueio: pelo menos 1 liberado para conferência
  const ambientesLiberados = ambientes.filter(a => a.status_medicao === 'liberado_conferencia');
  const podeConferir = ambientesLiberados.length > 0;
  
  const totalMedicaoConcluida = ambientes.filter(a => a.medicao_concluido || a.status_medicao === 'liberado_conferencia').length;
  const totalConferenciaConcluida = ambientes.filter(a => a.conferencia_status === 'liberada').length;
  const aindaEmMedicao = ambientes.filter(a => !a.medicao_concluido && a.status_medicao !== 'liberado_conferencia').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Card 1 — Medição */}
      <div 
        className="bg-white rounded-xl p-6 flex flex-col border border-[#E8ECF2] shadow-sm hover:shadow-md transition-all group"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-[#1E6FBF]">
            <Ruler size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-[#0D1117]">Medição fina</h3>
            <p className="text-sm text-[#6B7A90]">
              {totalAmbientes === 0 
                ? "Nenhum ambiente importado" 
                : totalMedicaoConcluida === totalAmbientes 
                  ? "100% concluída" 
                  : `${totalMedicaoConcluida} de ${totalAmbientes} concluídos`}
            </p>
          </div>
        </div>
        
        <div className="mt-auto pt-6">
          <button
            onClick={() => navigate(`/contratos/${contratoId}/medicao`)}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-[#0D1117] text-white text-sm font-medium hover:bg-black transition-colors"
          >
            Abrir medição
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Card 2 — Conferência */}
      <div 
        className={cn(
          "bg-white rounded-xl p-6 flex flex-col border border-[#E8ECF2] shadow-sm transition-all group",
          !concluidoMedicao && "opacity-75"
        )}
      >
        <div className="flex items-center gap-4 mb-4">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center",
            concluidoMedicao ? "bg-green-50 text-[#12B76A]" : "bg-neutral-50 text-neutral-300"
          )}>
            <CheckSquare size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-[#0D1117]">Conferência técnica</h3>
            <p className="text-sm text-[#6B7A90]">
              {!concluidoMedicao 
                ? "Aguardando medição" 
                : totalConferenciaConcluida === totalAmbientes 
                  ? "Tudo conferido" 
                  : `${totalConferenciaConcluida} de ${totalAmbientes} conferidos`}
            </p>
          </div>
        </div>
        
        <div className="mt-auto pt-6">
          <button
            disabled={!concluidoMedicao}
            onClick={() => navigate(`/contratos/${contratoId}/conferencia`)}
            className={cn(
              "w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
              concluidoMedicao 
                ? "bg-[#0D1117] text-white hover:bg-black" 
                : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
            )}
          >
            {concluidoMedicao ? "Abrir conferência" : <span className="flex items-center gap-2"><Lock size={16} /> Bloqueado</span>}
            {concluidoMedicao && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
          </button>
        </div>
      </div>
    </div>
  );
}
