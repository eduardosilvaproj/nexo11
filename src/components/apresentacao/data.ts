import {
  Briefcase, FileSignature, Ruler, Factory, Truck, Hammer,
  HeadphonesIcon, Wallet, ShoppingCart, Users2, Users, BarChart3,
} from "lucide-react";

export type ModuloApresentacao = {
  slug: string;
  rota: string;
  titulo: string;
  descricao: string;
  features: string[];
  icon: typeof Briefcase;
  cor: "blue" | "green";
};

export const MODULOS: ModuloApresentacao[] = [
  {
    slug: "comercial", rota: "/comercial", titulo: "Comercial",
    descricao: "Funil de vendas completo, do primeiro contato ao fechamento, com previsibilidade real de receita.",
    features: ["Pipeline Kanban", "Gestão de Leads", "Forecast", "Ranking de Vendedores"],
    icon: Briefcase, cor: "blue",
  },
  {
    slug: "contratos", rota: "/contratos", titulo: "Contratos",
    descricao: "Contratos digitais com importação de XML Promob, fluxo de aprovação e timeline auditável.",
    features: ["Contratos digitais", "XML Promob", "Aprovação", "Timeline"],
    icon: FileSignature, cor: "green",
  },
  {
    slug: "tecnico", rota: "/tecnico", titulo: "Técnico",
    descricao: "Agenda de medições, checklist de campo e conferência detalhada antes da produção.",
    features: ["Agenda", "Medições", "Checklist", "Conferência"],
    icon: Ruler, cor: "blue",
  },
  {
    slug: "producao", rota: "/producao", titulo: "Produção",
    descricao: "Kanban da fábrica com controle de terceirização, volumes e rastreabilidade ponta a ponta.",
    features: ["Kanban", "Terceirização", "Controle de volumes", "Rastreabilidade"],
    icon: Factory, cor: "green",
  },
  {
    slug: "logistica", rota: "/logistica", titulo: "Logística",
    descricao: "Agenda de entregas, roteirização inteligente, romaneios e controle de expedição.",
    features: ["Agenda", "Rotas", "Romaneios", "Expedição"],
    icon: Truck, cor: "blue",
  },
  {
    slug: "montagem", rota: "/montagem", titulo: "Montagem",
    descricao: "Agenda de equipes, ocorrências em tempo real, fotos do campo e indicadores de produtividade.",
    features: ["Agenda de equipes", "Ocorrências", "Fotos", "Produtividade"],
    icon: Hammer, cor: "green",
  },
  {
    slug: "pos-venda", rota: "/pos-venda", titulo: "Pós-venda",
    descricao: "Chamados com SLA, pesquisa de NPS automatizada e workflows configuráveis por tipo de ocorrência.",
    features: ["Chamados", "SLA", "NPS", "Workflow"],
    icon: HeadphonesIcon, cor: "blue",
  },
  {
    slug: "comissoes", rota: "/comissoes", titulo: "Comissões",
    descricao: "Regras flexíveis por papel, cálculo automático e relatórios para fechamento sem dor de cabeça.",
    features: ["Regras por papel", "Cálculo automático", "Relatórios", "Histórico"],
    icon: Wallet, cor: "green",
  },
  {
    slug: "compras", rota: "/compras", titulo: "Compras",
    descricao: "Cotações com fornecedores, ordens de compra e controle de estoque mínimo integrado ao contrato.",
    features: ["Cotações", "Ordens de Compra", "Fornecedores", "Estoque mínimo"],
    icon: ShoppingCart, cor: "blue",
  },
  {
    slug: "rh", rota: "/rh", titulo: "RH",
    descricao: "Funcionários, escalas, ausências, onboarding, avaliação de desempenho e documentos centralizados.",
    features: ["Escalas", "Ausências", "Onboarding", "Documentos"],
    icon: Users, cor: "green",
  },
  {
    slug: "equipe", rota: "/equipe", titulo: "Equipe",
    descricao: "Organograma vivo, metas e OKRs, mural de avisos e gamificação para engajar o time.",
    features: ["Organograma", "Metas / OKRs", "Mural", "Gamificação"],
    icon: Users2, cor: "blue",
  },
  {
    slug: "analytics", rota: "/analytics", titulo: "Analytics",
    descricao: "Dashboards configuráveis, forecast de faturamento e indicadores de performance por loja.",
    features: ["Dashboards", "Forecast", "KPIs por loja", "Exportação"],
    icon: BarChart3, cor: "green",
  },
];
