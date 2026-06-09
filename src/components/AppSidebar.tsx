import { NavLink, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  LayoutDashboard,
  Users,
  UserRound,
  ClipboardCheck,
  Factory,
  Truck,
  Wrench,
  HeadphonesIcon,
  TrendingUp,
  DollarSign,
  Percent,
  ShoppingCart,
  UserCog,
  Building2,
  Users2,
  BarChart3,
  Plug,
  Settings,
  LogOut,
  MessageSquare,
  FileText,
  Car,
  Package,
  Zap,
  Radio,
  Activity,
  Gauge,
  Map,
  Bell,
  HelpCircle,
  UploadCloud,
  Calculator,
  Home,
  Briefcase,
  Search,
  Star,
  ChevronDown,
  HardHat,
  Boxes,
  Receipt,
  Wallet,
  Handshake,
  LineChart,
  Sparkles,
  MessageCircle,
  Send,
  Pin,
  X,
  Command,
  Keyboard,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogoNexo } from "@/components/LogoNexo";
import { Input } from "@/components/ui/input";
import { CommandPalette } from "@/components/CommandPalette";
import { HelpModal } from "@/components/HelpModal";
import {
  useFavorites,
  useOpenGroups,
  useKeyboardShortcuts,
  navigateShortcut,
} from "@/hooks/useSidebarShortcuts";

type AppRole = Database["public"]["Enums"]["app_role"];

type MenuItem = {
  title: string;
  url: string;
  icon: any;
  roles?: AppRole[];
  badge?: "messages" | "contracts";
  description?: string;
};

type MenuGroup = {
  id: string;
  title: string;
  icon: any;
  items: MenuItem[];
  defaultOpen?: boolean;
};

// ============================================
// MENU REORGANIZADO — 4 ETAPAS
// ============================================

// ⭐ FAVORITOS (fixos por padrão, usuário pode adicionar mais)
const favoritosFixos: MenuItem[] = [
  { title: "Dashboard", url: "/", icon: Home, description: "Visão geral" },
  { title: "Contratos", url: "/contratos", icon: FileText, description: "Todos os contratos", badge: "contracts" },
  { title: "Mensagens", url: "/mensagens", icon: MessageCircle, description: "Chat com clientes", badge: "messages" },
];

// 📊 VENDAS & PROJETOS
const vendas: MenuItem[] = [
  { title: "Comercial", url: "/comercial", icon: Briefcase, description: "Leads e oportunidades" },
  { title: "Clientes", url: "/clientes", icon: UserRound, description: "Base de clientes" },
  { title: "Estimativa", url: "/estimativa-orcamento", icon: Calculator, description: "Orçamentos rápidos" },
];

// 🏭 OPERAÇÃO & PRODUÇÃO
const operacao: MenuItem[] = [
  { title: "Técnico", url: "/tecnico", icon: ClipboardCheck, roles: ["admin", "gerente", "tecnico", "franqueador"], description: "Medições e projetos" },
  { title: "Produção", url: "/producao", icon: Factory, roles: ["admin", "gerente", "tecnico", "franqueador"], description: "Ordens de fabricação" },
  { title: "Almoxarifado", url: "/almoxarifado", icon: Boxes, roles: ["admin", "gerente", "franqueador"], description: "Estoque e materiais" },
  { title: "Frota", url: "/frota", icon: Car, roles: ["admin", "gerente", "franqueador"], description: "Veículos e rotas" },
];

// 🚚 LOGÍSTICA & PÓS-VENDA
const logistica: MenuItem[] = [
  { title: "Logística", url: "/logistica", icon: Truck, roles: ["admin", "gerente", "franqueador"], description: "Entregas" },
  { title: "Montagem", url: "/montagem", icon: HardHat, roles: ["admin", "gerente", "montador", "franqueador"], description: "Equipes de montagem" },
  { title: "Pós-venda", url: "/pos-venda", icon: HeadphonesIcon, description: "NPS e assistências" },
];

// 💰 FINANCEIRO
const financeiro: MenuItem[] = [
  { title: "Financeiro", url: "/financeiro", icon: Wallet, description: "Contas e fluxo" },
  { title: "DRE", url: "/dre", icon: LineChart, roles: ["admin", "gerente", "franqueador"], description: "DRE gerencial" },
  { title: "Comissões", url: "/comissoes", icon: Percent, description: "Cálculo de comissões" },
  { title: "Compras", url: "/compras", icon: ShoppingCart, description: "Requisições e cotações" },
];

