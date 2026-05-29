import React, { useEffect, useState } from "react";
import { NavLink, useLocation, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Send,
  DollarSign,
  Percent,
  ShoppingCart,
  UserCog,
  Building2,
  BarChart3,
  Plug,
  Settings,
  LogOut,
  MessageSquare,
  Package,
  Bell,
  Rocket,
  Smartphone,
  Briefcase,
  Activity,
  Bot,
  ChevronRight,
} from "lucide-react";
import { useNotificacoes } from "@/hooks/use-notificacoes";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type AppRole = Database["public"]["Enums"]["app_role"];

type MenuItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: AppRole[];
};


const operacao: MenuItem[] = [
  { title: "Clientes", url: "/clientes", icon: UserRound, roles: ["admin", "gerente", "vendedor", "franqueador", "pos_venda", "admin_master"] },
  { title: "Técnico", url: "/tecnico", icon: ClipboardCheck, roles: ["admin", "gerente", "tecnico", "medidor", "conferente", "franqueador", "admin_master"] },
  { title: "Produção", url: "/producao", icon: Factory, roles: ["admin", "gerente", "tecnico", "franqueador", "admin_master"] },
  { title: "Logística", url: "/logistica", icon: Truck, roles: ["admin", "gerente", "logistico", "franqueador", "admin_master"] },
  { title: "Montagem", url: "/montagem", icon: Wrench, roles: ["admin", "gerente", "montador", "franqueador", "admin_master"] },
  { title: "Pós-venda", url: "/pos-venda", icon: HeadphonesIcon, roles: ["admin", "gerente", "pos_venda", "franqueador", "admin_master"] },
  { title: "Mensagens", url: "/mensagens", icon: MessageSquare },
  { title: "DRE", url: "/dre", icon: TrendingUp, roles: ["admin", "gerente", "franqueador", "financeiro", "admin_master"] },
  { title: "Execução Real", url: "/operacao/execucao", icon: Activity, roles: ["admin", "gerente", "admin_master"] },
  { title: "Indicadores Op.", url: "/operacao/indicadores", icon: BarChart3, roles: ["admin", "gerente", "admin_master"] },
];

const gestao: MenuItem[] = [
  { title: "Financeiro", url: "/financeiro", icon: DollarSign, roles: ["admin", "gerente", "financeiro", "franqueador", "admin_master"] },
  { title: "Comissões", url: "/comissoes", icon: Percent, roles: ["admin", "gerente", "financeiro", "admin_master"] },
  { title: "Compras", url: "/compras", icon: ShoppingCart, roles: ["admin", "gerente", "comprador", "almoxarife", "admin_master"] },
  { title: "Almoxarifado", url: "/almoxarifado", icon: Package, roles: ["admin", "gerente", "almoxarife", "comprador", "franqueador", "admin_master"] },
  { title: "Equipe", url: "/equipe", icon: UserCog, roles: ["admin", "gerente", "admin_master"] },
  { title: "RH / Pessoas", url: "/rh", icon: Briefcase, roles: ["admin", "gerente", "rh", "franqueador", "admin_master"] },
  { title: "Frota", url: "/frota", icon: Truck, roles: ["admin", "gerente", "logistico", "franqueador", "admin_master"] },
  { title: "Lojas", url: "/lojas", icon: Building2, roles: ["admin", "franqueador", "admin_master"] },
  { title: "Cond. Pagamento", url: "/configuracoes/pagamento", icon: Settings, roles: ["admin", "gerente", "admin_master"] },
  { title: "Fornecedores", url: "/configuracoes/fornecedores", icon: Factory, roles: ["admin", "gerente", "admin_master"] },
];

const inteligencia: MenuItem[] = [
  { title: "Acompanhamento", url: "/acompanhamento-criacao", icon: LayoutDashboard, roles: ["admin", "admin_master"] },
  { title: "Analytics", url: "/analytics", icon: BarChart3, roles: ["admin", "gerente", "franqueador", "admin_master"] },
  { title: "Integrações", url: "/integracoes", icon: Plug, roles: ["admin", "gerente", "admin_master"] },
  { title: "Central de Envios", url: "/comunicacoes/envios", icon: Send, roles: ["admin", "gerente", "admin_master"] },
  { title: "Estimativa PDF", url: "/estimativa-orcamento", icon: MessageSquare },
  { title: "Automações", url: "/configuracoes/automacoes", icon: Bot, roles: ["admin", "gerente", "franqueador", "admin_master"] },
  { title: "Implantação", url: "/configuracao-inicial", icon: Rocket, roles: ["admin", "gerente", "franqueador", "admin_master"] },
  { title: "Modo Campo", url: "/campo", icon: Smartphone, roles: ["admin", "gerente", "tecnico", "medidor", "conferente", "logistico", "montador", "pos_venda", "almoxarife", "admin_master"] },
];

