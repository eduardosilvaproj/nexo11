import type { RouteConfig } from "./types";

export const VENDEDOR_ROUTES: RouteConfig[] = [
  {
    path: "/mobile/vendedor",
    element: "DashboardVendedor",
    label: "Início",
    icon: "LayoutDashboard",
    badge: undefined,
  },
  {
    path: "/mobile/vendedor/leads",
    element: "LeadsVendedor",
    label: "Meus Leads",
    icon: "Users",
    badge: "count",
  },
  {
    path: "/mobile/vendedor/contratos",
    element: "ContratosVendedor",
    label: "Contratos",
    icon: "FileText",
    badge: undefined,
  },
  {
    path: "/mobile/vendedor/metas",
    element: "MetasVendedor",
    label: "Metas",
    icon: "Target",
    badge: undefined,
  },
  {
    path: "/mobile/vendedor/chat",
    element: "ChatVendedor",
    label: "Chat",
    icon: "MessageCircle",
    badge: "unread",
  },
];

export const MEDIDOR_ROUTES: RouteConfig[] = [
  {
    path: "/mobile/medidor",
    element: "DashboardMedidor",
    label: "Início",
    icon: "LayoutDashboard",
    badge: undefined,
  },
  {
    path: "/mobile/medidor/andamentos",
    element: "AndamentosMedidor",
    label: "Andamentos",
    icon: "ClipboardList",
    badge: "count",
  },
  {
    path: "/mobile/medidor/valores",
    element: "ValoresMedidor",
    label: "Valores",
    icon: "DollarSign",
    badge: undefined,
  },
  {
    path: "/mobile/medidor/historico",
    element: "HistoricoMedidor",
    label: "Histórico",
    icon: "Clock",
    badge: undefined,
  },
];

export const CONFERENTE_ROUTES: RouteConfig[] = [
  {
    path: "/mobile/conferente",
    element: "DashboardConferente",
    label: "Início",
    icon: "LayoutDashboard",
    badge: undefined,
  },
  {
    path: "/mobile/conferente/andamentos",
    element: "AndamentosConferente",
    label: "Conferências",
    icon: "ClipboardCheck",
    badge: "count",
  },
  {
    path: "/mobile/conferente/historico",
    element: "HistoricoConferente",
    label: "Histórico",
    icon: "Clock",
    badge: undefined,
  },
];

export const MONTADOR_ROUTES: RouteConfig[] = [
  {
    path: "/mobile/montador",
    element: "DashboardMontador",
    label: "Início",
    icon: "LayoutDashboard",
    badge: undefined,
  },
  {
    path: "/mobile/montador/ordens",
    element: "OrdensMontador",
    label: "Ordens",
    icon: "ClipboardList",
    badge: "count",
  },
  {
    path: "/mobile/montador/guias",
    element: "GuiasMontador",
    label: "Guias",
    icon: "BookOpen",
    badge: undefined,
  },
  {
    path: "/mobile/montador/fotos",
    element: "FotosMontador",
    label: "Fotos",
    icon: "Camera",
    badge: undefined,
  },
  {
    path: "/mobile/montador/agenda",
    element: "AgendaMontador",
    label: "Agenda",
    icon: "Calendar",
    badge: undefined,
  },
  {
    path: "/mobile/montador/solicitacoes",
    element: "SolicitacoesMontador",
    label: "Solicitações",
    icon: "Send",
    badge: undefined,
  },
];

export const ENTREGUE_ROUTES: RouteConfig[] = [
  {
    path: "/mobile/entregue",
    element: "DashboardEntregue",
    label: "Início",
    icon: "LayoutDashboard",
    badge: undefined,
  },
  {
    path: "/mobile/entregue/agenda",
    element: "AgendaEntregue",
    label: "Agenda",
    icon: "Calendar",
    badge: "count",
  },
  {
    path: "/mobile/entregue/romaneio",
    element: "RomaneioEntregue",
    label: "Romaneio",
    icon: "Truck",
    badge: undefined,
  },
  {
    path: "/mobile/entregue/itens",
    element: "ItensEntregue",
    label: "Itens",
    icon: "Package",
    badge: undefined,
  },
];

export const ADMIN_ROUTES: RouteConfig[] = [
  {
    path: "/mobile/admin",
    element: "DashboardAdmin",
    label: "Início",
    icon: "LayoutDashboard",
    badge: undefined,
  },
  {
    path: "/mobile/admin/agenda",
    element: "AgendaAdmin",
    label: "Agenda",
    icon: "Calendar",
    badge: "count",
  },
  {
    path: "/mobile/admin/resumo",
    element: "ResumoAdmin",
    label: "Resumo",
    icon: "BarChart3",
    badge: undefined,
  },
];