// 👥 PESSOAS
const pessoas: MenuItem[] = [
  { title: "Equipe", url: "/equipe", icon: UserCog, description: "Colaboradores" },
  { title: "RH", url: "/rh", icon: Users2, roles: ["admin", "gerente", "franqueador"], description: "Recursos humanos" },
  { title: "Lojas", url: "/lojas", icon: Building2, roles: ["admin", "franqueador"], description: "Multi-loja" },
];

// 📈 INTELIGÊNCIA
const inteligencia: MenuItem[] = [
  { title: "Analytics", url: "/analytics", icon: BarChart3, description: "BI e dashboards" },
  { title: "Indicadores", url: "/indicadores", icon: Gauge, roles: ["admin", "gerente", "franqueador"], description: "KPIs operacionais" },
  { title: "Mapa Operações", url: "/mapa-operacoes", icon: Map, roles: ["admin", "gerente", "franqueador"], description: "Visão geográfica" },
  { title: "Radar Equipe", url: "/radar-equipe", icon: Activity, roles: ["admin", "gerente", "franqueador"], description: "Performance em tempo real" },
];

// 🛠️ FERRAMENTAS
const ferramentas: MenuItem[] = [
  { title: "Capture", url: "/capture", icon: UploadCloud, roles: ["admin", "gerente", "franqueador"], description: "Importar plantas" },
  { title: "Automações", url: "/automacoes", icon: Sparkles, roles: ["admin", "gerente", "franqueador"], description: "Workflows automáticos" },
  { title: "WhatsApp", url: "/automacao-whatsapp", icon: Send, roles: ["admin", "gerente", "franqueador"], description: "Mensagens em massa" },
  { title: "Push", url: "/push-notificacoes", icon: Radio, roles: ["admin", "gerente", "franqueador"], description: "Notificações push" },
  { title: "Comunicação", url: "/central-comunicacao", icon: MessageSquare, roles: ["admin", "gerente", "franqueador"], description: "Central de comunicados" },
  { title: "Notificações", url: "/notificacoes", icon: Bell, description: "Suas notificações" },
  { title: "Feedback", url: "/feedback", icon: Receipt, description: "Pesquisa de satisfação" },
  { title: "Modo Campo", url: "/modo-campo", icon: HardHat, roles: ["admin", "gerente", "montador", "tecnico"], description: "App mobile" },
  { title: "Integrações", url: "/integracoes", icon: Plug, description: "Conexões externas" },
  { title: "Configurações", url: "/configuracoes", icon: Settings, description: "Ajustes do sistema" },
  { title: "Ajuda", url: "/ajuda", icon: HelpCircle, description: "Suporte e guias" },
];

const groups: MenuGroup[] = [
  { id: "favoritos", title: "Favoritos", icon: Star, items: favoritosFixos, defaultOpen: true },
  { id: "vendas", title: "Vendas & Projetos", icon: Handshake, items: vendas, defaultOpen: true },
  { id: "operacao", title: "Operação", icon: Factory, items: operacao, defaultOpen: true },
  { id: "logistica", title: "Logística & Pós-venda", icon: Truck, items: logistica, defaultOpen: false },
  { id: "financeiro", title: "Financeiro", icon: DollarSign, items: financeiro, defaultOpen: false },
  { id: "pessoas", title: "Pessoas", icon: Users2, items: pessoas, defaultOpen: false },
  { id: "inteligencia", title: "Inteligência", icon: LineChart, items: inteligencia, defaultOpen: false },
  { id: "ferramentas", title: "Ferramentas", icon: Wrench, items: ferramentas, defaultOpen: false },
];

