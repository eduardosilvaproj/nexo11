import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layers, AlertTriangle, Package, Truck, Box, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

// Fase canonica unica do fluxo logistico (espelha a view vw_logistica_unificada)
type Fase =
  | "aguardando_fabrica"
  | "em_producao"
  | "recebendo"
  | "no_deposito"
  | "a_agendar"
  | "agendado"
  | "em_rota"
  | "entregue"
  | "reagendado"
  | "cancelado";

type Origem = "producao_terceirizada" | "entregas" | "expedicoes_almoxarifado";

interface LinhaUnificada {
  origem: Origem;
  origem_id: string;
  loja_id: string | null;
  contrato_id: string | null;
  cliente_nome: string | null;
  referencia: string | null;
  data_prevista: string | null;
  status_bruto: string | null;
  fase_canonica: Fase;
  qtd_prevista: number | null;
  qtd_concluida: number | null;
  concluido_em: string | null;
  created_at: string;
}

// Ordem do fluxo — usada para achar a "fase mais avancada" e ordenar
const FASE_ORDEM: Record<Fase, number> = {
  aguardando_fabrica: 1,
  em_producao: 2,
  recebendo: 3,
  no_deposito: 4,
  a_agendar: 5,
  agendado: 6,
  em_rota: 7,
  entregue: 8,
  reagendado: 6, // lateral, equivalente a agendado
  cancelado: 0,
};

const FASE_META: Record<Fase, { label: string; bg: string; fg: string }> = {
  aguardando_fabrica: { label: "Aguardando fabrica", bg: "#F1F5F9", fg: "#6B7A90" },
  em_producao: { label: "Em producao", bg: "#DBEAFE", fg: "#1E6FBF" },
  recebendo: { label: "Recebendo", bg: "#DBEAFE", fg: "#1E6FBF" },
  no_deposito: { label: "No deposito", bg: "#EDE9FE", fg: "#7C3AED" },
  a_agendar: { label: "A agendar", bg: "#FEF3C7", fg: "#B45309" },
  agendado: { label: "Agendado", bg: "#E6F3FF", fg: "#1E6FBF" },
  em_rota: { label: "Em rota", bg: "#FEEDD3", fg: "#C2701E" },
  entregue: { label: "Entregue", bg: "#D1FAE5", fg: "#05873C" },
  reagendado: { label: "Reagendado", bg: "#EDE9FE", fg: "#6D28D9" },
  cancelado: { label: "Cancelado", bg: "#F1F5F9", fg: "#94A3B8" },
};

const ORIGEM_META: Record<Origem, { label: string; icon: typeof Package }> = {
  producao_terceirizada: { label: "Recebimento", icon: Package },
  entregas: { label: "Agenda", icon: Truck },
  expedicoes_almoxarifado: { label: "Almoxarifado", icon: Box },
};

interface GrupoContrato {
  chave: string;
  cliente_nome: string;
  linhas: LinhaUnificada[];
  faseMax: Fase;
  // Grupo sem contrato real (recebimento avulso, ex.: PDF importado sem vinculo).
  // "Sem contrato" e um estado VALIDO de negocio, nao uma divergencia.
  semContrato: boolean;
  // Divergencia: recebimento ja no deposito mas sem entrega na agenda.
  // So faz sentido para grupos COM contrato — avulsos nunca geram entrega
  // (a tabela entregas exige contrato_id), entao nunca sao divergencia.
  semEntregaNaAgenda: boolean;
}

const normNome = (s: string | null) =>
  (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

function FaseBadge({ fase }: { fase: Fase }) {
  const m = FASE_META[fase] ?? FASE_META.aguardando_fabrica;
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5"
      style={{ backgroundColor: m.bg, color: m.fg, fontSize: 11, fontWeight: 500 }}
    >
      {m.label}
    </span>
  );
}

