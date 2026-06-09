import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import { AppShellMobile } from "@/routes/mobile/AppShellMobile";
import AuthPage from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Placeholder from "./pages/Placeholder";
import Comercial from "./pages/Comercial";
import Contratos from "./pages/Contratos";
import RH from "./pages/RH";
import Clientes from "./pages/Clientes";
import ClienteDetail from "./pages/ClienteDetail";
import Tecnico from "./pages/Tecnico";
import Producao from "./pages/Producao";
import Logistica from "./pages/Logistica";
import Montagem from "./pages/Montagem";
import Equipe from "./pages/Equipe";
import Mensagens from "./pages/Mensagens";
import PosVenda from "./pages/PosVenda";
import Dre from "./pages/Dre";
import Financeiro from "./pages/Financeiro";
import Comissoes from "./pages/Comissoes";
import ContratoDetail from "./pages/ContratoDetail";
import ContratoMedicao from "./pages/ContratoMedicao";
import ContratoConferencia from "./pages/ContratoConferencia";
import Analytics from "./pages/Analytics";
import Lojas from "./pages/Lojas";
import LojaDetail from "./pages/LojaDetail";
import NotFound from "./pages/NotFound.tsx";
import SemPermissao from "./pages/SemPermissao";
import PortalCliente from "./pages/PortalCliente";
import PortalEntrada from "./pages/PortalEntrada";
import Integracoes from "./pages/Integracoes";
import ConfigPagamento from "./pages/ConfigPagamento";
import OrcamentoNegociacao from "./pages/OrcamentoNegociacao";
import ConfigFornecedores from "./pages/ConfigFornecedores";
import Compras from "./pages/Compras";
import EstimativaOrcamento from "./pages/EstimativaOrcamento";
import Almoxarifado from "./pages/Almoxarifado";
import Automacoes from "./pages/Automacoes";
import CentralComunicacao from "./pages/CentralComunicacao";
import Execucao from "./pages/Execucao";
import Feedback from "./pages/Feedback";
import Ajuda from "./pages/Ajuda";
import MapaOperacoes from "./pages/MapaOperacoes";
import RadarEquipe from "./pages/RadarEquipe";
import AutomacaoWhatsapp from "./pages/AutomacaoWhatsapp";
import PushNotificacoes from "./pages/PushNotificacoes";
import IndicadoresOperacionais from "./pages/IndicadoresOperacionais";
import ModoCampo from "./pages/ModoCampo";
import Notificacoes from "./pages/Notificacoes";
import Apresentacao from "./pages/Apresentacao";
import CapturePage from "./pages/Capture";

import FrotaLayout from "./pages/frota/FrotaLayout";
import FrotaDashboard from "./pages/frota/FrotaDashboard";
import FrotaVeiculos from "./pages/frota/FrotaVeiculos";
import FrotaAbastecimentos from "./pages/frota/FrotaAbastecimentos";
import FrotaManutencoes from "./pages/frota/FrotaManutencoes";
import FrotaMultas from "./pages/frota/FrotaMultas";
import FrotaPostos from "./pages/frota/FrotaPostos";
import FrotaCnh from "./pages/frota/FrotaCnh";
import FrotaRelatorios from "./pages/frota/FrotaRelatorios";
import FrotaCheckin from "./pages/frota/FrotaCheckin";

import PortalFuncionario from "./pages/PortalFuncionario";
import { VersionChecker } from "./components/VersionChecker";
import { AgentWidget } from "./components/agent/AgentWidget";
import { FirstAccessWizard } from "./components/onboarding/FirstAccessWizard";
import { HintsOverlay } from "./components/onboarding/HintsOverlay";
import { PageTour } from "./components/PageTour";
import { PageShortcuts } from "./components/PageShortcuts";
import { tourConfigs } from "./config/tours";
import NewContract from "./pages/NewContract";

