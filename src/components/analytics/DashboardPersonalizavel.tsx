import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Settings2, ChevronUp, ChevronDown, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SectionCard } from "./SectionCard";
import { Periodo, rangeFromPeriodo, fmtBRL, fmtPct } from "./shared";

type Props = { periodo: Periodo; lojaId: string };

type WidgetKey =
  | "faturamento_mes"
  | "contratos_fechados"
  | "nps_medio"
  | "margem_media"
  | "chamados_abertos"
  | "montagens_pendentes"
  | "entregas_semana"
  | "comissoes_pendentes";

type WidgetConfig = {
  key: WidgetKey;
  label: string;
  enabled: boolean;
};

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { key: "faturamento_mes", label: "Faturamento do mes", enabled: true },
  { key: "contratos_fechados", label: "Contratos fechados", enabled: true },
  { key: "nps_medio", label: "NPS medio", enabled: true },
  { key: "margem_media", label: "Margem media", enabled: true },
  { key: "chamados_abertos", label: "Chamados abertos", enabled: true },
  { key: "montagens_pendentes", label: "Montagens pendentes", enabled: true },
  { key: "entregas_semana", label: "Entregas da semana", enabled: false },
  { key: "comissoes_pendentes", label: "Comissoes pendentes", enabled: false },
];

function getStorageKey(userId: string) {
  return `nexo_dashboard_prefs_${userId}`;
}

function loadPrefs(userId: string): WidgetConfig[] {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw) as WidgetConfig[];
      // Merge with defaults in case new widgets were added
      const keys = new Set(parsed.map((w) => w.key));
      const merged = [...parsed];
      for (const dw of DEFAULT_WIDGETS) {
        if (!keys.has(dw.key)) merged.push(dw);
      }
      return merged;
    }
  } catch {}
  return DEFAULT_WIDGETS;
}

function savePrefs(userId: string, widgets: WidgetConfig[]) {
  localStorage.setItem(getStorageKey(userId), JSON.stringify(widgets));
}

type WidgetData = {
  faturamento_mes: { value: string; trend: number | null };
  contratos_fechados: { value: string; trend: number | null };
  nps_medio: { value: string; trend: number | null };
  margem_media: { value: string; trend: number | null };
  chamados_abertos: { value: string; trend: number | null };
  montagens_pendentes: { value: string; trend: number | null };
  entregas_semana: { value: string; trend: number | null };
  comissoes_pendentes: { value: string; trend: number | null };
};

async function fetchWidgetData(periodo: Periodo, lojaId: string): Promise<WidgetData> {
  const { start, end } = rangeFromPeriodo(periodo);
  const now = new Date();

  // Contratos
  let cQ = supabase
    .from("contratos")
    .select("id, valor_venda, status, data_criacao, loja_id")
    .gte("data_criacao", start.toISOString())
    .lt("data_criacao", end.toISOString())
    .neq("status", "cancelado");
  if (lojaId !== "all") cQ = cQ.eq("loja_id", lojaId);
  const { data: contratos } = await cQ;
  const list = contratos ?? [];

  const faturamento = list.reduce((s, c) => s + Number(c.valor_venda || 0), 0);
  const fechados = list.filter((c) => c.status === "finalizado").length;

  // Margem
  let mQ = (supabase as any)
    .from("vw_contratos_dre")
    .select("margem_realizada")
    .gte("data_criacao", start.toISOString())
    .lt("data_criacao", end.toISOString());
  if (lojaId !== "all") mQ = mQ.eq("loja_id", lojaId);
  const { data: margemData } = await mQ;
  const margens = (margemData ?? [])
    .map((r: any) => Number(r.margem_realizada))
    .filter((v: number) => Number.isFinite(v) && v !== 0);
  const margemMedia = margens.length ? margens.reduce((a: number, b: number) => a + b, 0) / margens.length : 0;

  // NPS
  const ids = list.map((c) => c.id).filter(Boolean) as string[];
  let nps: number | null = null;
  if (ids.length) {
    const { data: chamados } = await supabase
      .from("chamados_pos_venda")
      .select("nps")
      .in("contrato_id", ids)
      .not("nps", "is", null);
    const notas = (chamados ?? []).map((c: any) => Number(c.nps)).filter((n: number) => Number.isFinite(n));
    nps = notas.length ? notas.reduce((a: number, b: number) => a + b, 0) / notas.length : null;
  }

  // Chamados abertos
  let chQ = supabase
    .from("chamados_pos_venda")
    .select("id", { count: "exact", head: true })
    .eq("status", "aberto");
  if (lojaId !== "all") chQ = chQ.eq("loja_id", lojaId);
  const { count: chamadosAbertos } = await chQ;

  // Montagens pendentes
  let montQ = (supabase as any)
    .from("montagens")
    .select("id", { count: "exact", head: true })
    .in("status", ["pendente", "agendada"]);
  if (lojaId !== "all") montQ = montQ.eq("loja_id", lojaId);
  const { count: montagensPend } = await montQ;

  // Entregas da semana
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  let entQ = (supabase as any)
    .from("entregas")
    .select("id", { count: "exact", head: true })
    .gte("data_prevista", weekStart.toISOString().slice(0, 10))
    .lt("data_prevista", weekEnd.toISOString().slice(0, 10));
  if (lojaId !== "all") entQ = entQ.eq("loja_id", lojaId);
  const { count: entregasSemana } = await entQ;

  // Comissoes pendentes
  let comQ = (supabase as any)
    .from("comissoes")
    .select("id", { count: "exact", head: true })
    .eq("status", "pendente");
  if (lojaId !== "all") comQ = comQ.eq("loja_id", lojaId);
  const { count: comissoesPend } = await comQ;

  return {
    faturamento_mes: { value: fmtBRL(faturamento), trend: null },
    contratos_fechados: { value: String(fechados), trend: null },
    nps_medio: { value: nps != null ? nps.toFixed(1) : "—", trend: null },
    margem_media: { value: fmtPct(margemMedia), trend: null },
    chamados_abertos: { value: String(chamadosAbertos ?? 0), trend: null },
    montagens_pendentes: { value: String(montagensPend ?? 0), trend: null },
    entregas_semana: { value: String(entregasSemana ?? 0), trend: null },
    comissoes_pendentes: { value: String(comissoesPend ?? 0), trend: null },
  };
}

