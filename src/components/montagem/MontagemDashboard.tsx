import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart3, CheckCircle2, RotateCcw, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const sb = supabase as unknown as { from: (t: string) => any };

function diffHoras(ini?: string | null, fim?: string | null): number {
  if (!ini || !fim) return 0;
  const [h1, m1] = ini.split(":").map(Number);
  const [h2, m2] = fim.split(":").map(Number);
  return Math.max(0, (h2 + m2 / 60) - (h1 + m1 / 60));
}

export function MontagemDashboard() {
  const { perfil } = useAuth();
  const lojaId = perfil?.loja_id;

  const mesAtual = useMemo(() => new Date(), []);
  const inicioMes = format(startOfMonth(mesAtual), "yyyy-MM-dd");
  const fimMes = format(endOfMonth(mesAtual), "yyyy-MM-dd");

  const { data: agendamentos = [] } = useQuery({
    queryKey: ["montagem-dashboard", lojaId, inicioMes],
    queryFn: async () => {
      let query = sb
        .from("agendamentos_montagem")
        .select("id, data, hora_inicio, hora_fim, status, retrabalho, equipe_id, equipes(id, nome, cor)")
        .gte("data", inicioMes)
        .lte("data", fimMes);
      if (lojaId) query = query.eq("loja_id", lojaId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        data: string;
        hora_inicio: string | null;
        hora_fim: string | null;
        status: string;
        retrabalho: boolean;
        equipe_id: string;
        equipes: { id: string; nome: string; cor: string } | null;
      }>;
    },
    enabled: !!lojaId,
  });

  const total = agendamentos.length;
  const concluidos = agendamentos.filter((a) => a.status === "concluido").length;
  const taxaConclusao = total > 0 ? Math.round((concluidos / total) * 100) : 0;
  const retrabalhos = agendamentos.filter((a) => a.retrabalho).length;
  const horasTrabalhadas = agendamentos
    .filter((a) => a.status === "concluido")
    .reduce((acc, a) => acc + diffHoras(a.hora_inicio, a.hora_fim), 0);

  // Montagens por equipe
  const porEquipe = useMemo(() => {
    const map = new Map<string, { nome: string; cor: string; count: number }>();
    agendamentos.forEach((a) => {
      const eq = a.equipes;
      if (!eq) return;
      const existing = map.get(eq.id);
      if (existing) {
        existing.count++;
      } else {
        map.set(eq.id, { nome: eq.nome, cor: eq.cor, count: 1 });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [agendamentos]);

  const maxCount = Math.max(...porEquipe.map((e) => e.count), 1);

  const cards = [
    {
      label: "Total Montagens",
      value: total,
      icon: BarChart3,
      color: "#1E6FBF",
    },
    {
      label: "Taxa de Conclusão",
      value: `${taxaConclusao}%`,
      icon: CheckCircle2,
      color: "#12B76A",
    },
    {
      label: "Retrabalhos",
      value: retrabalhos,
      icon: RotateCcw,
      color: "#E53935",
    },
    {
      label: "Horas Trabalhadas",
      value: horasTrabalhadas.toFixed(1) + "h",
      icon: Clock,
      color: "#E8A020",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: "#0D1117", margin: 0 }}>
        Dashboard - {format(mesAtual, "MMMM yyyy", { locale: ptBR })}
      </h3>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {cards.map((card) => (
          <div
            key={card.label}
            style={{
              borderRadius: 12,
              border: "0.5px solid #E8ECF2",
              borderTop: `3px solid ${card.color}`,
              padding: "16px 14px",
              background: "#fff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <card.icon size={14} color={card.color} />
              <span style={{ fontSize: 11, color: "#6B7A90", fontWeight: 500 }}>{card.label}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#0D1117" }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Mini bar chart */}
      <div
        style={{
          borderRadius: 12,
          border: "0.5px solid #E8ECF2",
          padding: "16px 14px",
          background: "#fff",
        }}
      >
        <span style={{ fontSize: 11, color: "#6B7A90", fontWeight: 500 }}>Montagens por Equipe</span>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {porEquipe.length === 0 && (
            <span style={{ fontSize: 13, color: "#6B7A90" }}>Nenhum dado no período</span>
          )}
          {porEquipe.map((eq) => (
            <div key={eq.nome} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "#0D1117", width: 90, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {eq.nome}
              </span>
              <div style={{ flex: 1, height: 18, background: "#F1F3F7", borderRadius: 4, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${(eq.count / maxCount) * 100}%`,
                    height: "100%",
                    background: eq.cor || "#1E6FBF",
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    paddingRight: 6,
                  }}
                >
                  <span style={{ fontSize: 10, color: "#fff", fontWeight: 600 }}>{eq.count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