// Mobile imports - lazy loaded
import DashboardVendedor from "@/routes/mobile/pages/DashboardVendedor";
import LeadsVendedor from "@/routes/mobile/pages/LeadsVendedor";
import ContratosVendedor from "@/routes/mobile/pages/ContratosVendedor";
import MetasVendedor from "@/routes/mobile/pages/MetasVendedor";
import ChatVendedor from "@/routes/mobile/pages/ChatVendedor";
import DashboardMedidor from "@/routes/mobile/pages/DashboardMedidor";
import AndamentosMedidor from "@/routes/mobile/pages/AndamentosMedidor";
import ValoresMedidor from "@/routes/mobile/pages/ValoresMedidor";
import HistoricoMedidor from "@/routes/mobile/pages/HistoricoMedidor";
import DashboardConferente from "@/routes/mobile/pages/DashboardConferente";
import AndamentosConferente from "@/routes/mobile/pages/AndamentosConferente";
import HistoricoConferente from "@/routes/mobile/pages/HistoricoConferente";
import DashboardMontador from "@/routes/mobile/pages/DashboardMontador";
import OrdensMontador from "@/routes/mobile/pages/OrdensMontador";
import GuiasMontador from "@/routes/mobile/pages/GuiasMontador";
import FotosMontador from "@/routes/mobile/pages/FotosMontador";
import AgendaMontador from "@/routes/mobile/pages/AgendaMontador";
import SolicitacoesMontador from "@/routes/mobile/pages/SolicitacoesMontador";
import DashboardEntregue from "@/routes/mobile/pages/DashboardEntregue";
import AgendaEntregue from "@/routes/mobile/pages/AgendaEntregue";
import RomaneioEntregue from "@/routes/mobile/pages/RomaneioEntregue";
import ItensEntregue from "@/routes/mobile/pages/ItensEntregue";
import DashboardAdmin from "@/routes/mobile/pages/DashboardAdmin";
import AgendaAdmin from "@/routes/mobile/pages/AgendaAdmin";
import ResumoAdmin from "@/routes/mobile/pages/ResumoAdmin";


const queryClient = new QueryClient();

// Breakpoint for mobile detection (matches use-mobile.ts)
const MOBILE_BREAKPOINT = 768;

// Hook to detect mobile
function useIsMobileView() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return isMobile;
}


