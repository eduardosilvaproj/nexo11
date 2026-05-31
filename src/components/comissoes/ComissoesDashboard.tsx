import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface Props {
  mes: string; // YYYY-MM-01
  lojaId: string | null;
}

type RankingItem = {
  usuario_id: string;
  nome: string;
  total: number;
  contratos: number;
};

type MesEvolucao = {
  mes: string;
  label: string;
  total: number;
};

export function ComissoesDashboard({ mes, lojaId }: Props) {
  // Build date ranges for current month
  const { inicio, fim } = useMemo(() => {
    const [y, m] = mes.split("-").map(Number);
    const last = new Date(y, m, 0);
    const fimStr = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
    return { inicio: mes, fim: fimStr };
  }, [mes]);

  // Build last 6 months ranges
  const ultimos6 = useMemo(() => {
    const meses: { value: string; label: string; fim: string }[] = [];
    const MESES_LABEL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const [y, m] = mes.split("-").map(Number);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(y, m - 1 - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const fimStr = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
      meses.push({ value, label: `${MESES_LABEL[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`, fim: fimStr });
    }
    return meses;
  }, [mes]);

  // Previous month for comparison
  const mesPrev = useMemo(() => {
    const [y, m] = mes.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const fimStr = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
    return { inicio: value, fim: fimStr };
  }, [mes]);

  // Ranking query
  const { data: ranking = [] } = useQuery<RankingItem[]>({
    queryKey: ["comissoes-ranking", lojaId, mes],
    enabled: !!lojaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comissoes")
        .select("usuario_id, valor, contrato_id")
        .eq("loja_id", lojaId!)
        .gte("data_gatilho", `${inicio}T00:00:00`)
        .lte("data_gatilho", `${fim}T23:59:59`)
        .in("status", ["pendente", "liberada", "paga"]);
      if (error) throw error;
      const rows = data ?? [];
      if (!rows.length) return [];

      // Aggregate by user
      const map = new Map<string, { total: number; contratos: Set<string> }>();
      for (const r of rows) {
        const entry = map.get(r.usuario_id) ?? { total: 0, contratos: new Set() };
        entry.total += Number(r.valor ?? 0);
        entry.contratos.add(r.contrato_id);
        map.set(r.usuario_id, entry);
      }

      // Fetch names
      const userIds = Array.from(map.keys());
      const { data: usuarios } = await supabase
        .from("usuarios_publico")
        .select("id, nome")
        .in("id", userIds);
      const nomes = new Map((usuarios ?? []).map((u) => [u.id, u.nome ?? "—"]));

      const result: RankingItem[] = Array.from(map.entries()).map(([uid, v]) => ({
        usuario_id: uid,
        nome: nomes.get(uid) ?? "—",
        total: v.total,
        contratos: v.contratos.size,
      }));
      result.sort((a, b) => b.total - a.total);
      return result.slice(0, 10);
    },
  });

  // Evolution query (last 6 months)
  const { data: evolucao = [] } = useQuery<MesEvolucao[]>({
    queryKey: ["comissoes-evolucao", lojaId, mes],
    enabled: !!lojaId,
    queryFn: async () => {
      const primeiro = ultimos6[0];
      const ultimo = ultimos6[ultimos6.length - 1];
      const { data, error } = await supabase
        .from("comissoes")
        .select("valor, data_gatilho")
        .eq("loja_id", lojaId!)
        .eq("status", "paga")
        .gte("data_gatilho", `${primeiro.value}T00:00:00`)
        .lte("data_gatilho", `${ultimo.fim}T23:59:59`);
      if (error) throw error;
      const rows = data ?? [];

      return ultimos6.map((m) => {
        const total = rows
          .filter((r) => {
            const d = (r.data_gatilho ?? "").slice(0, 7);
            return d === m.value.slice(0, 7);
          })
          .reduce((s, r) => s + Number(r.valor ?? 0), 0);
        return { mes: m.value, label: m.label, total };
      });
    },
  });

  // Comparison: current vs previous month
  const { data: comparacao } = useQuery({
    queryKey: ["comissoes-comparacao", lojaId, mes],
    enabled: !!lojaId,
    queryFn: async () => {
      const [resCurr, resPrev] = await Promise.all([
        supabase
          .from("comissoes")
          .select("valor")
          .eq("loja_id", lojaId!)
          .in("status", ["pendente", "liberada", "paga"])
          .gte("data_gatilho", `${inicio}T00:00:00`)
          .lte("data_gatilho", `${fim}T23:59:59`),
        supabase
          .from("comissoes")
          .select("valor")
          .eq("loja_id", lojaId!)
          .in("status", ["pendente", "liberada", "paga"])
          .gte("data_gatilho", `${mesPrev.inicio}T00:00:00`)
          .lte("data_gatilho", `${mesPrev.fim}T23:59:59`),
      ]);
      const curr = (resCurr.data ?? []).reduce((s, r) => s + Number(r.valor ?? 0), 0);
      const prev = (resPrev.data ?? []).reduce((s, r) => s + Number(r.valor ?? 0), 0);
      const pct = prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0;
      return { curr, prev, pct };
    },
  });

  const maxEvolucao = Math.max(...evolucao.map((e) => e.total), 1);
  const PODIUM_COLORS = ["#D4AF37", "#A0A0A0", "#CD7F32"];

  return (
    <div className="space-y-6">
      {/* Period comparison */}
      {comparacao && (
        <div
          className="rounded-xl p-4"
          style={{ border: "0.5px solid #E8ECF2", borderTop: "3px solid #1E6FBF" }}
        >
          <p className="text-xs text-[#6B7A90]" style={{ fontSize: 11 }}>
            Comparativo com mês anterior
          </p>
          <div className="mt-2 flex items-center gap-4">
            <div>
              <p className="text-xs text-[#6B7A90]">Mês atual</p>
              <p className="text-xl font-medium tabular-nums" style={{ fontSize: 22, color: "#0D1117" }}>
                {fmtBRL(comparacao.curr)}
              </p>
            </div>
            <div className="text-[#6B7A90]">vs</div>
            <div>
              <p className="text-xs text-[#6B7A90]">Mês anterior</p>
              <p className="text-xl font-medium tabular-nums" style={{ fontSize: 22, color: "#6B7A90" }}>
                {fmtBRL(comparacao.prev)}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1">
              {comparacao.pct > 0 ? (
                <TrendingUp className="h-5 w-5" style={{ color: "#12B76A" }} />
              ) : comparacao.pct < 0 ? (
                <TrendingDown className="h-5 w-5" style={{ color: "#E53E3E" }} />
              ) : (
                <Minus className="h-5 w-5" style={{ color: "#6B7A90" }} />
              )}
              <span
                className="text-lg font-semibold tabular-nums"
                style={{
                  color: comparacao.pct > 0 ? "#12B76A" : comparacao.pct < 0 ? "#E53E3E" : "#6B7A90",
                }}
              >
                {comparacao.pct > 0 ? "+" : ""}
                {comparacao.pct.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Ranking */}
        <div
          className="rounded-xl p-4"
          style={{ border: "0.5px solid #E8ECF2", borderTop: "3px solid #D4AF37" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-4 w-4" style={{ color: "#D4AF37" }} />
            <h3 className="text-sm font-medium text-[#0D1117]">Ranking do mês</h3>
          </div>

          {ranking.length === 0 ? (
            <p className="text-xs text-[#6B7A90] py-6 text-center">Sem dados no período</p>
          ) : (
            <div className="space-y-2">
              {/* Podium top 3 */}
              <div className="flex items-end justify-center gap-3 pb-4" style={{ borderBottom: "1px solid #E8ECF2" }}>
                {ranking.slice(0, 3).map((r, i) => {
                  const heights = [80, 64, 52];
                  return (
                    <div key={r.usuario_id} className="flex flex-col items-center gap-1">
                      <span className="text-xs font-medium tabular-nums" style={{ color: "#0D1117" }}>
                        {fmtBRL(r.total)}
                      </span>
                      <div
                        className="w-14 rounded-t-md flex items-end justify-center pb-1"
                        style={{
                          height: heights[i],
                          background: PODIUM_COLORS[i],
                          opacity: 0.85,
                        }}
                      >
                        <span className="text-xs font-bold text-white">{i + 1}°</span>
                      </div>
                      <span className="text-xs text-[#0D1117] text-center max-w-[70px] truncate">
                        {r.nome.split(" ")[0]}
                      </span>
                      <span className="text-[10px] text-[#6B7A90]">
                        {r.contratos} contrato{r.contratos !== 1 ? "s" : ""}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Rest of ranking */}
              {ranking.slice(3).map((r, i) => (
                <div
                  key={r.usuario_id}
                  className="flex items-center gap-3 px-2 py-1.5 rounded"
                  style={{ background: i % 2 === 0 ? "#F5F7FA" : "transparent" }}
                >
                  <span className="text-xs font-medium text-[#6B7A90] w-5 text-right">
                    {i + 4}°
                  </span>
                  <span className="text-sm text-[#0D1117] flex-1 truncate">{r.nome}</span>
                  <span className="text-xs text-[#6B7A90] tabular-nums">
                    {r.contratos} ctr{r.contratos !== 1 ? "s" : ""}
                  </span>
                  <span className="text-sm font-medium tabular-nums text-[#0D1117]">
                    {fmtBRL(r.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Evolution chart */}
        <div
          className="rounded-xl p-4"
          style={{ border: "0.5px solid #E8ECF2", borderTop: "3px solid #1E6FBF" }}
        >
          <h3 className="text-sm font-medium text-[#0D1117] mb-4">
            Evolução — últimos 6 meses (pagas)
          </h3>

          {evolucao.length === 0 ? (
            <p className="text-xs text-[#6B7A90] py-6 text-center">Sem dados</p>
          ) : (
            <div className="flex items-end justify-between gap-2" style={{ height: 180 }}>
              {evolucao.map((e) => {
                const pct = maxEvolucao > 0 ? (e.total / maxEvolucao) * 100 : 0;
                const isCurrentMonth = e.mes === mes;
                return (
                  <div key={e.mes} className="flex flex-col items-center flex-1 gap-1">
                    <span className="text-[10px] tabular-nums text-[#6B7A90]">
                      {e.total > 0 ? fmtBRL(e.total) : "—"}
                    </span>
                    <div className="w-full flex justify-center" style={{ height: 130 }}>
                      <div
                        className="w-8 rounded-t-md transition-all"
                        style={{
                          height: `${Math.max(pct, 2)}%`,
                          background: isCurrentMonth ? "#1E6FBF" : "#B0C4DE",
                          alignSelf: "flex-end",
                        }}
                      />
                    </div>
                    <span
                      className="text-[10px] font-medium"
                      style={{ color: isCurrentMonth ? "#1E6FBF" : "#6B7A90" }}
                    >
                      {e.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