const WIDGET_COLORS: Record<WidgetKey, string> = {
  faturamento_mes: "#1E6FBF",
  contratos_fechados: "#534AB7",
  nps_medio: "#12B76A",
  margem_media: "#E8A020",
  chamados_abertos: "#E53935",
  montagens_pendentes: "#1E6FBF",
  entregas_semana: "#534AB7",
  comissoes_pendentes: "#E8A020",
};

export function DashboardPersonalizavel({ periodo, lojaId }: Props) {
  const { user } = useAuth();
  const userId = user?.id ?? "anon";

  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => loadPrefs(userId));
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    setWidgets(loadPrefs(userId));
  }, [userId]);

  const { data, isLoading } = useQuery({
    queryKey: ["analytics-dashboard-custom", periodo, lojaId],
    queryFn: () => fetchWidgetData(periodo, lojaId),
  });

  const persist = useCallback(
    (updated: WidgetConfig[]) => {
      setWidgets(updated);
      savePrefs(userId, updated);
    },
    [userId]
  );

  const toggleWidget = (key: WidgetKey) => {
    const updated = widgets.map((w) => (w.key === key ? { ...w, enabled: !w.enabled } : w));
    persist(updated);
  };

  const moveWidget = (index: number, direction: "up" | "down") => {
    const newIdx = direction === "up" ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= widgets.length) return;
    const updated = [...widgets];
    [updated[index], updated[newIdx]] = [updated[newIdx], updated[index]];
    persist(updated);
  };

  const enabledWidgets = widgets.filter((w) => w.enabled);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 style={{ fontSize: 15, fontWeight: 600, color: "#0D1117" }}>Meu Dashboard</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowConfig(!showConfig)}
          className="gap-2"
          style={{ borderColor: "#E8ECF2" }}
        >
          <Settings2 className="h-4 w-4" />
          {showConfig ? "Fechar" : "Personalizar"}
        </Button>
      </div>

      {/* Config panel */}
      {showConfig && (
        <SectionCard title="Configurar Widgets" description="Selecione e reordene os widgets exibidos">
          <div className="space-y-1">
            {widgets.map((w, i) => (
              <div
                key={w.key}
                className="flex items-center gap-2 py-1.5 px-2 rounded"
                style={{ background: w.enabled ? "rgba(30,111,191,0.04)" : "transparent" }}
              >
                <button
                  onClick={() => toggleWidget(w.key)}
                  className="flex items-center justify-center"
                  style={{ width: 20, height: 20 }}
                  aria-label={w.enabled ? "Desativar widget" : "Ativar widget"}
                >
                  {w.enabled ? (
                    <Eye className="h-4 w-4" style={{ color: "#1E6FBF" }} />
                  ) : (
                    <EyeOff className="h-4 w-4" style={{ color: "#6B7A90" }} />
                  )}
                </button>
                <span
                  className="flex-1"
                  style={{ fontSize: 13, color: w.enabled ? "#0D1117" : "#6B7A90" }}
                >
                  {w.label}
                </span>
                <button
                  onClick={() => moveWidget(i, "up")}
                  disabled={i === 0}
                  className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-30"
                  aria-label="Mover para cima"
                >
                  <ChevronUp className="h-3.5 w-3.5" style={{ color: "#6B7A90" }} />
                </button>
                <button
                  onClick={() => moveWidget(i, "down")}
                  disabled={i === widgets.length - 1}
                  className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-30"
                  aria-label="Mover para baixo"
                >
                  <ChevronDown className="h-3.5 w-3.5" style={{ color: "#6B7A90" }} />
                </button>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Widget grid */}
      {isLoading ? (
        <div style={{ fontSize: 13, color: "#6B7A90", padding: 20, textAlign: "center" }}>Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {enabledWidgets.map((w) => {
            const widgetData = data?.[w.key];
            const accent = WIDGET_COLORS[w.key];
            return (
              <div
                key={w.key}
                className="rounded-xl bg-white p-4"
                style={{ border: "0.5px solid #E8ECF2", borderTop: `3px solid ${accent}` }}
              >
                <p style={{ fontSize: 12, color: "#6B7A90" }}>{w.label}</p>
                <p style={{ fontSize: 22, fontWeight: 600, color: "#0D1117", marginTop: 6 }}>
                  {widgetData?.value ?? "—"}
                </p>
                {widgetData?.trend != null && (
                  <p style={{ fontSize: 12, color: widgetData.trend >= 0 ? "#12B76A" : "#E53935", marginTop: 4 }}>
                    {widgetData.trend >= 0 ? "▲" : "▼"} {Math.abs(widgetData.trend).toFixed(1)}%
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && enabledWidgets.length === 0 && (
        <div
          className="rounded-md px-4 py-8 text-center"
          style={{ background: "#F8FAFC", border: "1px dashed #CBD5E1", fontSize: 13, color: "#64748B" }}
        >
          Nenhum widget selecionado. Clique em "Personalizar" para escolher.
        </div>
      )}
    </div>
  );
}
