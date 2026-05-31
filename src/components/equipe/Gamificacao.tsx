import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Trophy,
  Medal,
  Star,
  Clock,
  Target,
  Users,
  Zap,
  Award,
  Crown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type GamificacaoRow = {
  id: string;
  pessoa_id: string;
  pontos: number;
  badges: BadgeItem[];
  mes_referencia: string;
};

type BadgeItem = {
  key: string;
  earned_at: string;
};

type Pessoa = {
  id: string;
  nome: string;
  avatar_url: string | null;
  data_admissao: string | null;
};

type RankingEntry = {
  pessoa: Pessoa;
  pontos: number;
  badges: BadgeItem[];
};

const BADGE_DEFINITIONS: Record<string, { icon: typeof Trophy; label: string; description: string; color: string }> = {
  pontual: { icon: Clock, label: "Pontual", description: "0 atrasos no mês", color: "#12B76A" },
  produtivo: { icon: Target, label: "Produtivo", description: "Acima da meta mensal", color: "#3B82F6" },
  colaborativo: { icon: Users, label: "Colaborativo", description: "Ajudou em 5+ montagens", color: "#8B5CF6" },
  veterano: { icon: Award, label: "Veterano", description: "1+ ano na empresa", color: "#F59E0B" },
  estrela: { icon: Star, label: "Estrela", description: "Melhor NPS do mês", color: "#EF4444" },
};

const POINTS_RULES = [
  { label: "Contrato fechado", points: 100 },
  { label: "Montagem concluída", points: 50 },
  { label: "Meta batida", points: 200 },
  { label: "Sem atrasos no mês", points: 75 },
  { label: "NPS positivo", points: 30 },
];

function getInitials(nome: string) {
  const parts = nome.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + second).toUpperCase() || "?";
}

function getCurrentMonthRef(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export function Gamificacao() {
  const { lojaId } = useAuth();
  const mesRef = getCurrentMonthRef();

  const { data: pessoas = [] } = useQuery({
    queryKey: ["gamificacao_pessoas", lojaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pessoas")
        .select("id, nome, avatar_url, data_admissao")
        .eq("loja_id", lojaId!)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as Pessoa[];
    },
    enabled: !!lojaId,
  });

  const { data: gamificacao = [], isLoading } = useQuery({
    queryKey: ["equipe_gamificacao", lojaId, mesRef],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("equipe_gamificacao")
        .select("*")
        .eq("loja_id", lojaId)
        .eq("mes_referencia", mesRef);
      if (error) throw error;
      return (data ?? []) as GamificacaoRow[];
    },
    enabled: !!lojaId,
  });

  // Build ranking
  const ranking: RankingEntry[] = gamificacao
    .map((g) => {
      const pessoa = pessoas.find((p) => p.id === g.pessoa_id);
      if (!pessoa) return null;
      return {
        pessoa,
        pontos: g.pontos,
        badges: Array.isArray(g.badges) ? g.badges : [],
      };
    })
    .filter(Boolean)
    .sort((a, b) => b!.pontos - a!.pontos) as RankingEntry[];

  const podiumColors = ["#F59E0B", "#9CA3AF", "#CD7F32"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Trophy size={18} style={{ color: "#F59E0B" }} />
        <h3 style={{ color: "#0D1117", fontSize: 16, fontWeight: 600 }}>Gamificacao</h3>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Ranking */}
        <div className="lg:col-span-2 space-y-3">
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#0D1117" }}>Ranking do Mes</h4>
          {isLoading ? (
            <p style={{ color: "#6B7A90", fontSize: 13 }}>Carregando...</p>
          ) : ranking.length === 0 ? (
            <p style={{ color: "#6B7A90", fontSize: 13 }}>Nenhum dado de gamificacao neste mes.</p>
          ) : (
            <div className="space-y-2">
              {ranking.map((entry, idx) => {
                const isTop3 = idx < 3;
                return (
                  <div
                    key={entry.pessoa.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2"
                    style={{
                      border: isTop3 ? `1px solid ${podiumColors[idx]}40` : "1px solid #E8ECF2",
                      background: isTop3 ? `${podiumColors[idx]}08` : "#fff",
                    }}
                  >
                    {/* Position */}
                    <div
                      className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                      style={{
                        background: isTop3 ? podiumColors[idx] : "#F1F2F4",
                        color: isTop3 ? "#fff" : "#6B7A90",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {idx === 0 ? <Crown size={14} /> : idx + 1}
                    </div>

                    {/* Avatar */}
                    <div
                      className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: "#E6F3FF", color: "#1E6FBF", fontSize: 11, fontWeight: 600 }}
                    >
                      {entry.pessoa.avatar_url ? (
                        <img src={entry.pessoa.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        getInitials(entry.pessoa.nome)
                      )}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className="truncate" style={{ fontSize: 13, fontWeight: 500, color: "#0D1117" }}>
                        {entry.pessoa.nome}
                      </p>
                    </div>

                    {/* Badges count */}
                    <div className="flex items-center gap-1" style={{ fontSize: 11, color: "#6B7A90" }}>
                      <Medal size={12} />
                      <span>{entry.badges.length}</span>
                    </div>

                    {/* Points */}
                    <div
                      className="shrink-0 font-semibold"
                      style={{ fontSize: 14, color: isTop3 ? podiumColors[idx] : "#0D1117" }}
                    >
                      {entry.pontos} pts
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar: Badges + Points rules */}
        <div className="space-y-6">
          {/* Badges */}
          <div className="space-y-3">
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#0D1117" }}>Conquistas</h4>
            <div className="space-y-2">
              {Object.entries(BADGE_DEFINITIONS).map(([key, def]) => {
                const Icon = def.icon;
                return (
                  <div
                    key={key}
                    className="flex items-center gap-2 rounded-md px-3 py-2"
                    style={{ border: "1px solid #E8ECF2", background: "#fff" }}
                  >
                    <div
                      className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: `${def.color}15`, color: def.color }}
                    >
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0">
                      <p style={{ fontSize: 12, fontWeight: 600, color: "#0D1117" }}>{def.label}</p>
                      <p style={{ fontSize: 10, color: "#6B7A90" }}>{def.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Points rules */}
          <div className="space-y-3">
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#0D1117" }}>Como ganhar pontos</h4>
            <div className="space-y-1.5">
              {POINTS_RULES.map((rule) => (
                <div
                  key={rule.label}
                  className="flex items-center justify-between rounded-md px-3 py-1.5"
                  style={{ background: "#F8F9FA" }}
                >
                  <span style={{ fontSize: 11, color: "#0D1117" }}>{rule.label}</span>
                  <Badge variant="secondary" style={{ fontSize: 10 }}>
                    <Zap size={10} className="mr-0.5" />+{rule.points}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
