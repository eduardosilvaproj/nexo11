import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ContratoDetailHeader } from "@/components/contrato/ContratoDetailHeader";
import { ContratoStepper } from "@/components/contrato/ContratoStepper";
import { ContratoFinanceStrip } from "@/components/contrato/ContratoFinanceStrip";
import { ContratoTabs, useContratoTabs, type ContratoTabKey } from "@/components/contrato/ContratoTabs";
import { ContratoActivityLog } from "@/components/contrato/ContratoActivityLog";
import { ContratoComercialTab } from "@/components/contrato/ContratoComercialTab";
import { ContratoTecnicoTab } from "@/components/contrato/ContratoTecnicoTab";
import { ContratoProducaoTab } from "@/components/contrato/ContratoProducaoTab";
import { ContratoLogisticaTab } from "@/components/contrato/ContratoLogisticaTab";
import { ContratoMontagemTab } from "@/components/contrato/ContratoMontagemTab";
import { ContratoAmbientesTab } from "@/components/contrato/ContratoAmbientesTab";
import { ContratoPosVendaTab } from "@/components/contrato/ContratoPosVendaTab";
import { ContratoDreTab } from "@/components/contrato/ContratoDreTab";
import { ReadOnlyContext } from "@/components/contrato/ReadOnlyContext";

const STAGE_TO_TAB: Record<string, ContratoTabKey> = {
  comercial: "comercial",
  tecnico: "tecnico",
  producao: "producao",
  logistica: "logistica",
  montagem: "montagem",
  pos_venda: "pos_venda",
};

const formatBRLDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");

function Skeleton({ height = 16, width = "100%", radius = 6 }: { height?: number | string; width?: number | string; radius?: number }) {
  return (
    <div
      style={{
        height,
        width,
        borderRadius: radius,
        background: "linear-gradient(90deg,#EEF1F5 0%,#F5F7FA 50%,#EEF1F5 100%)",
        backgroundSize: "200% 100%",
        animation: "nexo-skeleton 1.4s ease-in-out infinite",
      }}
    />
  );
}

