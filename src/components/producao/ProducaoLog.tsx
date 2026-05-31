import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  pedidoId: string;
  tipo: "terceirizada" | "interna";
}

interface LogEntry {
  id: string;
  status_anterior: string | null;
  status_novo: string;
  usuario_id: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  // Terceirizada
  aguardando_fabricacao: "#E8A020",
  em_producao: "#1E6FBF",
  pronto_retirada: "#12B76A",
  atrasado: "#E53935",
  // Interna
  a_fazer: "#6B7A90",
  em_andamento: "#1E6FBF",
  aguardando_material: "#E8A020",
  concluido: "#12B76A",
};

const STATUS_LABELS: Record<string, string> = {
  aguardando_fabricacao: "Aguardando Fabricação",
  em_producao: "Em Produção",
  pronto_retirada: "Pronto Retirada",
  atrasado: "Atrasado",
  a_fazer: "A Fazer",
  em_andamento: "Em Andamento",
  aguardando_material: "Aguardando Material",
  concluido: "Concluído",
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${date} ${time}`;
}

export function ProducaoLog({ pedidoId, tipo }: Props) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["producao-log", pedidoId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("producao_log")
        .select("*")
        .eq("pedido_id", pedidoId)
        .eq("tipo", tipo)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LogEntry[];
    },
  });

  return (
    <div className="rounded-xl bg-white p-5" style={{ border: "0.5px solid #E8ECF2" }}>
      <div className="flex items-center gap-2 mb-4">
        <Clock size={15} style={{ color: "#1E6FBF" }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#0D1117" }}>Histórico de Status</span>
      </div>

      {isLoading ? (
        <div style={{ fontSize: 12, color: "#6B7A90" }}>Carregando...</div>
      ) : !logs || logs.length === 0 ? (
        <div style={{ fontSize: 12, color: "#6B7A90" }}>Nenhuma alteração registrada.</div>
      ) : (
        <div className="relative pl-5">
          {/* Timeline line */}
          <div
            className="absolute left-[7px] top-2 bottom-2 w-[2px]"
            style={{ backgroundColor: "#E8ECF2" }}
          />

          <div className="space-y-4">
            {logs.map((entry, idx) => {
              const color = STATUS_COLORS[entry.status_novo] || "#6B7A90";
              const labelNovo = STATUS_LABELS[entry.status_novo] || entry.status_novo;
              const labelAnterior = entry.status_anterior
                ? STATUS_LABELS[entry.status_anterior] || entry.status_anterior
                : null;

              return (
                <div key={entry.id} className="relative flex items-start gap-3">
                  {/* Dot */}
                  <div
                    className="absolute -left-5 top-[5px] w-[10px] h-[10px] rounded-full border-2"
                    style={{ backgroundColor: color, borderColor: "#fff", boxShadow: `0 0 0 2px ${color}33` }}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {labelAnterior && (
                        <>
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5"
                            style={{ fontSize: 10, backgroundColor: "#F4F6FA", color: "#6B7A90" }}
                          >
                            {labelAnterior}
                          </span>
                          <span style={{ fontSize: 11, color: "#6B7A90" }}>→</span>
                        </>
                      )}
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5"
                        style={{ fontSize: 10, backgroundColor: `${color}18`, color }}
                      >
                        {labelNovo}
                      </span>
                    </div>
                    <div className="mt-1" style={{ fontSize: 11, color: "#6B7A90" }}>
                      {formatDateTime(entry.created_at)}
                      {entry.usuario_id && (
                        <span className="ml-2" style={{ color: "#9CA3AF" }}>
                          (ID: {entry.usuario_id.slice(0, 8)})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
