import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, Loader2, AlertTriangle } from "lucide-react";
import { ConferenciaAmbientesSection } from "@/components/contrato/ConferenciaAmbientesSection";

export default function ContratoConferenciaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: contrato, isLoading: loadingContrato } = useQuery({
    queryKey: ["contrato-conferencia-page", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("id, cliente_nome, loja_id, contrato_ambientes(medicao_concluido, status_medicao)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (loadingContrato) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!contrato) {
    return <div className="p-8">Contrato não encontrado</div>;
  }

  const ambientes = Array.isArray(contrato.contrato_ambientes) ? contrato.contrato_ambientes : [];
  const ambientesLiberados = ambientes.filter(a => (a.status_medicao as any) === 'liberado_conferencia');
  const hasLiberados = ambientesLiberados.length > 0;
  const emMedicao = ambientes.filter(a => (a.status_medicao as any) !== 'liberado_conferencia' && a.status_medicao !== 'concluido').length;

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col gap-1">
        <button
          onClick={() => navigate(`/contratos/${id}`)}
          className="flex items-center gap-1 text-[#6B7A90] hover:text-[#0D1117] transition-colors text-sm mb-1"
        >
          <ChevronLeft size={16} />
          Voltar ao contrato
        </button>
        <h1 className="text-2xl font-semibold text-[#0D1117]">
          Conferência — {contrato.cliente_nome} <span className="text-[#6B7A90] font-normal">#{id?.slice(0, 6).toUpperCase()}</span>
        </h1>
        {hasLiberados && (
          <div className="flex gap-2 mt-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {ambientesLiberados.length} ambiente(s) disponível(is) para conferência
            </span>
            {emMedicao > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                {emMedicao} ainda em medição
              </span>
            )}
          </div>
        )}
      </div>

      {!hasLiberados ? (
        <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-xl p-8 flex flex-col items-center text-center gap-4">
          <AlertTriangle size={48} className="text-[#D97706]" />
          <div>
            <h2 className="text-lg font-semibold text-[#92400E]">Aguardando liberação</h2>
            <p className="text-[#B45309] mt-1 max-w-md">
              Nenhum ambiente foi liberado para conferência técnica ainda. 
              Aguarde o técnico concluir a medição e liberar os ambientes.
            </p>
          </div>
          <button 
            onClick={() => navigate(`/contratos/${id}/medicao`)}
            className="bg-[#D97706] hover:bg-[#B45309] text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Ir para medição
          </button>
        </div>
      ) : (
        <ConferenciaAmbientesSection 
          contratoId={id!}
          lojaId={contrato.loja_id}
        />
      )}
    </div>
  );
}