export function AppSidebar() {
  const queryClient = useQueryClient();
  const { state } = useSidebar();
  const { perfil, roles, signOut } = useAuth();
  const { naoLidas: totalNotifs } = useNotificacoes();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const isComercialActive =
    location.pathname.startsWith("/comercial") || location.pathname.startsWith("/contratos");

  const [comercialOpen, setComercialOpen] = useState(isComercialActive);

  useEffect(() => {
    setComercialOpen(isComercialActive);
  }, [isComercialActive]);

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

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "!bg-white/[0.06] !text-white font-medium border-l-2 border-[#a3a380] pl-[calc(0.5rem-2px)] rounded-l-none rounded-r-lg transition-all duration-200 hover:!bg-white/[0.08] hover:!text-white [&_svg]:!text-[#a3a380]"
      : "!bg-transparent !text-stone-400 rounded-lg transition-all duration-200 hover:!bg-white/[0.04] hover:!text-white hover:[&_svg]:!text-[#a3a380]";

  const canSee = (item: MenuItem) => {
    if (!item.roles || item.roles.length === 0) return true;
    if (roles.includes("admin_master")) return true;
    return item.roles.some((r) => roles.includes(r));
  };

  const comercialRoles: AppRole[] = ["admin", "gerente", "vendedor", "franqueador", "admin_master"];
  const showComercial = comercialRoles.some((r) => roles.includes(r));

  const subItemActive = (url: string) => {
    if (url === "/contratos") return location.pathname.startsWith("/contratos");
    return location.pathname + location.search === url || location.pathname === url;
  };

  return (
    <Sidebar collapsible="icon" className="bg-[#1c1917] border-r border-white/5">
      <SidebarHeader className="border-b border-white/5 bg-[#1c1917] px-4 py-4">
        {collapsed ? (
          <img src="/nexo-logo.png" alt="Logo" className="w-8 h-8 object-contain" />
        ) : (
          <div className="flex flex-col gap-1">
            <img src="/nexo-logo.png" alt="NEXO Logo" className="w-28 h-auto object-contain" />
            <p className="mt-0.5 nexo-sidebar-subtitle">Gestão de Planejados</p>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="bg-[#1c1917]">
        <SidebarGroup>
          <SidebarGroupLabel className="nexo-sidebar-label">Início</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/" end className={linkClass}>
                    <LayoutDashboard className="h-4 w-4" />
                    {!collapsed && <span>Dashboard</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/notificacoes" className={linkClass}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        {!collapsed && <span>Notificações</span>}
                      </div>
                      {!collapsed && totalNotifs > 0 && (
                        <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                          {totalNotifs}
                        </span>
                      )}
                      {collapsed && totalNotifs > 0 && (
                        <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="nexo-sidebar-label">Operação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {showComercial && (
                <SidebarMenuItem>
                  <Collapsible open={comercialOpen} onOpenChange={setComercialOpen}>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        className={cn(
                          "w-full",
                          isComercialActive
                            ? "!bg-white/[0.06] !text-white font-medium border-l-2 border-[#a3a380] pl-[calc(0.5rem-2px)] rounded-l-none rounded-r-lg hover:!bg-white/[0.08] hover:!text-white"
                            : "!bg-transparent !text-stone-400 rounded-lg hover:!bg-white/[0.04] hover:!text-white"
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {!collapsed && <span>Comercial</span>}
                          </div>
                          {!collapsed && (
                            <ChevronRight
                              className={cn(
                                "h-3.5 w-3.5 transition-transform duration-200",
                                comercialOpen && "rotate-90"
                              )}
                            />
                          )}
                        </div>
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="border-white/10">
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            size="sm"
                            isActive={subItemActive("/comercial?tab=painel")}
                            className={cn(
                              subItemActive("/comercial?tab=painel")
                                ? "bg-white/[0.06] text-white font-medium border-l-2 border-[#a3a380] pl-[calc(0.5rem-2px)] rounded-l-none"
                                : "text-stone-400 hover:bg-white/[0.04] hover:text-white"
                            )}
                          >
                            <Link to="/comercial?tab=painel">Painel</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            size="sm"
                            isActive={subItemActive("/comercial?tab=pipeline")}
                            className={cn(
                              subItemActive("/comercial?tab=pipeline")
                                ? "bg-white/[0.06] text-white font-medium border-l-2 border-[#a3a380] pl-[calc(0.5rem-2px)] rounded-l-none"
                                : "text-stone-400 hover:bg-white/[0.04] hover:text-white"
                            )}
                          >
                            <Link to="/comercial?tab=pipeline">Pipeline</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            size="sm"
                            isActive={subItemActive("/comercial?tab=leads")}
                            className={cn(
                              subItemActive("/comercial?tab=leads")
                                ? "bg-white/[0.06] text-white font-medium border-l-2 border-[#a3a380] pl-[calc(0.5rem-2px)] rounded-l-none"
                                : "text-stone-400 hover:bg-white/[0.04] hover:text-white"
                            )}
                          >
                            <Link to="/comercial?tab=leads">Leads</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            size="sm"
                            isActive={subItemActive("/contratos")}
                            className={cn(
                              subItemActive("/contratos")
                                ? "bg-white/[0.06] text-white font-medium border-l-2 border-[#a3a380] pl-[calc(0.5rem-2px)] rounded-l-none"
                                : "text-stone-400 hover:bg-white/[0.04] hover:text-white"
                            )}
                          >
                            <Link to="/contratos">Contratos</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>
              )}
              {operacao.filter(canSee).map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={linkClass}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </div>
                        {!collapsed && item.url === "/mensagens" && totalUnread !== undefined && totalUnread > 0 && (
                          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                            {totalUnread}
                          </span>
                        )}
                        {collapsed && item.url === "/mensagens" && totalUnread !== undefined && totalUnread > 0 && (
                          <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                        )}
                      </div>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="nexo-sidebar-label">Gestão</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {gestao.filter(canSee).map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={linkClass}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="nexo-sidebar-label">Inteligência</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {inteligencia.filter(canSee).map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={linkClass}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-white/5 bg-[#1c1917] p-3">
        {!collapsed && perfil && (
          <div className="mb-2 px-2">
            <p className="truncate nexo-sidebar-user-name">{perfil.nome}</p>
            <p className="truncate nexo-sidebar-user-email">{perfil.email}</p>
            <p className="text-[10px] text-gray-400 truncate">Roles: {roles.join(", ")}</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="nexo-sidebar-logout w-full justify-start"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}