import { NavLink } from "react-router-dom";
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
  { title: "Clientes", url: "/clientes", icon: UserRound },
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
  { title: "Lojas", url: "/lojas", icon: Building2, roles: ["admin", "franqueador"] },
  { title: "Cond. Pagamento", url: "/configuracoes/pagamento", icon: Settings, roles: ["admin", "gerente"] },
  { title: "Fornecedores", url: "/configuracoes/fornecedores", icon: Factory, roles: ["admin", "gerente"] },
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
  // Ativo: bg rgba(26,155,232,0.12) + borda esquerda 2px #1a9be8 + texto/ícone branco.
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "!bg-[rgba(26,155,232,0.12)] !text-white font-medium border-l-2 border-[#1a9be8] pl-[calc(0.5rem-2px)] rounded-l-none rounded-r-md transition-colors duration-150 ease-in-out hover:!bg-[rgba(26,155,232,0.12)] hover:!text-white [&_svg]:!text-white"
      : "!bg-transparent !text-[#64748b] transition-colors duration-150 ease-in-out hover:!bg-[rgba(255,255,255,0.04)] hover:!text-white";

  const canSee = (item: { roles?: string[] }) =>
    !item.roles || item.roles.some((r) => roles.includes(r as any));

  return (
    <Sidebar collapsible="icon" className="bg-[#0a0e1a] border-r border-white/5">
      <SidebarHeader className="border-b border-white/5 bg-[#0a0e1a] px-4 py-4">
        {collapsed ? (
          <img src="/nexo-logo.png" alt="Logo" className="w-8 h-8 object-contain" />
        ) : (
          <div className="flex flex-col gap-1">
            <img src="/nexo-logo.png" alt="NEXO Logo" className="w-28 h-auto object-contain" />
            <p className="mt-0.5 nexo-sidebar-subtitle">Gestão de Planejados</p>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="bg-[#0a0e1a]">
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

      <SidebarFooter className="border-t border-white/5 bg-[#0c1526] p-3">
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
