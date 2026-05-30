import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Clock, Users, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];
type LeadStatus = Database["public"]["Enums"]["lead_status"];

const ETAPAS_FUNIL: { id: LeadStatus; label: string; cor: string }[] = [
  { id: "novo", label: "Novo", cor: "#94A3B8" },
  { id: "atendimento", label: "Atendimento", cor: "#60A5FA" },
  { id: "qualificacao", label: "Qualificação", cor: "#818CF8" },
  { id: "visita", label: "Visita", cor: "#A78BFA" },
  { id: "medicao_agendada", label: "Medição Agendada", cor: "#C084FC" },
  { id: "proposta", label: "Proposta", cor: "#F472B6" },
  { id: "orcamento_enviado", label: "Orçamento Enviado", cor: "#FB923C" },
  { id: "negociacao", label: "Negociação", cor: "#FBBF24" },
  { id: "fechamento", label: "Fechamento", cor: "#34D399" },
  { id: "convertido", label: "Convertido", cor: "#10B981" },
];

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function daysDiff(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

export function FunilConversao() {
  const { perfil } = useAuth();
  const [periodo, setPeriodo] = useState<"semana" | "mes" | "trimestre" | "todos">("mes");
  const [vendedorFiltro, setVendedorFiltro] = useState<string>("todos");

  const { data: leads = [] } = useQuery({
    queryKey: ["leads-funil", perfil?.loja_id],
    enabled: !!perfil?.loja_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("data_entrada", { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
  });

  // Filtrar por período
  const leadsFiltrados = useMemo(() => {
    const agora = new Date();
    let dataLimite: Date;
    switch (periodo) {
      case "semana": dataLimite = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case "mes": dataLimite = new Date(agora.getFullYear(), agora.getMonth(), 1); break;
      case "trimestre": dataLimite = new Date(agora.getFullYear(), agora.getMonth() - 2, 1); break;
      default: dataLimite = new Date(2020, 0, 1);
    }
    let filtered = leads.filter(l => new Date(l.data_entrada) >= dataLimite);
    if (vendedorFiltro !== "todos") {
      filtered = filtered.filter(l => l.vendedor_id === vendedorFiltro);
    }
    return filtered;
  }, [leads, periodo, vendedorFiltro]);

  const vendedoresUnicos = useMemo(() =>
    Array.from(new Set(leads.map(l => l.vendedor_id).filter(Boolean) as string[])),
    [leads]
  );

  // Contar leads por etapa
  const contagens = useMemo(() => {
    const map: Record<string, number> = {};
    ETAPAS_FUNIL.forEach(e => { map[e.id] = 0; });
    map["perdido"] = 0;
    leadsFiltrados.forEach(l => {
      if (map[l.status] !== undefined) map[l.status]++;
      else map[l.status] = (map[l.status] || 0) + 1;
    });
    return map;
  }, [leadsFiltrados]);

  // Calcular conversão entre etapas
  const conversoes = useMemo(() => {
    const result: { de: string; para: string; taxa: number }[] = [];
    for (let i = 0; i < ETAPAS_FUNIL.length - 1; i++) {
      const atual = contagens[ETAPAS_FUNIL[i].id] || 0;
      // Soma de todos que passaram para etapas seguintes
      const seguintes = ETAPAS_FUNIL.slice(i + 1).reduce((s, e) => s + (contagens[e.id] || 0), 0);
      const taxa = atual + seguintes > 0 ? (seguintes / (atual + seguintes)) * 100 : 0;
      result.push({
        de: ETAPAS_FUNIL[i].label,
        para: ETAPAS_FUNIL[i + 1].label,
        taxa,
      });
    }
    return result;
  }, [contagens]);

  // Métricas gerais
  const totalLeads = leadsFiltrados.length;
  const convertidos = leadsFiltrados.filter(l => l.status === "convertido").length;
  const perdidos = leadsFiltrados.filter(l => l.status === "perdido").length;
  const taxaConversaoGeral = totalLeads > 0 ? (convertidos / totalLeads) * 100 : 0;
  const taxaPerda = totalLeads > 0 ? (perdidos / totalLeads) * 100 : 0;
  const valorPipeline = leadsFiltrados
    .filter(l => !["convertido", "perdido"].includes(l.status))
    .reduce((s, l) => s + (Number(l.valor_estimado) || 0), 0);

  // Tempo médio no funil (leads convertidos)
  const tempoMedio = useMemo(() => {
    const convertidosLeads = leadsFiltrados.filter(l => l.status === "convertido" && l.updated_at && l.data_entrada);
    if (convertidosLeads.length === 0) return 0;
    const total = convertidosLeads.reduce((s, l) => {
      return s + daysDiff(new Date(l.updated_at), new Date(l.data_entrada));
    }, 0);
    return Math.round(total / convertidosLeads.length);
  }, [leadsFiltrados]);

  // Motivos de perda
  const motivosPerda = useMemo(() => {
    const perdidosLeads = leadsFiltrados.filter(l => l.status === "perdido" && (l as any).motivo_perda);
    const map: Record<string, number> = {};
    perdidosLeads.forEach(l => {
      const motivo = ((l as any).motivo_perda || "Não informado").split(":")[0].trim();
      map[motivo] = (map[motivo] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [leadsFiltrados]);

  // Largura máxima para o funil visual
  const maxCount = Math.max(...ETAPAS_FUNIL.map(e => contagens[e.id] || 0), 1);

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={periodo} onValueChange={v => setPeriodo(v as any)}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="semana">Esta semana</SelectItem>
            <SelectItem value="mes">Este mês</SelectItem>
            <SelectItem value="trimestre">Trimestre</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={vendedorFiltro} onValueChange={setVendedorFiltro}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos vendedores</SelectItem>
            {vendedoresUnicos.map(v => <SelectItem key={v} value={v}>{v.slice(0, 8)}...</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="border-none shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <div><p className="text-[10px] text-slate-500 uppercase">Total Leads</p><p className="text-xl font-bold">{totalLeads}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <div><p className="text-[10px] text-slate-500 uppercase">Conversão</p><p className="text-xl font-bold text-green-600">{taxaConversaoGeral.toFixed(1)}%</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <div><p className="text-[10px] text-slate-500 uppercase">Perda</p><p className="text-xl font-bold text-red-600">{taxaPerda.toFixed(1)}%</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <div><p className="text-[10px] text-slate-500 uppercase">Tempo Médio</p><p className="text-xl font-bold">{tempoMedio} dias</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-500" />
              <div><p className="text-[10px] text-slate-500 uppercase">Pipeline</p><p className="text-xl font-bold">{fmtBRL(valorPipeline)}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funil Visual */}
      <Card className="border-none shadow-sm">
        <CardHeader><CardTitle className="text-base">Funil de Conversão</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {ETAPAS_FUNIL.map((etapa, idx) => {
              const count = contagens[etapa.id] || 0;
              const width = maxCount > 0 ? Math.max((count / maxCount) * 100, 8) : 8;
              const conversao = idx < conversoes.length ? conversoes[idx].taxa : null;

              return (
                <div key={etapa.id}>
                  <div className="flex items-center gap-3">
                    <div className="w-32 text-right">
                      <span className="text-xs font-medium text-slate-600">{etapa.label}</span>
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <div
                        className="h-8 rounded-md flex items-center px-3 transition-all"
                        style={{ width: `${width}%`, background: etapa.cor + "30", borderLeft: `3px solid ${etapa.cor}` }}
                      >
                        <span className="text-xs font-bold" style={{ color: etapa.cor }}>{count}</span>
                      </div>
                      {conversao !== null && conversao > 0 && (
                        <span className="text-[10px] text-slate-400">{conversao.toFixed(0)}% →</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {/* Perdidos */}
            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-dashed">
              <div className="w-32 text-right">
                <span className="text-xs font-medium text-red-500">Perdidos</span>
              </div>
              <div className="flex-1 flex items-center gap-2">
                <div
                  className="h-8 rounded-md flex items-center px-3"
                  style={{ width: `${maxCount > 0 ? Math.max((perdidos / maxCount) * 100, 8) : 8}%`, background: "#FEE2E230", borderLeft: "3px solid #EF4444" }}
                >
                  <span className="text-xs font-bold text-red-500">{perdidos}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Motivos de Perda */}
      {motivosPerda.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader><CardTitle className="text-base">Principais Motivos de Perda</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {motivosPerda.map(([motivo, count]) => {
                const pct = perdidos > 0 ? (count / perdidos) * 100 : 0;
                return (
                  <div key={motivo} className="flex items-center gap-3">
                    <div className="w-40 text-right"><span className="text-xs text-slate-600">{motivo}</span></div>
                    <div className="flex-1">
                      <div className="h-5 rounded bg-red-50 overflow-hidden">
                        <div className="h-full rounded bg-red-200" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-slate-600 w-12 text-right">{count} ({pct.toFixed(0)}%)</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}