// Root layout switcher at route level
function RootLayoutSwitcher() {
  const isMobile = useIsMobileView();
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/apresentacao" element={<Apresentacao />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/portal" element={<PortalEntrada />} />
      <Route path="/portal/:token" element={<PortalCliente />} />
      <Route path="/portal-funcionario" element={<ProtectedRoute><PortalFuncionario /></ProtectedRoute>} />

      {/* Mobile routes — always use AppShellMobile */}
      <Route
        element={
          <ProtectedRoute>
            <AppShellMobile />
          </ProtectedRoute>
        }
      >
        {/* Vendedor mobile */}
        <Route path="/mobile/vendedor" element={<DashboardVendedor />} />
        <Route path="/mobile/vendedor/leads" element={<LeadsVendedor />} />
        <Route path="/mobile/vendedor/contratos" element={<ContratosVendedor />} />
        <Route path="/mobile/vendedor/metas" element={<MetasVendedor />} />
        <Route path="/mobile/vendedor/chat" element={<ChatVendedor />} />

        {/* Medidor mobile */}
        <Route path="/mobile/medidor" element={<DashboardMedidor />} />
        <Route path="/mobile/medidor/andamentos" element={<AndamentosMedidor />} />
        <Route path="/mobile/medidor/valores" element={<ValoresMedidor />} />
        <Route path="/mobile/medidor/historico" element={<HistoricoMedidor />} />

        {/* Conferente mobile */}
        <Route path="/mobile/conferente" element={<DashboardConferente />} />
        <Route path="/mobile/conferente/andamentos" element={<AndamentosConferente />} />
        <Route path="/mobile/conferente/historico" element={<HistoricoConferente />} />

        {/* Montador mobile */}
        <Route path="/mobile/montador" element={<DashboardMontador />} />
        <Route path="/mobile/montador/ordens" element={<OrdensMontador />} />
        <Route path="/mobile/montador/guias" element={<GuiasMontador />} />
        <Route path="/mobile/montador/fotos" element={<FotosMontador />} />
        <Route path="/mobile/montador/agenda" element={<AgendaMontador />} />
        <Route path="/mobile/montador/solicitacoes" element={<SolicitacoesMontador />} />

        {/* Entregue mobile */}
        <Route path="/mobile/entregue" element={<DashboardEntregue />} />
        <Route path="/mobile/entregue/agenda" element={<AgendaEntregue />} />
        <Route path="/mobile/entregue/romaneio" element={<RomaneioEntregue />} />
        <Route path="/mobile/entregue/itens" element={<ItensEntregue />} />

        {/* Admin mobile */}
        <Route path="/mobile/admin" element={<DashboardAdmin />} />
        <Route path="/mobile/admin/agenda" element={<AgendaAdmin />} />
        <Route path="/mobile/admin/resumo" element={<ResumoAdmin />} />
      </Route>

      {/* Desktop routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        {/* Operação */}
        <Route path="/comercial" element={<Comercial />} />
        <Route path="/contratos" element={<Contratos />} />
        <Route path="/rh" element={<RH />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/clientes/:id" element={<ClienteDetail />} />
        <Route path="/mensagens" element={<Mensagens />} />
        <Route path="/orcamentos/:id/negociacao" element={
          <ProtectedRoute roles={["admin","gerente","vendedor"]}>
            <OrcamentoNegociacao />
          </ProtectedRoute>
        } />
        <Route path="/contratos" element={<Contratos />} />
        <Route path="/contratos/:id" element={<ContratoDetail />} />
        <Route path="/contratos/:id/medicao" element={<ContratoMedicao />} />
        <Route path="/contratos/:id/conferencia" element={<ContratoConferencia />} />
        <Route path="/contratos/novo" element={
          <ProtectedRoute roles={["admin","gerente","vendedor"]}>
            <NewContract />
          </ProtectedRoute>
        } />
        <Route path="/tecnico" element={<Tecnico />} />
        <Route path="/producao" element={<Producao />} />
        <Route path="/logistica" element={<Logistica />} />
        <Route path="/montagem" element={<Montagem />} />
        <Route path="/pos-venda" element={<PosVenda />} />
        <Route path="/dre" element={<Dre />} />

        {/* Gestão */}
        <Route path="/financeiro" element={<Financeiro />} />
        <Route path="/comissoes" element={<Comissoes />} />
        <Route path="/compras" element={<Compras />} />
        <Route path="/rh" element={<RH />} />
        <Route path="/equipe" element={<Equipe />} />
        <Route path="/lojas" element={
          <ProtectedRoute roles={["admin","franqueador"]} redirectTo="/" redirectMessage="Acesso restrito">
            <Lojas />
          </ProtectedRoute>
        } />
        <Route path="/lojas/:id" element={
          <ProtectedRoute roles={["admin","franqueador"]} redirectTo="/" redirectMessage="Acesso restrito">
            <LojaDetail />
          </ProtectedRoute>
        } />

        {/* Inteligência */}
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/integracoes" element={<Integracoes />} />
        <Route path="/frota" element={<FrotaLayout />}>
          <Route index element={<FrotaDashboard />} />
          <Route path="veiculos" element={<FrotaVeiculos />} />
          <Route path="abastecimentos" element={<FrotaAbastecimentos />} />
          <Route path="manutencoes" element={<FrotaManutencoes />} />
          <Route path="multas" element={<FrotaMultas />} />
          <Route path="postos" element={<FrotaPostos />} />
          <Route path="cnh" element={<FrotaCnh />} />
          <Route path="relatorios" element={<FrotaRelatorios />} />
          <Route path="checkin" element={<FrotaCheckin />} />
        </Route>
        <Route path="/configuracoes/pagamento" element={<ConfigPagamento />} />
        <Route path="/configuracoes/fornecedores" element={<ConfigFornecedores />} />
        <Route path="/estimativa-orcamento" element={<EstimativaOrcamento />} />
        <Route path="/almoxarifado" element={<Almoxarifado />} />
        <Route path="/automacoes" element={<Automacoes />} />
        <Route path="/central-comunicacao" element={<CentralComunicacao />} />
        <Route path="/execucao" element={<Execucao />} />
        <Route path="/indicadores" element={<IndicadoresOperacionais />} />
        <Route path="/modo-campo" element={<ModoCampo />} />
        <Route path="/notificacoes" element={<Notificacoes />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/ajuda" element={<Ajuda />} />
        <Route path="/mapa-operacoes" element={<MapaOperacoes />} />
        <Route path="/radar-equipe" element={<RadarEquipe />} />
        <Route path="/automacao-whatsapp" element={<AutomacaoWhatsapp />} />
        <Route path="/push-notificacoes" element={<PushNotificacoes />} />
        <Route path="/capture" element={<CapturePage />} />
        <Route path="/sem-permissao" element={<SemPermissao />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <VersionChecker />
      <BrowserRouter>
        <AuthProvider>
          <RootLayoutSwitcher />
          <AgentWidget />
          <FirstAccessWizard />
          <HintsOverlay />
          <PageTour configs={tourConfigs} />
          <PageShortcuts />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