export function AppSidebar() {
  const queryClient = useQueryClient();
  const { state } = useSidebar();
  const { perfil, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const collapsed = state === "collapsed";

  // Estado dos grupos (com persistência)
  const [openGroups, setOpenGroups] = useOpenGroups(() => {
    const initial: Record<string, boolean> = {};
    groups.forEach((g) => {
      initial[g.id] = g.defaultOpen ?? true;
    });
    return initial;
  });

  // Estado da busca
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  // Favoritos editáveis
  const { isFavorite, toggleFavorite } = useFavorites();

  // Auto-expandir grupo quando há busca
  useEffect(() => {
    if (search.trim()) {
      const expanded: Record<string, boolean> = {};
      groups.forEach((g) => {
        const hasMatch = g.items.some(
          (item) =>
            item.title.toLowerCase().includes(search.toLowerCase()) ||
            (item.description?.toLowerCase().includes(search.toLowerCase()) ?? false)
        );
        expanded[g.id] = hasMatch;
      });
      setOpenGroups(expanded);
    }
  }, [search]);

  useEffect(() => {
    const channel = supabase
      .channel("sidebar_messages_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_mensagens",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["total_unread_messages"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: totalUnread } = useQuery({
    queryKey: ["total_unread_messages"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("chat_mensagens")
        .select("*", { count: "exact", head: true })
        .eq("lida", false)
        .eq("remetente_tipo", "cliente");
      if (error) return 0;
      return count || 0;
    },
    staleTime: 1000 * 60,
  });

  const { data: pendingContracts } = useQuery({
    queryKey: ["total_pending_contracts"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("contratos")
        .select("*", { count: "exact", head: true })
        .in("status", ["pendente", "rascunho", "aguardando_assinatura"]);
      if (error) return 0;
      return count || 0;
    },
    staleTime: 1000 * 60,
  });

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "relative !bg-white/[0.08] !text-white font-semibold border border-white/10 shadow-[inset_3px_0_0_#1a9be8,0_10px_28px_rgba(2,6,23,0.28)] rounded-xl transition-all duration-200 ease-out hover:!bg-white/[0.10] hover:!text-white [&_svg]:!text-white"
      : "relative !bg-transparent !text-slate-400 transition-all duration-200 ease-out hover:!bg-white/[0.06] hover:!text-white hover:translate-x-0.5 rounded-xl [&_svg]:text-slate-500 [&_svg]:transition-colors hover:[&_svg]:text-sky-200";

  const canSee = (item: MenuItem) => {
    if (!item.roles || item.roles.length === 0) return true;
    if (roles.includes("admin_master")) return true;
    return item.roles.some((r) => roles.includes(r));
  };

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // ============================================
  // ATALHOS DE TECLADO
  // ============================================
  const nav = useNavigate();
  const shortcuts = useMemo(() => {
    const items = groups.flatMap((g) => g.items.filter(canSee));
    const list: { combo: string; description: string; action: () => void }[] = [
      // Modificadores globais
      { combo: "ctrl+k", description: "Focar busca do menu", action: () => {
        const input = document.getElementById("sidebar-search") as HTMLInputElement;
        if (input) {
          input.focus();
          input.select();
        }
      }},
      { combo: "escape", description: "Limpar busca", action: () => {
        setSearch("");
        const input = document.getElementById("sidebar-search") as HTMLInputElement;
        if (input) input.blur();
      }},
    ];

    // Atalhos G + letra (Gmail style)
    const shortcutMap: Record<string, string> = {
      "/": "/",
      "d": "/dashboard",
      "c": "/comercial",
      "k": "/contratos",
      "l": "/clientes",
      "t": "/tecnico",
      "p": "/producao",
      "a": "/almoxarifado",
      "f": "/frota",
      "g": "/logistica",
      "m": "/montagem",
      "v": "/pos-venda",
      "n": "/financeiro",
      "r": "/dre",
      "s": "/comissoes",
      "o": "/compras",
      "e": "/equipe",
      "h": "/rh",
      "i": "/analytics",
      "u": "/capture",
      "?": "/ajuda",
    };

    Object.entries(shortcutMap).forEach(([key, url]) => {
      const item = items.find((i) => i.url === url);
      list.push({
        combo: `g+${key}`,
        description: `Ir para ${item?.title || url}`,
        action: navigateShortcut(nav, url),
      });
    });

    return list;
  }, [nav, roles]);

  const { pendingPrefix } = useKeyboardShortcuts(shortcuts, true);

  // Estado do Command Palette
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Estado do Help Modal
  const [helpOpen, setHelpOpen] = useState(false);

  // Abrir palette com Ctrl+K
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Construir items do Command Palette
  const commandItems = useMemo(() => {
    return groups
      .flatMap((g) =>
        g.items.map((item) => ({
          id: `${g.id}:${item.url}`,
          title: item.title,
          description: item.description,
          url: item.url,
          icon: item.icon,
          group: g.title,
        }))
      )
      .filter((it) => {
        // Verificar permissão
        const item = groups.flatMap((g) => g.items).find((i) => i.url === it.url);
        return item ? canSee(item) : true;
      });
  }, [roles]);

  const pinnedIds = useMemo(() => {
    return Object.keys({}).filter((k) => false); // placeholder
  }, []);

  // Filtrar grupos por busca
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const s = search.toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (item) =>
            item.title.toLowerCase().includes(s) ||
            (item.description?.toLowerCase().includes(s) ?? false)
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [search]);

  const getBadge = (item: MenuItem) => {
    if (item.badge === "messages" && totalUnread && totalUnread > 0) return totalUnread;
    if (item.badge === "contracts" && pendingContracts && pendingContracts > 0) return pendingContracts;
    return null;
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-white/10 bg-[#0a0e1a] shadow-2xl shadow-slate-950/30">
      <SidebarHeader className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(26,155,232,0.16),transparent_18rem),#0a0e1a] px-3 py-4 flex items-center justify-center">
        {collapsed ? (
          <NavLink to="/" className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] shadow-inner transition-all duration-300">
            <LogoNexo size="md" className="h-10 w-10" />
          </NavLink>
        ) : (
          <NavLink to="/" className="flex w-full items-center justify-center px-1 animate-in fade-in slide-in-from-left-2 duration-500 overflow-hidden">
            <LogoNexo
              size="xl"
              className="h-auto w-auto max-h-[100px] max-w-[200px] object-contain opacity-95 transition-all hover:scale-[1.02]"
            />
          </NavLink>
        )}
      </SidebarHeader>

      <SidebarContent className="bg-[linear-gradient(180deg,#0a0e1a_0%,#07101f_100%)] px-2 py-3">
        {/* Busca */}
        {!collapsed && (
          <div className="px-2 pb-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <Input
                id="sidebar-search"
                type="text"
                placeholder="Buscar no menu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                onClick={() => setPaletteOpen(true)}
                readOnly
                className="h-8 pl-8 pr-12 text-xs bg-white/[0.04] border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-sky-500/50 cursor-pointer"
              />
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-medium text-slate-400">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </div>
            {pendingPrefix && (
              <div className="mt-1.5 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 flex items-center gap-1.5">
                <Keyboard className="h-3 w-3" />
                Pressione a próxima tecla (G + <span className="font-bold">{pendingPrefix.toUpperCase()}</span>)
              </div>
            )}
            {search && !pendingPrefix && (
              <p className="text-[10px] text-slate-500 mt-1.5 px-1">
                {filteredGroups.reduce((acc, g) => acc + g.items.length, 0)} resultado(s)
              </p>
            )}
          </div>
        )}

        {/* Grupos de menu */}
        {filteredGroups.map((group) => {
          const visibleItems = group.items.filter(canSee);
          if (visibleItems.length === 0) return null;

          const isOpen = openGroups[group.id] ?? true;
          const isFavoritos = group.id === "favoritos";

          return (
            <SidebarGroup key={group.id} className="py-0.5">
              {!collapsed ? (
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="nexus-sidebar-label nexus-group-header nexus-ripple w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-white/[0.04] transition-colors group"
                >
                  <span className="flex items-center gap-2">
                    {isFavoritos ? (
                      <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                    ) : (
                      <group.icon className="h-3 w-3" />
                    )}
                    <span>{group.title}</span>
                  </span>
                  <ChevronDown
                    className={`h-3 w-3 text-slate-500 transition-transform duration-200 ${
                      isOpen ? "" : "-rotate-90"
                    }`}
                  />
                </button>
              ) : (
                <SidebarGroupLabel
                  className="nexus-sidebar-label nexus-group-header flex justify-center py-2"
                  title={group.title}
                >
                  <group.icon className="h-3.5 w-3.5" />
                </SidebarGroupLabel>
              )}

              {(collapsed || isOpen) && (
                <SidebarGroupContent className="nexus-group-content-enter overflow-hidden">
                  <SidebarMenu>
                    {(() => {
                      // Renderizar grupo Favoritos: fixos + pinned pelo usuário
                      if (group.id === "favoritos") {
                        const pinnedFromOthers = groups
                          .filter((g) => g.id !== "favoritos")
                          .flatMap((g) => g.items.map((it) => ({ ...it, _group: g.id })))
                          .filter((it) => isFavorite(it._group, it.url) && canSee(it));
                        return [...favoritosFixos, ...pinnedFromOthers];
                      }
                      return visibleItems;
                    })().map((item: any, index: number) => {
                      const badge = getBadge(item);
                      const pinned = !isFavoritos && isFavorite(group.id, item.url);
                      return (
                        <SidebarMenuItem
                          key={`${group.id}-${item.url}`}
                          className="group/menu-item relative nexus-menu-item-enter"
                          style={{ animationDelay: `${Math.min(index * 40, 200)}ms` }}
                        >
                          <SidebarMenuButton asChild>
                            <NavLink
                              to={item.url}
                              end={item.url === "/"}
                              className={`${linkClass} nexus-link-hover`}
                              title={collapsed ? `${item.title} — ${item.description || ""}` : undefined}
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2 min-w-0">
                                  <item.icon className="h-4 w-4 flex-shrink-0" />
                                  {!collapsed && (
                                    <span className="truncate">{item.title}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {!collapsed && pinned && (
                                    <Pin className="h-3 w-3 text-amber-400 fill-amber-400/40 nexus-pin-pop" />
                                  )}
                                  {!collapsed && badge !== null && (
                                    <span className="nexus-badge-pulse min-w-[20px] rounded-full bg-gradient-to-br from-red-500 to-red-600 px-1.5 py-0.5 text-center text-[10px] font-bold text-white shadow-md shadow-red-950/30 ring-1 ring-[#0a0e1a]">
                                      {badge}
                                    </span>
                                  )}
                                </div>
                                {collapsed && badge !== null && (
                                  <div className="nexus-badge-pulse absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[#0a0e1a]" />
                                )}
                                {collapsed && pinned && (
                                  <div className="absolute right-1.5 bottom-1.5 h-1.5 w-1.5 rounded-full bg-amber-400" />
                                )}
                              </div>
                            </NavLink>
                          </SidebarMenuButton>
                          {/* Botão Pin (apenas expanded, fora do link) */}
                          {!collapsed && !isFavoritos && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleFavorite(group.id, item.url);
                              }}
                              className="absolute right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover/menu-item:opacity-100 transition-opacity p-1 rounded hover:bg-white/[0.08]"
                              title={pinned ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                              aria-label={pinned ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                            >
                              {pinned ? (
                                <Pin className="h-3 w-3 text-amber-400 fill-amber-400/40" />
                              ) : (
                                <Pin className="h-3 w-3 text-slate-500" />
                              )}
                            </button>
                          )}
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>
          );
        })}

        {/* Empty state quando busca não retorna nada */}
        {search && filteredGroups.length === 0 && !collapsed && (
          <div className="px-4 py-8 text-center">
            <Search className="h-8 w-8 mx-auto text-slate-600 mb-2" />
            <p className="text-sm text-slate-500">Nenhum resultado encontrado</p>
            <button
              onClick={() => setSearch("")}
              className="text-xs text-sky-400 hover:text-sky-300 mt-2"
            >
              Limpar busca
            </button>
          </div>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-white/10 bg-[#0c1526]/95 p-3">
        {!collapsed && perfil && (
          <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 shadow-inner shadow-black/10">
            <p className="truncate nexus-sidebar-user-name">{perfil.nome}</p>
            <p className="truncate nexus-sidebar-user-email">{perfil.email}</p>
            <p className="mt-1 truncate text-[10px] font-medium uppercase tracking-wider text-slate-500">Roles: {roles.join(", ")}</p>
          </div>
        )}
        <div className="flex gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-start rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06]"
            onClick={() => setHelpOpen(true)}
            title="Atalhos de teclado (?)"
          >
            <Keyboard className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Atalhos</span>}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="nexus-sidebar-logout justify-start rounded-xl"
            onClick={signOut}
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2 hidden lg:inline">Sair</span>}
          </Button>
        </div>
      </SidebarFooter>

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        items={commandItems}
        pinnedIds={pinnedIds}
      />

      {/* Help Modal (?) */}
      <HelpModal open={helpOpen} onOpenChange={setHelpOpen} />
    </Sidebar>
  );
}
