import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  CalendarDays,
  Clock,
  CalendarOff,
  Megaphone,
  Target,
  Trophy,
  DollarSign,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function PortalInicio() {
  const { user, perfil } = useAuth();
  const pessoaId = perfil?.id;
  const { start, end } = getMonthRange();

  // Dias trabalhados e horas totais
  const { data: pontoData } = useQuery({
    queryKey: ["portal-ponto-resumo", pessoaId, start],
    enabled: !!pessoaId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("registros_ponto")
        .select("*")
        .eq("usuario_id", pessoaId)
        .gte("registrado_em", start)
        .lte("registrado_em", end)
        .order("registrado_em", { ascending: true });
      return data || [];
    },
  });

  const diasTrabalhados = new Set(
    (pontoData || []).map((r: any) =>
      new Date(r.registrado_em).toLocaleDateString("pt-BR")
    )
  ).size;

  const horasTotais = (() => {
    const registros = pontoData || [];
    let total = 0;
    for (let i = 0; i < registros.length - 1; i += 2) {
      if (registros[i].tipo === "entrada" && registros[i + 1]?.tipo === "saida") {
        total +=
          new Date(registros[i + 1].registrado_em).getTime() -
          new Date(registros[i].registrado_em).getTime();
      }
    }
    return Math.floor(total / 3600000);
  })();

  // Avisos
  const { data: avisos } = useQuery({
    queryKey: ["portal-avisos", pessoaId],
    enabled: !!pessoaId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("equipe_avisos")
        .select("*")
        .order("criado_em", { ascending: false })
        .limit(3);
      return data || [];
    },
  });

  // Metas
  const { data: metas } = useQuery({
    queryKey: ["portal-metas", pessoaId],
    enabled: !!pessoaId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("equipe_metas")
        .select("*")
        .eq("pessoa_id", pessoaId)
        .order("criado_em", { ascending: false })
        .limit(3);
      return data || [];
    },
  });

  // Gamificacao
  const { data: gamificacao } = useQuery({
    queryKey: ["portal-gamificacao", pessoaId],
    enabled: !!pessoaId,
    queryFn: async () => {
      const mesRef = new Date().toISOString().slice(0, 7);
      const { data } = await (supabase as any)
        .from("equipe_gamificacao")
        .select("*")
        .eq("pessoa_id", pessoaId)
        .eq("mes_referencia", mesRef)
        .maybeSingle();
      return data;
    },
  });

  // Comissoes
  const { data: comissoes } = useQuery({
    queryKey: ["portal-comissoes", pessoaId, start],
    enabled: !!pessoaId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("comissoes")
        .select("*")
        .eq("pessoa_id", pessoaId)
        .gte("created_at", start)
        .lte("created_at", end);
      return data || [];
    },
  });

  const comissaoPendente = (comissoes || [])
    .filter((c: any) => c.status === "pendente")
    .reduce((acc: number, c: any) => acc + (c.valor || 0), 0);
  const comissaoPaga = (comissoes || [])
    .filter((c: any) => c.status === "pago")
    .reduce((acc: number, c: any) => acc + (c.valor || 0), 0);

  // Avaliacao
  const { data: avaliacao } = useQuery({
    queryKey: ["portal-avaliacao", pessoaId],
    enabled: !!pessoaId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("rh_avaliacoes")
        .select("*")
        .eq("pessoa_id", pessoaId)
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  return (
    <div className="space-y-4 pb-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={CalendarDays}
          label="Dias trabalhados"
          value={String(diasTrabalhados)}
          color="#1E6FBF"
        />
        <StatCard
          icon={Clock}
          label="Horas totais"
          value={`${horasTotais}h`}
          color="#12B76A"
        />
        <StatCard
          icon={CalendarOff}
          label="Próx. folga"
          value="--"
          color="#E8A020"
        />
      </div>

      {/* Mural de Avisos */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Megaphone className="h-4 w-4" style={{ color: "#1E6FBF" }} />
          <h3 className="text-sm font-semibold" style={{ color: "#0D1117" }}>
            Mural de Avisos
          </h3>
        </div>
        <div className="space-y-2">
          {(avisos || []).length === 0 && (
            <p className="text-xs" style={{ color: "#6B7A90" }}>
              Nenhum aviso recente.
            </p>
          )}
          {(avisos || []).map((aviso: any) => (
            <div
              key={aviso.id}
              className="rounded-2xl bg-white p-3"
              style={{ border: "0.5px solid #E8ECF2" }}
            >
              <div className="flex items-start justify-between">
                <p className="text-sm font-medium" style={{ color: "#0D1117" }}>
                  {aviso.titulo}
                </p>
                {isNew(aviso.criado_em) && (
                  <Badge className="text-[10px] bg-[#1E6FBF] text-white">novo</Badge>
                )}
              </div>
              <p className="text-xs mt-1" style={{ color: "#6B7A90" }}>
                {aviso.conteudo?.slice(0, 80)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Metas */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-4 w-4" style={{ color: "#1E6FBF" }} />
          <h3 className="text-sm font-semibold" style={{ color: "#0D1117" }}>
            Minhas Metas
          </h3>
        </div>
        <div className="space-y-2">
          {(metas || []).length === 0 && (
            <p className="text-xs" style={{ color: "#6B7A90" }}>
              Nenhuma meta definida.
            </p>
          )}
          {(metas || []).map((meta: any) => {
            const pct = meta.meta_valor
              ? Math.min(100, Math.round(((meta.valor_atual || 0) / meta.meta_valor) * 100))
              : 0;
            return (
              <div
                key={meta.id}
                className="rounded-2xl bg-white p-3"
                style={{ border: "0.5px solid #E8ECF2" }}
              >
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xs font-medium" style={{ color: "#0D1117" }}>
                    {meta.titulo || meta.descricao}
                  </p>
                  <span className="text-xs font-semibold" style={{ color: "#1E6FBF" }}>
                    {pct}%
                  </span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>
            );
          })}
        </div>
      </section>

      {/* Gamificacao */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="h-4 w-4" style={{ color: "#E8A020" }} />
          <h3 className="text-sm font-semibold" style={{ color: "#0D1117" }}>
            Meus Pontos & Badges
          </h3>
        </div>
        <div
          className="rounded-2xl bg-white p-3"
          style={{ border: "0.5px solid #E8ECF2" }}
        >
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: "#1E6FBF" }}>
                {gamificacao?.pontos || 0}
              </p>
              <p className="text-[10px]" style={{ color: "#6B7A90" }}>
                pontos
              </p>
            </div>
            <div className="flex gap-1 flex-wrap">
              {(gamificacao?.badges || []).map((b: any, i: number) => (
                <Badge key={i} variant="secondary" className="text-[10px]">
                  {b.key}
                </Badge>
              ))}
              {(!gamificacao?.badges || gamificacao.badges.length === 0) && (
                <p className="text-xs" style={{ color: "#6B7A90" }}>
                  Nenhum badge ainda
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Comissoes */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="h-4 w-4" style={{ color: "#12B76A" }} />
          <h3 className="text-sm font-semibold" style={{ color: "#0D1117" }}>
            Comissões do Mês
          </h3>
        </div>
        <div
          className="rounded-2xl bg-white p-3"
          style={{ border: "0.5px solid #E8ECF2" }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px]" style={{ color: "#6B7A90" }}>
                Pendente
              </p>
              <p className="text-lg font-bold" style={{ color: "#E8A020" }}>
                {formatCurrency(comissaoPendente)}
              </p>
            </div>
            <div>
              <p className="text-[10px]" style={{ color: "#6B7A90" }}>
                Pago
              </p>
              <p className="text-lg font-bold" style={{ color: "#12B76A" }}>
                {formatCurrency(comissaoPaga)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Avaliacao */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Star className="h-4 w-4" style={{ color: "#F59E0B" }} />
          <h3 className="text-sm font-semibold" style={{ color: "#0D1117" }}>
            Última Avaliação
          </h3>
        </div>
        <div
          className="rounded-2xl bg-white p-3"
          style={{ border: "0.5px solid #E8ECF2" }}
        >
          {avaliacao ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold" style={{ color: "#0D1117" }}>
                  {avaliacao.nota_geral || avaliacao.nota || "--"}/10
                </p>
                <p className="text-[10px]" style={{ color: "#6B7A90" }}>
                  nota geral
                </p>
              </div>
              <Badge
                className="text-xs"
                variant={avaliacao.status === "concluida" ? "default" : "secondary"}
              >
                {avaliacao.status || "pendente"}
              </Badge>
            </div>
          ) : (
            <p className="text-xs" style={{ color: "#6B7A90" }}>
              Nenhuma avaliação registrada.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="rounded-2xl bg-white p-3 text-center"
      style={{ border: "0.5px solid #E8ECF2" }}
    >
      <Icon className="h-5 w-5 mx-auto mb-1" style={{ color }} />
      <p className="text-lg font-bold" style={{ color: "#0D1117" }}>
        {value}
      </p>
      <p className="text-[10px]" style={{ color: "#6B7A90" }}>
        {label}
      </p>
    </div>
  );
}

function isNew(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  return diff < 48 * 60 * 60 * 1000; // 48h
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
