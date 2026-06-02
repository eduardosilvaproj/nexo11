import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  UserPlus,
  FileText,
  DollarSign,
  BarChart3,
  MessageSquare,
  Ruler,
  CheckCircle2,
  ClipboardList,
  Smartphone,
  Hammer,
  Camera,
  AlertTriangle,
  Clock,
  Truck,
  Package,
  Map,
  Radio,
  TrendingUp,
  Store,
  BarChart2,
  LineChart,
} from "lucide-react";

interface ShortcutItem {
  id: string;
  label: string;
  icon: React.ElementType;
  route: string;
  gradient: string;
}

const VENDEDOR_SHORTCUTS: ShortcutItem[] = [
  { id: "novo-lead", label: "Novo Lead", icon: UserPlus, route: "/comercial", gradient: "from-blue-500/20 to-blue-600/10" },
  { id: "novo-contrato", label: "Novo Contrato", icon: FileText, route: "/contratos/novo", gradient: "from-indigo-500/20 to-indigo-600/10" },
  { id: "comissoes", label: "Minhas Comissões", icon: DollarSign, route: "/comissoes", gradient: "from-emerald-500/20 to-emerald-600/10" },
  { id: "pipeline", label: "Pipeline", icon: BarChart3, route: "/comercial", gradient: "from-violet-500/20 to-violet-600/10" },
  { id: "mensagens", label: "Mensagens", icon: MessageSquare, route: "/mensagens", gradient: "from-sky-500/20 to-sky-600/10" },
];

const TECNICO_SHORTCUTS: ShortcutItem[] = [
  { id: "agenda-medicoes", label: "Agenda Medições", icon: Ruler, route: "/tecnico", gradient: "from-orange-500/20 to-orange-600/10" },
  { id: "conferencias", label: "Conferências", icon: CheckCircle2, route: "/tecnico", gradient: "from-teal-500/20 to-teal-600/10" },
  { id: "checklist", label: "Checklist", icon: ClipboardList, route: "/tecnico", gradient: "from-cyan-500/20 to-cyan-600/10" },
  { id: "modo-campo", label: "Modo Campo", icon: Smartphone, route: "/modo-campo", gradient: "from-lime-500/20 to-lime-600/10" },
];

const MONTADOR_SHORTCUTS: ShortcutItem[] = [
  { id: "agenda-hoje", label: "Agenda Hoje", icon: Hammer, route: "/montagem", gradient: "from-amber-500/20 to-amber-600/10" },
  { id: "fotos-obra", label: "Fotos de Obra", icon: Camera, route: "/portal-funcionario", gradient: "from-rose-500/20 to-rose-600/10" },
  { id: "ocorrencias", label: "Ocorrências", icon: AlertTriangle, route: "/portal-funcionario", gradient: "from-red-500/20 to-red-600/10" },
  { id: "bater-ponto-m", label: "Bater Ponto", icon: Clock, route: "/portal-funcionario", gradient: "from-slate-500/20 to-slate-600/10" },
];

const LOGISTICA_SHORTCUTS: ShortcutItem[] = [
  { id: "entregas-hoje", label: "Entregas Hoje", icon: Truck, route: "/logistica", gradient: "from-blue-500/20 to-blue-600/10" },
  { id: "almoxarifado", label: "Almoxarifado", icon: Package, route: "/almoxarifado", gradient: "from-amber-500/20 to-amber-600/10" },
  { id: "mapa-log", label: "Mapa", icon: Map, route: "/mapa-operacoes", gradient: "from-green-500/20 to-green-600/10" },
  { id: "bater-ponto-l", label: "Bater Ponto", icon: Clock, route: "/portal-funcionario", gradient: "from-slate-500/20 to-slate-600/10" },
];

