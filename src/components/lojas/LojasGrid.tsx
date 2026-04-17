import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Props = { mes: string };

function monthRange(mes: string) {
  const [y, m] = mes.split("-").map(Number);
  return {
    inicio: new Date(y, m - 1, 1).toISOString(),
    fim: new Date(y, m, 1).toISOString(),
    pe_mes: new Date(y, m - 1, 1).toISOString().slice(0, 10),
  };
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const margemColor = (m: number | null) =>
  m == null ? "#0D1117" : m >= 25 ? "#12B76A" : m >= 15 ? "#E8A020" : "#D92D20";
const npsColor = (n: number | null) =>
  n == null ? "#0D1117" : n >= 8 ? "#12B76A" : n >= 6 ? "#E8A020" : "#D92D20";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export function LojasGrid({ mes }: Props) {
  const { inicio, fim } = monthRange(mes);

  const { data: lojas = [] } = useQuery({
    queryKey: ["lojas-grid", mes],
    queryFn: async () => {
      const { data: lojasData } = await supabase
        .from("lojas")
        .select("id, nome, cidade, franqueado_id")
        .order("nome");
      if (!lojasData?.length) return [];

      const ids = lojasData.map((l) => l.id);

      const [
        { data: dre },
        { data: ativos },
        { data: chamados },
        { data: pe },
        { data: parados },
        { data: margensBaixas },
        { data: chamadosAbertos },
        { data: roles },
      ] = await Promise.all([
        supabase
          .from("vw_contratos_dre")
          .select("loja_id, valor_venda, margem_realizada, nps:id")
          .gte("data_criacao", inicio)
          .lt("data_criacao", fim)
          .in("loja_id", ids),
        supabase
          .from("contratos")
          .select("loja_id")
          .in("loja_id", ids)
          .not("status", "in", "(finalizado)"),
        supabase
          .from("chamados_pos_venda")
          .select("nps, contrato_id, contratos!inner(loja_id)")
          .gte("data_abertura", inicio)
          .lt("data_abertura", fim)
          .not("nps", "is", null),
        supabase
          .from("vw_ponto_equilibrio")
          .select("loja_id, faturamento_realizado, pe_calculado")
          .gte("mes", inicio)
          .lt("mes", fim)
          .in("loja_id", ids),
        supabase
          .from("contratos")
          .select("loja_id")
          .in("loja_id", ids)
          .not("status", "in", "(finalizado)")
          .lt("updated_at", new Date(Date.now() - SEVEN_DAYS).toISOString()),
        supabase
          .from("vw_contratos_dre")
          .select("loja_id, margem_realizada, status")
          .in("loja_id", ids)
          .eq("status", "finalizado")
          .lt("margem_realizada", 15)
          .gte("data_criacao", inicio),
        supabase
          .from("chamados_pos_venda")
          .select("contrato_id, status, contratos!inner(loja_id)")
          .neq("status", "resolvido"),
        supabase
          .from("user_roles")
          .select("user_id, loja_id, role")
          .eq("role", "admin")
          .in("loja_id", ids),
      ]);

      // Map admin user_ids → nomes
      const adminIds = (roles ?? []).map((r: any) => r.user_id);
      const { data: usuarios } = adminIds.length
        ? await supabase.from("usuarios_publico").select("id, nome").in("id", adminIds)
        : { data: [] as any[] };
      const nomeById = new Map((usuarios ?? []).map((u: any) => [u.id, u.nome as string]));
      const adminByLoja = new Map<string, string>();
      (roles ?? []).forEach((r: any) => {
        if (r.loja_id && !adminByLoja.has(r.loja_id)) {
          adminByLoja.set(r.loja_id, nomeById.get(r.user_id) ?? "—");
        }
      });

      // Aggregations per loja
      const agg = new Map<
        string,
        {
          faturamento: number;
          sumMW: number;
          w: number;
          ativos: number;
          npsSum: number;
          npsCount: number;
          fat: number;
          pe: number;
          alertas: number;
        }
      >();
      const ensure = (id: string) => {
        if (!agg.has(id))
          agg.set(id, {
            faturamento: 0,
            sumMW: 0,
            w: 0,
            ativos: 0,
            npsSum: 0,
            npsCount: 0,
            fat: 0,
            pe: 0,
            alertas: 0,
          });
        return agg.get(id)!;
      };

      (dre ?? []).forEach((r: any) => {
        const b = ensure(r.loja_id);
        const v = Number(r.valor_venda ?? 0);
        b.faturamento += v;
        if (v > 0 && r.margem_realizada != null) {
          b.sumMW += Number(r.margem_realizada) * v;
          b.w += v;
        }
      });
      (ativos ?? []).forEach((r: any) => ensure(r.loja_id).ativos++);
      (chamados ?? []).forEach((r: any) => {
        const lid = r.contratos?.loja_id;
        if (!lid) return;
        const b = ensure(lid);
        b.npsSum += Number(r.nps);
        b.npsCount++;
      });
      (pe ?? []).forEach((r: any) => {
        const b = ensure(r.loja_id);
        b.fat = Number(r.faturamento_realizado ?? 0);
        b.pe = Number(r.pe_calculado ?? 0);
      });
      (parados ?? []).forEach((r: any) => ensure(r.loja_id).alertas++);
      (margensBaixas ?? []).forEach((r: any) => ensure(r.loja_id).alertas++);
      (chamadosAbertos ?? []).forEach((r: any) => {
        const lid = r.contratos?.loja_id;
        if (lid) ensure(lid).alertas++;
      });

      return lojasData.map((l) => {
        const a = agg.get(l.id) ?? {
          faturamento: 0,
          sumMW: 0,
          w: 0,
          ativos: 0,
          npsSum: 0,
          npsCount: 0,
          fat: 0,
          pe: 0,
          alertas: 0,
        };
        const peAtingido = a.pe > 0 ? (a.fat / a.pe) * 100 : 0;
        return {
          id: l.id,
          nome: l.nome,
          cidade: l.cidade ?? "",
          ativa: true,
          responsavel: adminByLoja.get(l.id) ?? "—",
          faturamento: a.faturamento,
          margem: a.w > 0 ? a.sumMW / a.w : null,
          ativos: a.ativos,
          nps: a.npsCount > 0 ? a.npsSum / a.npsCount : null,
          peAtingido,
          alertas: a.alertas,
        };
      });
    },
  });

  if (lojas.length === 0) {
    return (
      <div style={{ fontSize: 13, color: "#6B7A90", padding: 24, textAlign: "center" }}>
        Nenhuma loja cadastrada.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {lojas.map((l) => {
        const peColor = l.peAtingido < 70 ? "#E53935" : l.peAtingido < 100 ? "#1E6FBF" : "#12B76A";
        const peWidth = Math.min(100, l.peAtingido);
        return (
          <div
            key={l.id}
            style={{
              position: "relative",
              background: "#fff",
              border: "0.5px solid #E8ECF2",
              borderRadius: 12,
              padding: 20,
            }}
          >
            {l.alertas > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  background: "#E53935",
                  color: "#fff",
                  borderRadius: "50%",
                  width: 22,
                  height: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {l.alertas}
              </div>
            )}

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Store size={16} color="#1E6FBF" />
              <span style={{ fontSize: 15, fontWeight: 500, color: "#0D1117" }}>{l.nome}</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: l.ativa ? "#D1FADF" : "#E5E7EB",
                  color: l.ativa ? "#05873C" : "#6B7A90",
                }}
              >
                {l.ativa ? "Ativa" : "Inativa"}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "#6B7A90", marginTop: 2 }}>{l.cidade || "—"}</div>

            {/* Métricas 2x2 */}
            <div className="grid grid-cols-2 gap-4" style={{ marginTop: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: "#6B7A90" }}>Faturamento mês</div>
                <div style={{ fontSize: 18, fontWeight: 500, color: "#0D1117", marginTop: 2 }}>
                  {fmtBRL(l.faturamento)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#6B7A90" }}>Margem média</div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 500,
                    color: margemColor(l.margem),
                    marginTop: 2,
                  }}
                >
                  {l.margem != null ? `${l.margem.toFixed(1)}%` : "—"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#6B7A90" }}>Contratos ativos</div>
                <div style={{ fontSize: 18, fontWeight: 500, color: "#0D1117", marginTop: 2 }}>
                  {l.ativos}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#6B7A90" }}>NPS médio</div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 500,
                    color: npsColor(l.nps),
                    marginTop: 2,
                  }}
                >
                  {l.nps != null ? l.nps.toFixed(1) : "—"}
                </div>
              </div>
            </div>

            {/* Barra de PE */}
            <div style={{ marginTop: 16 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  color: "#6B7A90",
                  marginBottom: 4,
                }}
              >
                <span>{l.peAtingido.toFixed(0)}% do PE atingido</span>
              </div>
              <div
                style={{
                  height: 6,
                  background: "#E8ECF2",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${peWidth}%`,
                    height: "100%",
                    background: peColor,
                    transition: "width 200ms",
                  }}
                />
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                marginTop: 16,
                paddingTop: 12,
                borderTop: "1px solid #EEF1F5",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 12, color: "#6B7A90" }}>
                Responsável: <span style={{ color: "#0D1117" }}>{l.responsavel}</span>
              </span>
              <Link
                to={`/lojas/${l.id}`}
                style={{ fontSize: 13, fontWeight: 500, color: "#1E6FBF" }}
              >
                Ver detalhes →
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
