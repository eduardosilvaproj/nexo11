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
  { title: "Técnico", url: "/tecnico", icon: ClipboardCheck },
  { title: "Produção", url: "/producao", icon: Factory },
  { title: "Logística", url: "/logistica", icon: Truck },
  { title: "Montagem", url: "/montagem", icon: Wrench },
  { title: "Pós-venda", url: "/pos-venda", icon: HeadphonesIcon },
  { title: "DRE", url: "/dre", icon: TrendingUp },
];

const gestao = [
  { title: "Financeiro", url: "/financeiro", icon: DollarSign },
  { title: "Comissões", url: "/comissoes", icon: Percent },
  { title: "Compras", url: "/compras", icon: ShoppingCart },
  { title: "Equipe", url: "/equipe", icon: UserCog },
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

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium border-l-2 border-sidebar-primary"
      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";

  const canSee = (item: { roles?: string[] }) =>
    !item.roles || item.roles.some((r) => roles.includes(r as any));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        {collapsed ? (
          <LogoNexo size="sm" />
        ) : (
          <div>
            <LogoNexo size="md" />
            <p className="mt-0.5 text-xs text-nexo-gray-text">Gestão de Planejados</p>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <NavLink to="/" className="text-xs font-medium uppercase tracking-wider">
              Início
            </NavLink>
          </SidebarGroupLabel>
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
          <SidebarGroupLabel>Operação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {operacao.map((item) => (
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
          <SidebarGroupLabel>Gestão</SidebarGroupLabel>
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
          <SidebarGroupLabel>Inteligência</SidebarGroupLabel>
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

      <SidebarFooter className="border-t p-3">
        {!collapsed && perfil && (
          <div className="mb-2 px-2">
            <p className="truncate text-sm font-medium">{perfil.nome}</p>
            <p className="truncate text-xs text-muted-foreground">{perfil.email}</p>
            {roles.length > 0 && (
              <p className="mt-1 text-[10px] uppercase tracking-wide text-primary">
                {roles.join(" · ")}
              </p>
            )}
          </div>
        )}
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
