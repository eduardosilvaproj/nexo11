import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
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
  LogOut,
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

const operacao = [
  { title: "Comercial", url: "/comercial", icon: Users },
  { title: "Técnico", url: "/tecnico", icon: ClipboardCheck, roles: ["admin", "gerente", "tecnico", "franqueador"] },
  { title: "Produção", url: "/producao", icon: Factory, roles: ["admin", "gerente", "tecnico", "franqueador"] },
  { title: "Logística", url: "/logistica", icon: Truck, roles: ["admin", "gerente", "franqueador"] },
  { title: "Montagem", url: "/montagem", icon: Wrench, roles: ["admin", "gerente", "montador", "franqueador"] },
  { title: "Pós-venda", url: "/pos-venda", icon: HeadphonesIcon },
  { title: "DRE", url: "/dre", icon: TrendingUp, roles: ["admin", "gerente", "franqueador"] },
];

const gestao = [
  { title: "Financeiro", url: "/financeiro", icon: DollarSign },
  { title: "Comissões", url: "/comissoes", icon: Percent },
  { title: "Compras", url: "/compras", icon: ShoppingCart },
  { title: "Equipe", url: "/equipe", icon: UserCog },
  { title: "Equipes", url: "/equipes", icon: Users2, roles: ["admin", "gerente"] },
  { title: "Lojas", url: "/lojas", icon: Building2, roles: ["admin", "franqueador"] },
];

const inteligencia = [
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Integrações", url: "/integracoes", icon: Plug },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { perfil, roles, signOut } = useAuth();
  const collapsed = state === "collapsed";

  // Inativo: SEM fundo, texto #6B7A90, hover discreto.
  // Ativo: bg #1A2332 + borda esquerda 2px #1E6FBF + texto/ícone #00AAFF.
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "!bg-[#1A2332] !text-white font-medium border-l-2 border-[#1E6FBF] pl-[calc(0.5rem-2px)] rounded-l-none rounded-r-md transition-colors duration-150 ease-in-out hover:!bg-[#1A2332] hover:!text-white [&_svg]:!text-white"
      : "!bg-transparent !text-[#6B7A90] transition-colors duration-150 ease-in-out hover:!bg-[#1A2332]/60 hover:!text-[#B0BAC9]";

  const canSee = (item: { roles?: string[] }) =>
    !item.roles || item.roles.some((r) => roles.includes(r as any));

  return (
    <Sidebar collapsible="icon" className="bg-[#0D1117]">
      <SidebarHeader className="border-b border-sidebar-border bg-[#0D1117] px-4 py-4">
        {collapsed ? (
          <LogoNexo size="sm" />
        ) : (
          <div>
            <LogoNexo size="md" />
            <p className="mt-0.5 nexo-sidebar-subtitle">Gestão de Planejados</p>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="bg-[#0D1117]">
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="nexo-sidebar-label">Operação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {operacao.filter(canSee).map((item) => (
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
              {inteligencia.map((item) => (
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

      <SidebarFooter className="border-t border-sidebar-border bg-[#1A2332] p-3">
        {!collapsed && perfil && (
          <div className="mb-2 px-2">
            <p className="truncate nexo-sidebar-user-name">{perfil.nome}</p>
            <p className="truncate nexo-sidebar-user-email">{perfil.email}</p>
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
