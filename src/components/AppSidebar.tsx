import { NavLink } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
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

type AppRole = Database["public"]["Enums"]["app_role"];

type MenuItem = {
  title: string;
  url: string;
  icon: any;
  roles?: AppRole[];
};

const operacao: MenuItem[] = [
  { title: "Comercial", url: "/comercial", icon: Users },
  { title: "Contratos", url: "/contratos", icon: FileText },
  { title: "Clientes", url: "/clientes", icon: UserRound },
  { title: "Técnico", url: "/tecnico", icon: ClipboardCheck, roles: ["admin", "gerente", "tecnico", "franqueador"] },
  { title: "Produção", url: "/producao", icon: Factory, roles: ["admin", "gerente", "tecnico", "franqueador"] },
  { title: "Logística", url: "/logistica", icon: Truck, roles: ["admin", "gerente", "franqueador"] },
  { title: "Montagem", url: "/montagem", icon: Wrench, roles: ["admin", "gerente", "montador", "franqueador"] },
  { title: "Almoxarifado", url: "/almoxarifado", icon: Package, roles: ["admin", "gerente", "franqueador"] },
  { title: "Frota", url: "/frota", icon: Car, roles: ["admin", "gerente", "franqueador"] },
  { title: "Pós-venda", url: "/pos-venda", icon: HeadphonesIcon },
  { title: "Mapa Operações", url: "/mapa-operacoes", icon: Map, roles: ["admin", "gerente", "franqueador"] },
  { title: "Radar Equipe", url: "/radar-equipe", icon: Activity, roles: ["admin", "gerente", "franqueador"] },
  { title: "Mensagens", url: "/mensagens", icon: MessageSquare },
  { title: "DRE", url: "/dre", icon: TrendingUp, roles: ["admin", "gerente", "franqueador"] },
];

const gestao: MenuItem[] = [
  { title: "Financeiro", url: "/financeiro", icon: DollarSign },
  { title: "Comissões", url: "/comissoes", icon: Percent },
  { title: "Compras", url: "/compras", icon: ShoppingCart },
  { title: "Equipe", url: "/equipe", icon: UserCog },
  { title: "RH", url: "/rh", icon: Users2, roles: ["admin", "gerente", "franqueador"] },
  { title: "Lojas", url: "/lojas", icon: Building2, roles: ["admin", "franqueador"] },
  { title: "Cond. Pagamento", url: "/configuracoes/pagamento", icon: Settings, roles: ["admin", "gerente"] },
  { title: "Fornecedores", url: "/configuracoes/fornecedores", icon: Factory, roles: ["admin", "gerente"] },
];

const inteligencia: MenuItem[] = [
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Indicadores", url: "/indicadores", icon: Gauge, roles: ["admin", "gerente", "franqueador"] },
  { title: "WhatsApp", url: "/automacao-whatsapp", icon: Zap, roles: ["admin", "gerente", "franqueador"] },
  { title: "Push", url: "/push-notificacoes", icon: Bell, roles: ["admin", "gerente", "franqueador"] },
  { title: "Capture", url: "/capture", icon: UploadCloud, roles: ["admin", "gerente", "franqueador"] },
  { title: "Automações", url: "/automacoes", icon: Zap, roles: ["admin", "gerente", "franqueador"] },
  { title: "Comunicação", url: "/central-comunicacao", icon: Radio, roles: ["admin", "gerente", "franqueador"] },
  { title: "Notificações", url: "/notificacoes", icon: Bell },
  { title: "Feedback", url: "/feedback", icon: MessageSquare },
  { title: "Ajuda", url: "/ajuda", icon: HelpCircle },
  { title: "Modo Campo", url: "/modo-campo", icon: Map, roles: ["admin", "gerente", "montador", "tecnico"] },
  { title: "Integrações", url: "/integracoes", icon: Plug },
  { title: "Estimativa PDF", url: "/estimativa-orcamento", icon: MessageSquare },
];

export function AppSidebar() {
  const queryClient = useQueryClient();
  const { state } = useSidebar();
  const { perfil, roles, signOut } = useAuth();
  const collapsed = state === "collapsed";

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
    staleTime: 1000 * 60, // Keep data fresh for 1 minute as we have realtime
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

  return (
    <Sidebar collapsible="icon" className="border-r border-white/10 bg-[#0a0e1a] shadow-2xl shadow-slate-950/30">
      <SidebarHeader className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(26,155,232,0.16),transparent_18rem),#0a0e1a] px-4 py-6">
        {collapsed ? (
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] shadow-inner transition-all duration-300">
            <img src="/nexus-logo.png" alt="Logo" className="h-11 w-11 object-contain" />
          </div>
        ) : (
          <div className="flex flex-col items-start px-1 animate-in fade-in slide-in-from-left-2 duration-500">
            <img
              src="/nexus-logo.png"
              alt="NEXUS Planejados"
              className="h-20 w-auto object-contain transition-all duration-300 hover:scale-[1.05]"
            />
          </div>
        ) (
          <div className="flex flex-col items-start px-1 animate-in fade-in slide-in-from-left-2 duration-500">
            <img
              src="/nexus-logo.png"
              alt="NEXUS Planejados"
              className="h-16 w-auto object-contain transition-all duration-300 hover:scale-[1.05]"
            />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="bg-[linear-gradient(180deg,#0a0e1a_0%,#07101f_100%)] px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="nexus-sidebar-label">Início</SidebarGroupLabel>
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="nexus-sidebar-label">Operação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
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
                          <span className="min-w-[18px] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-white shadow-lg shadow-red-950/30 ring-2 ring-[#0a0e1a]">
                            {totalUnread}
                          </span>
                        )}
                        {collapsed && item.url === "/mensagens" && totalUnread !== undefined && totalUnread > 0 && (
                          <div className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[#0a0e1a]" />
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
          <SidebarGroupLabel className="nexus-sidebar-label">Gestão</SidebarGroupLabel>
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
          <SidebarGroupLabel className="nexus-sidebar-label">Inteligência</SidebarGroupLabel>
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

      <SidebarFooter className="border-t border-white/10 bg-[#0c1526]/95 p-3">
        {!collapsed && perfil && (
          <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 shadow-inner shadow-black/10">
            <p className="truncate nexus-sidebar-user-name">{perfil.nome}</p>
            <p className="truncate nexus-sidebar-user-email">{perfil.email}</p>
            <p className="mt-1 truncate text-[10px] font-medium uppercase tracking-wider text-slate-500">Roles: {roles.join(", ")}</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="nexus-sidebar-logout w-full justify-start rounded-xl"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
