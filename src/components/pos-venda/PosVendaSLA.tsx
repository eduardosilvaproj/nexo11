import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type ChamadoTipo = Database["public"]["Enums"]["chamado_tipo"];

const SLA_HORAS: Record<ChamadoTipo, number> = {
  assistencia: 48,
  reclamacao: 24,
  garantia: 72,
  solicitacao: 48,
};

const TIPO_LABEL: Record<ChamadoTipo, string> = {
  assistencia: "Assistência",
  reclamacao: "Reclamação",
  garantia: "Garantia",
  solicitacao: "Solicitação",
};

interface Chamado {
  id: string;
  tipo: ChamadoTipo;
  status: string;
  descricao: string;
  created_at: string;
  contratos?: { cliente_nome: string } | null;
}

interface SLAItem {
  chamado: Chamado;
  slaHoras: number;
  horasDecorridas: number;
  horasRestantes: number;
  percentualRestante: number;
  cor: "green" | "amber" | "red";
}

export default function PosVendaSLA() {
  const { perfil } = useAuth();

  const { data: chamados = [], isLoading } = useQuery({
    queryKey: ["posvenda-sla", perfil?.loja_id],
    queryFn: async () => {
      const query = (supabase as any)
        .from("chamados_pos_venda")
        .select("id, tipo, status, descricao, created_at, contratos:contrato_id(cliente_nome)")
        .in("status", ["aberto", "em_andamento"])
        .order("created_at", { ascending: true });
      if (perfil?.loja_id) {
        query.eq("loja_id", perfil.loja_id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Chamado[];
    },
    enabled: !!perfil,
  });

  const slaItems: SLAItem[] = useMemo(() => {
    const now = Date.now();
    return chamados
      .map((c) => {
        const slaHoras = SLA_HORAS[c.tipo] ?? 48;
        const horasDecorridas = (now - new Date(c.created_at).getTime()) / (1000 * 60 * 60);
        const horasRestantes = slaHoras - horasDecorridas;
        const percentualRestante = horasRestantes / slaHoras;

        let cor: "green" | "amber" | "red" = "green";
        if (percentualRestante <= 0) cor = "red";
        else if (percentualRestante < 0.5) cor = "amber";

        return { chamado: c, slaHoras, horasDecorridas, horasRestantes, percentualRestante, cor };
      })
      .sort((a, b) => a.horasRestantes - b.horasRestantes);
  }, [chamados]);

  const corConfig = {
    green: { bg: "#D1FAE5", fg: "#05873C", icon: ShieldCheck },
    amber: { bg: "#FEF3C7", fg: "#E8A020", icon: Clock },
    red: { bg: "#FDECEA", fg: "#E53935", icon: AlertTriangle },
  };

  if (isLoading) {
    return (
      <div className="rounded-xl bg-white p-6" style={{ border: "0.5px solid #E8ECF2" }}>
        <div style={{ fontSize: 13, color: "#6B7A90" }}>Carregando SLA...</div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl bg-white"
      style={{ border: "0.5px solid #E8ECF2", borderTop: "3px solid #E8A020" }}
    >
      <div className="p-5 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <Clock size={16} color="#0D1117" />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#0D1117" }}>
            Controle de SLA
          </span>
        </div>
        <p style={{ fontSize: 11, color: "#6B7A90" }}>
          Chamados ordenados por urgência de SLA
        </p>
      </div>

      {slaItems.length === 0 ? (
        <div className="px-5 pb-5">
          <p style={{ fontSize: 13, color: "#6B7A90" }}>
            Nenhum chamado aberto no momento.
          </p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: "#E8ECF2" }}>
          {slaItems.map((item) => {
            const cfg = corConfig[item.cor];
            const Icon = cfg.icon;
            const clienteNome =
              (item.chamado.contratos as any)?.cliente_nome ?? "—";

            const badgeText =
              item.horasRestantes > 0
                ? `${Math.floor(item.horasRestantes)}h restantes`
                : `Estourado há ${Math.abs(Math.floor(item.horasRestantes))}h`;

            return (
              <div key={item.chamado.id} className="px-5 py-3 flex items-center gap-3">
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{ width: 32, height: 32, backgroundColor: cfg.bg }}
                >
                  <Icon size={16} color={cfg.fg} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#0D1117" }} className="truncate">
                      {clienteNome}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5"
                      style={{ fontSize: 10, backgroundColor: "#E8ECF2", color: "#6B7A90" }}
                    >
                      {TIPO_LABEL[item.chamado.tipo]}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: "#6B7A90" }} className="truncate mt-0.5">
                    {item.chamado.descricao || "Sem descrição"}
                  </p>
                </div>

                <div
                  className="rounded-full px-2.5 py-1 whitespace-nowrap"
                  style={{ fontSize: 11, fontWeight: 500, backgroundColor: cfg.bg, color: cfg.fg }}
                >
                  {badgeText}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
