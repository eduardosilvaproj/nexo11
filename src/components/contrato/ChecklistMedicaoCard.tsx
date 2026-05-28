import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Block, Item, ProgressHeader, AvancarButton, Alerta } from "./GateChecklistShared";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Props {
  contratoId: string;
  onAvancado?: () => void;
}

export function ChecklistMedicaoCard({ contratoId, onAvancado }: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canManage = hasRole("admin") || hasRole("admin_master") || hasRole("gerente");
  const canMedidor = canManage || hasRole("medidor") || hasRole("tecnico");

  const { data: contrato } = useQuery({
    queryKey: ["gate_medicao", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("id, medicao_responsavel_id, trava_medicao_ok, medicao_concluida_em, status")
        .eq("id", contratoId).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: ambientes } = useQuery({
    queryKey: ["gate_medicao_ambientes", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contrato_ambientes")
        .select("id, nome, medicao_concluido, status_medicao, medicao_fotos, valor_liquido")
        .eq("contrato_id", contratoId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const ambArr = ambientes ?? [];
  const totalAmb = ambArr.length;
  const medidasOk = ambArr.length > 0 && ambArr.every(a => a.medicao_concluido || a.status_medicao === "liberado_conferencia");
  const fotosOk = ambArr.length > 0 && ambArr.every(a => {
    const fotos = a.medicao_fotos as any;
    return Array.isArray(fotos) && fotos.length > 0;
  });
  const medidorAtribuido = !!contrato?.medicao_responsavel_id;
  const concluida = !!contrato?.medicao_concluida_em;

  const items = [
    { done: medidorAtribuido, label: "Medidor atribuído ao contrato" },
    { done: medidasOk, label: totalAmb === 0 ? "Sem ambientes" : `Medições preenchidas (${ambArr.filter(a=>a.medicao_concluido||a.status_medicao==="liberado_conferencia").length}/${totalAmb})` },
    { done: fotosOk, label: `Fotos anexadas em todos ambientes (${ambArr.filter(a=>Array.isArray(a.medicao_fotos)&&(a.medicao_fotos as any).length>0).length}/${totalAmb})` },
    { done: concluida, label: "Medidor marcou como concluída" },
  ];
  const done = items.filter(i => i.done).length;
  const allDone = done === items.length;

  async function marcarConcluida() {
    const { error } = await supabase.from("contratos")
      .update({ medicao_concluida_em: new Date().toISOString() } as any)
      .eq("id", contratoId);
    if (error) return toast.error(error.message);
    toast.success("Medição marcada como concluída");
    qc.invalidateQueries({ queryKey: ["gate_medicao", contratoId] });
  }

  async function avancar() {
    const { error } = await supabase.from("contratos")
      .update({ trava_medicao_ok: true } as any).eq("id", contratoId);
    if (error) return toast.error(error.message);
    const { data: u } = await supabase.auth.getUser();
    await supabase.rpc("avancar_contrato" as any, { p_contrato_id: contratoId, p_usuario_id: u.user?.id ?? null });
    toast.success("Avançado para Conferência");
    qc.invalidateQueries();
    onAvancado?.();
  }

  return (
    <div className="flex flex-col gap-4">
      <ProgressHeader title="Checklist de Medição" subtitle="Itens obrigatórios para avançar para Conferência" done={done} total={items.length} />

      <Block title="Validação" doneCount={done} totalCount={items.length}>
        {items.map((it, i) => <Item key={i} {...it} />)}
      </Block>

      {!medidorAtribuido && canManage && (
        <Alerta tone="info">Gerente: atribua um medidor responsável ao contrato.</Alerta>
      )}

      <div className="flex flex-wrap gap-2 items-center justify-between rounded-xl border border-[#E8ECF2] bg-white p-4">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/contratos/${contratoId}/medicao`)}>
            Abrir medição
          </Button>
          {canMedidor && !concluida && medidasOk && fotosOk && (
            <Button variant="outline" size="sm" onClick={marcarConcluida}>
              Marcar medição como concluída
            </Button>
          )}
        </div>
        <AvancarButton enabled={allDone && canManage} label="Avançar para Conferência" onClick={avancar} />
      </div>
    </div>
  );
}

export default ChecklistMedicaoCard;
