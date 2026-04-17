import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, AlertTriangle, Factory, Truck, Star, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ContratoActivityLogProps {
  contratoId: string;
}

type LogRow = {
  id: string;
  contrato_id: string;
  acao: string;
  titulo: string;
  descricao: string | null;
  autor_nome: string | null;
  created_at: string;
};

const ICON_BY_ACAO: Record<
  string,
  { Icon: typeof Activity; color: string; bg: string }
> = {
  status_avancado: { Icon: ArrowRight, color: "#1E6FBF", bg: "#E8F1FB" },
  checklist_completo: { Icon: CheckCircle2, color: "#12B76A", bg: "#E6F4EA" },
  retrabalho_registrado: { Icon: AlertTriangle, color: "#E53935", bg: "#FDECEA" },
  producao_concluida: { Icon: Factory, color: "#FF7A59", bg: "#FFEDE6" },
  logistica_confirmada: { Icon: Truck, color: "#12B76A", bg: "#E6F4EA" },
  nps_registrado: { Icon: Star, color: "#E8A020", bg: "#FEF3C7" },
};

const fallbackIcon = { Icon: Activity, color: "#6B7A90", bg: "#F5F7FA" };

function iniciais(nome?: string | null) {
  if (!nome) return "??";
  const parts = nome.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "??";
}

function tempoRelativo(iso: string) {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diffSec = Math.max(1, Math.floor((now - t) / 1000));
  if (diffSec < 60) return `há ${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `há ${diffD} d`;
  const diffM = Math.floor(diffD / 30);
  if (diffM < 12) return `há ${diffM} mês${diffM > 1 ? "es" : ""}`;
  const diffY = Math.floor(diffM / 12);
  return `há ${diffY} ano${diffY > 1 ? "s" : ""}`;
}

export function ContratoActivityLog({ contratoId }: ContratoActivityLogProps) {
  const qc = useQueryClient();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["contrato_logs", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contrato_logs" as any)
        .select("*")
        .eq("contrato_id", contratoId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return ((data as unknown) as LogRow[]) ?? [];
    },
    enabled: !!contratoId,
  });

  // Realtime: novas entradas aparecem automaticamente
  useEffect(() => {
    if (!contratoId) return;
    const channel = supabase
      .channel(`contrato_logs_${contratoId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "contrato_logs",
          filter: `contrato_id=eq.${contratoId}`,
        },
        () => qc.invalidateQueries({ queryKey: ["contrato_logs", contratoId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [contratoId, qc]);

  return (
    <aside
      className="rounded-xl bg-white"
      style={{
        border: "0.5px solid #E8ECF2",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: 400,
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "0.5px solid #E8ECF2",
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 500, color: "#0D1117" }}>Histórico</h3>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "4px 0",
        }}
      >
        {isLoading ? (
          <p style={{ fontSize: 12, color: "#6B7A90", padding: 16 }}>Carregando…</p>
        ) : logs.length === 0 ? (
          <p style={{ fontSize: 12, color: "#6B7A90", padding: 16 }}>
            Nenhuma atividade registrada ainda.
          </p>
        ) : (
          logs.map((log, idx) => {
            const meta = ICON_BY_ACAO[log.acao] ?? fallbackIcon;
            const { Icon } = meta;
            return (
              <div
                key={log.id}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "12px 16px",
                  borderBottom:
                    idx < logs.length - 1 ? "0.5px solid #E8ECF2" : "none",
                }}
              >
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      backgroundColor: "#F5F7FA",
                      color: "#0D1117",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 600,
                      border: "0.5px solid #E8ECF2",
                    }}
                    title={log.autor_nome ?? "Sistema"}
                  >
                    {iniciais(log.autor_nome ?? "Sistema")}
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      bottom: -2,
                      right: -2,
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      backgroundColor: meta.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1.5px solid #FFFFFF",
                    }}
                  >
                    <Icon size={10} color={meta.color} strokeWidth={2.5} />
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#0D1117",
                      lineHeight: 1.3,
                    }}
                  >
                    {log.titulo}
                  </div>
                  {log.descricao && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "#6B7A90",
                        marginTop: 2,
                        lineHeight: 1.4,
                        wordBreak: "break-word",
                      }}
                    >
                      {log.descricao}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: 11,
                      color: "#B0BAC9",
                      marginTop: 4,
                    }}
                  >
                    {tempoRelativo(log.created_at)}
                    {log.autor_nome ? ` · ${log.autor_nome}` : ""}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