export function VisaoUnificadaTab() {
  const [busca, setBusca] = useState("");

  const { data: linhas, isLoading } = useQuery({
    queryKey: ["logistica-unificada"],
    queryFn: async () => {
      // View nao tipada no types gerado -> cast as any (mesmo padrao de vw_contratos_dre)
      const { data, error } = await (supabase as any)
        .from("vw_logistica_unificada")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LinhaUnificada[];
    },
  });

  const grupos = useMemo<GrupoContrato[]>(() => {
    if (!linhas) return [];
    const map = new Map<string, LinhaUnificada[]>();
    for (const l of linhas) {
      // Com contrato: agrupa pelo contrato_id (cruza as 3 trilhas).
      // Sem contrato: agrupa por cliente (normalizado) para nao explodir
      // em um card por pedido. Recebimentos avulsos legitimos caem aqui.
      const key = l.contrato_id
        ? `contrato:${l.contrato_id}`
        : `avulso:${l.loja_id ?? "-"}:${normNome(l.cliente_nome) || `${l.origem}:${l.origem_id}`}`;
      const arr = map.get(key) ?? [];
      arr.push(l);
      map.set(key, arr);
    }

    const result: GrupoContrato[] = [];
    for (const [key, arr] of map) {
      const semContrato = key.startsWith("avulso:");
      const faseMax = arr.reduce<Fase>((acc, l) => {
        return FASE_ORDEM[l.fase_canonica] > FASE_ORDEM[acc] ? l.fase_canonica : acc;
      }, "cancelado");

      const recebimentoNoDeposito = arr.some(
        (l) => l.origem === "producao_terceirizada" && (l.fase_canonica === "no_deposito")
      );
      const temEntrega = arr.some((l) => l.origem === "entregas");

      result.push({
        chave: key,
        cliente_nome: arr.find((l) => l.cliente_nome)?.cliente_nome ?? "—",
        linhas: arr.sort((a, b) => FASE_ORDEM[b.fase_canonica] - FASE_ORDEM[a.fase_canonica]),
        faseMax,
        semContrato,
        // Avulso nunca e divergencia: sem contrato_id, nao ha como existir entrega.
        semEntregaNaAgenda: !semContrato && recebimentoNoDeposito && !temEntrega,
      });
    }

    // Divergencias primeiro, depois por fase mais atrasada
    return result.sort((a, b) => {
      if (a.semEntregaNaAgenda !== b.semEntregaNaAgenda) return a.semEntregaNaAgenda ? -1 : 1;
      return FASE_ORDEM[a.faseMax] - FASE_ORDEM[b.faseMax];
    });
  }, [linhas]);

  const filtrados = useMemo(() => {
    if (!busca.trim()) return grupos;
    const q = busca.trim().toLowerCase();
    return grupos.filter(
      (g) =>
        g.cliente_nome.toLowerCase().includes(q) ||
        g.linhas.some((l) => (l.referencia ?? "").toLowerCase().includes(q))
    );
  }, [grupos, busca]);

  const metrics = useMemo(() => {
    const comContrato = grupos.filter((g) => !g.semContrato);
    return {
      contratos: comContrato.length,
      avulsos: grupos.filter((g) => g.semContrato).length,
      divergencias: grupos.filter((g) => g.semEntregaNaAgenda).length,
      emAndamento: comContrato.filter((g) => g.faseMax !== "entregue" && g.faseMax !== "cancelado").length,
    };
  }, [grupos]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white border border-[#E8ECF2] p-4">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4" style={{ color: "#1E6FBF" }} />
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0D1117" }}>Visao Unificada</h2>
        </div>
        <div style={{ fontSize: 12, color: "#6B7A90", marginTop: 2 }}>
          Consolida recebimento, agenda de entregas e almoxarifado por contrato (somente leitura).
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard label="Contratos no fluxo" value={metrics.contratos} color="#1E6FBF" />
        <MetricCard label="Em andamento" value={metrics.emAndamento} color="#E8A020" />
        <MetricCard label="Recebimentos avulsos" value={metrics.avulsos} color="#7C3AED" />
        <MetricCard label="Divergencias" value={metrics.divergencias} color="#DC2626" />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <Input
            className="pl-9"
            placeholder="Buscar por cliente ou pedido…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </div>

      {isLoading && (
        <div className="rounded-xl border border-[#E8ECF2] bg-white px-4 py-8 text-center text-sm text-muted-foreground">
          Carregando…
        </div>
      )}

      {!isLoading && filtrados.length === 0 && (
        <div className="rounded-xl border border-[#E8ECF2] bg-white px-4 py-8 text-center text-sm text-muted-foreground">
          Nenhum registro no fluxo logistico.
        </div>
      )}

      <div className="space-y-3">
        {filtrados.map((g) => (
          <div key={g.chave} className="rounded-xl border border-[#E8ECF2] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 14, fontWeight: 600, color: "#0D1117" }}>{g.cliente_nome}</span>
                <FaseBadge fase={g.faseMax} />
                {g.semContrato && (
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5"
                    style={{ backgroundColor: "#F1F5F9", color: "#6B7A90", fontSize: 11, fontWeight: 500 }}
                  >
                    Sem contrato
                  </span>
                )}
              </div>
              {g.semEntregaNaAgenda && (
                <div
                  className="flex items-center gap-1.5 rounded-md px-2 py-1"
                  style={{ backgroundColor: "#FEF2F2", color: "#B91C1C", fontSize: 11 }}
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  No deposito mas sem entrega na agenda
                </div>
              )}
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {(["producao_terceirizada", "entregas", "expedicoes_almoxarifado"] as Origem[]).map((origem) => {
                const linhasOrigem = g.linhas.filter((l) => l.origem === origem);
                const Meta = ORIGEM_META[origem];
                const Icon = Meta.icon;
                return (
                  <div key={origem} className="rounded-lg border border-[#F1F5F9] p-2.5">
                    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide" style={{ color: "#6B7A90" }}>
                      <Icon className="h-3 w-3" />
                      {Meta.label}
                    </div>
                    {linhasOrigem.length === 0 ? (
                      <div className="mt-1.5 text-xs text-muted-foreground">— sem registro</div>
                    ) : (
                      <div className="mt-1.5 space-y-1">
                        {linhasOrigem.map((l) => (
                          <div key={`${l.origem}-${l.origem_id}`} className="flex items-center justify-between gap-2">
                            <span className="text-xs text-[#0D1117] truncate">
                              {l.referencia ? `#${l.referencia}` : ""}
                              {l.qtd_prevista != null && (
                                <span className="text-muted-foreground">
                                  {" "}
                                  {l.qtd_concluida ?? 0}/{l.qtd_prevista}
                                </span>
                              )}
                            </span>
                            <FaseBadge fase={l.fase_canonica} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="rounded-xl bg-white p-5" style={{ border: "0.5px solid #E8ECF2", borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 11, color: "#6B7A90", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600, color: "#0D1117", marginTop: 6 }}>{value}</div>
    </div>
  );
}