function ContratoDetailSkeleton() {
  return (
    <div className="flex flex-col">
      <style>{`
        @keyframes nexo-skeleton {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <div className="bg-white" style={{ padding: "24px 32px", borderBottom: "0.5px solid #E8ECF2" }}>
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <Skeleton height={12} width={140} />
            <Skeleton height={22} width={360} />
            <Skeleton height={12} width={220} />
          </div>
          <div className="flex flex-col items-end gap-2">
            <Skeleton height={20} width={100} radius={999} />
            <Skeleton height={22} width={140} />
          </div>
        </div>
      </div>
      <div className="bg-white" style={{ padding: "16px 32px", borderBottom: "0.5px solid #E8ECF2" }}>
        <Skeleton height={32} />
      </div>
      <div style={{ backgroundColor: "#0D1117", padding: "16px 32px" }}>
        <div className="flex" style={{ gap: 40 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div style={{ width: 80 }}><Skeleton height={10} /></div>
              <div style={{ width: 100 }}><Skeleton height={16} /></div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, padding: "24px 32px" }}>
        <div className="flex flex-col gap-4">
          <Skeleton height={120} radius={12} />
          <Skeleton height={220} radius={12} />
        </div>
        <Skeleton height={400} radius={12} />
      </div>
    </div>
  );
}

export default function ContratoDetail() {
  const { id } = useParams<{ id: string }>();
  const { active, setActive } = useContratoTabs("comercial");
  const qc = useQueryClient();
  const [initialTabSet, setInitialTabSet] = useState(false);

  const { data: contrato, isLoading } = useQuery({
    queryKey: ["contrato_dre_view", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_contratos_dre" as any)
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  // Dados auxiliares para detectar travas/pendências por etapa
  const { data: checklists } = useQuery({
    queryKey: ["checklists_tecnicos_count", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklists_tecnicos")
        .select("id, concluido")
        .eq("contrato_id", id!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: ops } = useQuery({
    queryKey: ["ops_status", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordens_producao")
        .select("status")
        .eq("contrato_id", id!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: agend } = useQuery({
    queryKey: ["agend_status", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agendamentos_montagem")
        .select("entrega_confirmada, retrabalho, status")
        .eq("contrato_id", id!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: chamados } = useQuery({
    queryKey: ["chamados_status", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chamados_pos_venda")
        .select("status, nps")
        .eq("contrato_id", id!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  // Ambientes do contrato
  const { data: ambientes } = useQuery({
    queryKey: ["contrato_ambientes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contrato_ambientes")
        .select("*")
        .eq("contrato_id", id!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  // Dados da loja
  const { data: loja } = useQuery({
    queryKey: ["loja", contrato?.loja_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lojas")
        .select("*")
        .eq("id", contrato.loja_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!contrato?.loja_id,
  });

  // Realtime DRE
  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`dre-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "dre_contrato", filter: `contrato_id=eq.${id}` }, () => {
        qc.invalidateQueries({ queryKey: ["dre", id] });
        qc.invalidateQueries({ queryKey: ["dre-tab", id] });
        qc.invalidateQueries({ queryKey: ["contrato_dre_view", id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, qc]);

  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`contrato-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "contratos", filter: `id=eq.${id}` }, () =>
        qc.invalidateQueries({ queryKey: ["contrato_dre_view", id] })
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, qc]);

  // Quando carrega, leva à aba da etapa atual (uma vez)
  useEffect(() => {
    if (!initialTabSet && contrato?.status) {
      const tab = STAGE_TO_TAB[contrato.status];
      if (tab) setActive(tab);
      setInitialTabSet(true);
    }
  }, [contrato?.status, initialTabSet, setActive]);

  if (isLoading || !id || !loja) return <ContratoDetailSkeleton />;
  if (!contrato) return <div className="p-8 text-sm text-muted-foreground">Contrato não encontrado.</div>;

  const isFinalizado = contrato.status === "finalizado";

  // -------- Travas por etapa --------
  let travaMensagem: string | null = null;
  let etapaPendente: ContratoTabKey | null = null;

  if (!isFinalizado) {
    if (contrato.status === "comercial") {
      if (!contrato.assinado || Number(contrato.valor_venda) <= 0) {
        travaMensagem = "Contrato precisa estar assinado e ter valor de venda maior que zero.";
        etapaPendente = "comercial";
      }
    } else if (contrato.status === "tecnico") {
      const total = checklists?.length ?? 0;
      const pend = (checklists ?? []).filter((c) => !c.concluido).length;
      if (total === 0 || pend > 0) {
        travaMensagem = `Checklist técnico precisa estar 100% concluído (${pend} pendente${pend === 1 ? "" : "s"}).`;
        etapaPendente = "tecnico";
      }
    } else if (contrato.status === "producao") {
      const okOp = (ops ?? []).some((o) => o.status === "concluido");
      if (!okOp) {
        travaMensagem = "Ordem de produção precisa estar concluída.";
        etapaPendente = "producao";
      }
    } else if (contrato.status === "logistica") {
      const okEntrega = (agend ?? []).some((a) => a.entrega_confirmada);
      if (!okEntrega) {
        travaMensagem = "Agendamento criado e entrega confirmada são obrigatórios.";
        etapaPendente = "logistica";
      }
    } else if (contrato.status === "montagem") {
      const retrabPendente = (agend ?? []).some((a) => a.retrabalho && a.status !== "concluido");
      if (retrabPendente) {
        travaMensagem = "Existe retrabalho pendente. Resolva antes de avançar.";
        etapaPendente = "montagem";
      }
    } else if (contrato.status === "pos_venda") {
      const abertos = (chamados ?? []).filter((c) => c.status !== "resolvido").length;
      const npsOk = (chamados ?? []).some((c) => c.nps !== null && c.nps !== undefined);
      if (abertos > 0 || !npsOk) {
        travaMensagem = abertos > 0
          ? `Há ${abertos} chamado${abertos === 1 ? "" : "s"} em aberto. Resolva e registre o NPS.`
          : "Registre o NPS para finalizar.";
        etapaPendente = "pos_venda";
      }
    }
  }

  const pendencias: Partial<Record<ContratoTabKey, boolean>> = etapaPendente
    ? { [etapaPendente]: true }
    : {};

  async function handleAvancar() {
    if (!id) return;
    const { data: userRes } = await supabase.auth.getUser();
    const { data, error } = await supabase.rpc("avancar_contrato" as any, {
      p_contrato_id: id,
      p_usuario_id: userRes.user?.id ?? null,
    });
    if (error) {
      toast.error(error.message ?? "Não foi possível avançar a etapa");
      return;
    }
    const result = data as { ok: boolean; status_novo?: string; erro?: string };
    if (!result?.ok) {
      toast.error(result?.erro ?? "Não foi possível avançar a etapa");
      return;
    }
    toast.success(`Contrato avançado para "${result.status_novo}"`);
    qc.invalidateQueries({ queryKey: ["contrato_dre_view", id] });
    qc.invalidateQueries({ queryKey: ["contrato_logs", id] });
  }

  // Margem para faixa final
  const margemReal = Number(contrato.margem_realizada ?? 0);
  const dataFin = contrato.data_finalizacao
    ? formatBRLDate(contrato.data_finalizacao)
    : formatBRLDate(contrato.updated_at);

  return (
    <ReadOnlyContext.Provider value={isFinalizado}>
      <div className="flex flex-col">
        {isFinalizado && (
          <div
            className="flex items-center gap-2"
            style={{
              backgroundColor: "#E6F4EA",
              borderBottom: "1px solid #12B76A",
              color: "#05873C",
              padding: "10px 32px",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <Check size={16} />
            <span>
              Contrato finalizado em {dataFin} · Margem realizada:{" "}
              <strong>{margemReal.toFixed(1).replace(".", ",")}%</strong>
            </span>
          </div>
        )}

        <ContratoDetailHeader
          contrato={contrato}
          loja={loja}
          ambientes={ambientes}
          travaMensagem={travaMensagem}
          onAvancar={handleAvancar}
        />
        <ContratoStepper current={contrato.status} blocked={!!travaMensagem} />
        <ContratoFinanceStrip contratoId={contrato.id} />
        <ContratoTabs active={active} onChange={setActive} pendencias={pendencias} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 320px",
            gap: 24,
            padding: "24px 32px",
          }}
        >
          <div
            style={
              isFinalizado
                ? { pointerEvents: "none", opacity: 0.85, userSelect: "text" }
                : undefined
            }
            aria-disabled={isFinalizado || undefined}
          >
            {active === "comercial" ? (
              <ContratoComercialTab contrato={contrato} />
            ) : active === "tecnico" ? (
              <ContratoTecnicoTab contratoId={contrato.id} />
            ) : active === "producao" ? (
              <ContratoProducaoTab contratoId={contrato.id} />
            ) : active === "logistica" ? (
              <ContratoLogisticaTab contratoId={contrato.id} />
            ) : active === "montagem" ? (
              <ContratoMontagemTab contratoId={contrato.id} lojaId={contrato.loja_id} />
            ) : active === "ambientes" ? (
              <ContratoAmbientesTab contratoId={contrato.id} contratoLojaId={contrato.loja_id} />
            ) : active === "pos_venda" ? (
              <ContratoPosVendaTab contratoId={contrato.id} />
            ) : active === "dre" ? (
              <ContratoDreTab
                contratoId={contrato.id}
                contratoNumero={contrato.id.slice(0, 8)}
                contratoStatus={contrato.status}
              />
            ) : (
              <div className="text-sm text-muted-foreground">
                Conteúdo da aba “{active}” em construção.
              </div>
            )}
          </div>
          <div style={{ pointerEvents: "auto" }}>
            <ContratoActivityLog contratoId={contrato.id} />
          </div>
        </div>
      </div>
    </ReadOnlyContext.Provider>
  );
}