const GERENTE_SHORTCUTS: ShortcutItem[] = [
  { id: "radar-equipe", label: "Radar Equipe", icon: Radio, route: "/radar-equipe", gradient: "from-purple-500/20 to-purple-600/10" },
  { id: "analytics", label: "Analytics", icon: BarChart3, route: "/analytics", gradient: "from-blue-500/20 to-blue-600/10" },
  { id: "dre", label: "DRE", icon: TrendingUp, route: "/dre", gradient: "from-emerald-500/20 to-emerald-600/10" },
  { id: "mapa-op", label: "Mapa Operações", icon: Map, route: "/mapa-operacoes", gradient: "from-cyan-500/20 to-cyan-600/10" },
  { id: "feedbacks", label: "Feedbacks", icon: ClipboardList, route: "/feedback", gradient: "from-orange-500/20 to-orange-600/10" },
];

const FRANQUEADOR_SHORTCUTS: ShortcutItem[] = [
  { id: "lojas", label: "Lojas", icon: Store, route: "/lojas", gradient: "from-indigo-500/20 to-indigo-600/10" },
  { id: "benchmark", label: "Benchmark", icon: BarChart2, route: "/analytics", gradient: "from-violet-500/20 to-violet-600/10" },
  { id: "dre-geral", label: "DRE Geral", icon: TrendingUp, route: "/dre", gradient: "from-emerald-500/20 to-emerald-600/10" },
  { id: "radar-f", label: "Radar", icon: Radio, route: "/radar-equipe", gradient: "from-purple-500/20 to-purple-600/10" },
  { id: "indicadores", label: "Indicadores", icon: LineChart, route: "/indicadores", gradient: "from-sky-500/20 to-sky-600/10" },
];

function resolveShortcuts(funcoes: string[], roles: string[]): ShortcutItem[] {
  const tags = funcoes.length > 0 ? funcoes : roles;
  const lower = tags.map((t) => t.toLowerCase());

  if (lower.includes("vendedor")) return VENDEDOR_SHORTCUTS;
  if (lower.includes("tecnico") || lower.includes("medidor")) return TECNICO_SHORTCUTS;
  if (lower.includes("montador")) return MONTADOR_SHORTCUTS;
  if (lower.includes("logistico") || lower.includes("logistica")) return LOGISTICA_SHORTCUTS;
  if (lower.includes("gerente")) return GERENTE_SHORTCUTS;
  if (lower.includes("franqueador")) return FRANQUEADOR_SHORTCUTS;
  if (lower.includes("admin") || lower.includes("admin_master")) return GERENTE_SHORTCUTS;

  return GERENTE_SHORTCUTS;
}

export function QuickShortcuts() {
  const { perfil, roles } = useAuth();
  const navigate = useNavigate();

  // Fetch funcoes from pessoas table
  const { data: funcoes } = useQuery({
    queryKey: ["pessoa-funcoes", perfil?.id],
    enabled: !!perfil?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("pessoas")
        .select("funcoes")
        .eq("id", perfil!.id)
        .maybeSingle();
      return (data?.funcoes as string[]) ?? [];
    },
  });

  const shortcuts = useMemo(
    () => resolveShortcuts(funcoes ?? [], roles ?? []),
    [funcoes, roles]
  );

  return (
    <section className="w-full">
      <div className="mb-3">
        <h3
          className="text-sm font-semibold"
          style={{ color: "#0D1117" }}
        >
          Acesso Rápido
        </h3>
        <p className="text-[11px]" style={{ color: "#6B7A90" }}>
          Baseado na sua função
        </p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
        {shortcuts.map((shortcut) => (
          <button
            key={shortcut.id}
            onClick={() => navigate(shortcut.route)}
            className={`
              group flex-shrink-0 snap-start flex flex-col items-center justify-center
              min-w-[72px] w-[72px] h-[76px] rounded-xl
              bg-gradient-to-br ${shortcut.gradient}
              border border-[#E8ECF2]
              transition-all duration-200 ease-out
              hover:scale-105 hover:shadow-md hover:border-[#1E6FBF]/30
              active:scale-95
              cursor-pointer
            `}
          >
            <shortcut.icon
              className="w-[22px] h-[22px] mb-1.5 text-[#0D1117] group-hover:text-[#1E6FBF] transition-colors"
              strokeWidth={1.8}
            />
            <span
              className="text-[11px] font-semibold leading-tight text-center px-1"
              style={{ color: "#0D1117" }}
            >
              {shortcut.label}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
