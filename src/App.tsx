import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import AuthPage from "./pages/Auth";
import Dashboard from "./pages/Dashboard";

import Comercial from "./pages/Comercial";
import Contratos from "./pages/Contratos";
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
import PortalCliente from "./pages/PortalCliente";
import PortalEntrada from "./pages/PortalEntrada";
import Integracoes from "./pages/Integracoes";
import ConfigPagamento from "./pages/ConfigPagamento";
import OrcamentoNegociacao from "./pages/OrcamentoNegociacao";
import ConfigFornecedores from "./pages/ConfigFornecedores";
import Compras from "./pages/Compras";
import EstimativaOrcamento from "./pages/EstimativaOrcamento";
import RH from "./pages/RH";
import Execucao from "./pages/Execucao";
import IndicadoresOperacionais from "./pages/IndicadoresOperacionais";
import Automacoes from "./pages/Automacoes";
import CentralComunicacao from "./pages/CentralComunicacao";
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

import AcompanhamentoCriacao from "./pages/AcompanhamentoCriacao";
import AcessoAcompanhamento from "./pages/AcessoAcompanhamento";
import AcompanhamentoPublico from "./pages/AcompanhamentoPublico";
import NewContract from "./pages/NewContract";
import Almoxarifado from "./pages/Almoxarifado";
import Apresentacao from "./pages/Apresentacao";
import SemPermissao from "./pages/SemPermissao";
import Notificacoes from "./pages/Notificacoes";
import ConfiguracaoInicial from "./pages/ConfiguracaoInicial";
import ModoCampo from "./pages/ModoCampo";
import MasterLayout from "@/components/master/MasterLayout";
import { MasterProtectedRoute } from "@/components/master/MasterProtectedRoute";
import MasterDashboard from "./pages/master/MasterDashboard";
import MasterClientes from "./pages/master/MasterClientes";
import MasterLojas from "./pages/master/MasterLojas";
import MasterPlanos from "./pages/master/MasterPlanos";
import MasterAssinaturas from "./pages/master/MasterAssinaturas";
import MasterLimites from "./pages/master/MasterLimites";
import MasterSuporte from "./pages/master/MasterSuporte";
import MasterSaude from "./pages/master/MasterSaude";
import MasterAuditoria from "./pages/master/MasterAuditoria";






const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<AuthPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/apresentacao" element={<Apresentacao />} />
            <Route path="/portal" element={<PortalEntrada />} />
            <Route path="/portal/:token" element={<PortalCliente />} />
            <Route path="/acesso-acompanhamento" element={<AcessoAcompanhamento />} />
            <Route path="/acompanhamento-publico" element={<AcompanhamentoPublico />} />

            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/acompanhamento-criacao" element={
                <ProtectedRoute roles={["admin"]}>
                  <AcompanhamentoCriacao />
                </ProtectedRoute>
              } />


              {/* Operação */}
              <Route path="/comercial" element={
                <ProtectedRoute roles={["admin","gerente","vendedor","franqueador","admin_master"]}>
                  <Comercial />
                </ProtectedRoute>
              } />
              <Route path="/contratos" element={
                <ProtectedRoute roles={["admin","gerente","vendedor","franqueador","admin_master"]}>
                  <Contratos />
                </ProtectedRoute>
              } />
              <Route path="/clientes" element={
                <ProtectedRoute roles={["admin","gerente","vendedor","franqueador","pos_venda","admin_master"]}>
                  <Clientes />
                </ProtectedRoute>
              } />
              <Route path="/clientes/:id" element={
                <ProtectedRoute roles={["admin","gerente","vendedor","franqueador","pos_venda","admin_master"]}>
                  <ClienteDetail />
                </ProtectedRoute>
              } />
              <Route path="/mensagens" element={<Mensagens />} />
              <Route path="/orcamentos/:id/negociacao" element={
                <ProtectedRoute roles={["admin","gerente","vendedor","admin_master"]}>
                  <OrcamentoNegociacao />
                </ProtectedRoute>
              } />
              <Route path="/contratos/:id" element={<ContratoDetail />} />
              <Route path="/contratos/:id/medicao" element={
                <ProtectedRoute roles={["admin","gerente","tecnico","medidor","admin_master"]}>
                  <ContratoMedicao />
                </ProtectedRoute>
              } />
              <Route path="/contratos/:id/conferencia" element={
                <ProtectedRoute roles={["admin","gerente","tecnico","conferente","admin_master"]}>
                  <ContratoConferencia />
                </ProtectedRoute>
              } />
              <Route path="/contratos/novo" element={
                <ProtectedRoute roles={["admin","gerente","vendedor","admin_master"]}>
                  <NewContract />
                </ProtectedRoute>
              } />
              <Route path="/tecnico" element={
                <ProtectedRoute roles={["admin","gerente","tecnico","medidor","conferente","franqueador","admin_master"]}>
                  <Tecnico />
                </ProtectedRoute>
              } />
              <Route path="/producao" element={
                <ProtectedRoute roles={["admin","gerente","tecnico","franqueador","admin_master"]}>
                  <Producao />
                </ProtectedRoute>
              } />
              <Route path="/logistica" element={
                <ProtectedRoute roles={["admin","gerente","logistico","franqueador","admin_master"]}>
                  <Logistica />
                </ProtectedRoute>
              } />
              <Route path="/montagem" element={
                <ProtectedRoute roles={["admin","gerente","montador","tecnico","franqueador","admin_master"]}>
                  <Montagem />
                </ProtectedRoute>
              } />
              <Route path="/pos-venda" element={
                <ProtectedRoute roles={["admin","gerente","pos_venda","franqueador","admin_master"]}>
                  <PosVenda />
                </ProtectedRoute>
              } />
              <Route path="/dre" element={
                <ProtectedRoute roles={["admin","gerente","franqueador","financeiro","admin_master"]}>
                  <Dre />
                </ProtectedRoute>
              } />

              {/* Gestão */}
              <Route path="/financeiro" element={
                <ProtectedRoute roles={["admin","gerente","franqueador","financeiro","admin_master"]}>
                  <Financeiro />
                </ProtectedRoute>
              } />
              <Route path="/comissoes" element={
                <ProtectedRoute roles={["admin","gerente","financeiro","admin_master"]}>
                  <Comissoes />
                </ProtectedRoute>
              } />
              <Route path="/compras" element={
                <ProtectedRoute roles={["admin","gerente","comprador","almoxarife","admin_master"]}>
                  <Compras />
                </ProtectedRoute>
              } />
              <Route path="/almoxarifado" element={
                <ProtectedRoute roles={["admin","gerente","almoxarife","comprador","franqueador","admin_master"]}>
                  <Almoxarifado />
                </ProtectedRoute>
              } />
              <Route path="/equipe" element={
                <ProtectedRoute roles={["admin","gerente","admin_master"]}>
                  <Equipe />
                </ProtectedRoute>
              } />
              <Route path="/rh" element={
                <ProtectedRoute roles={["admin","gerente","franqueador","rh","admin_master"]}>
                  <RH />
                </ProtectedRoute>
              } />
              <Route path="/operacao/execucao" element={
                <ProtectedRoute roles={["admin","gerente","admin_master"]}>
                  <Execucao />
                </ProtectedRoute>
              } />
              <Route path="/operacao/indicadores" element={
                <ProtectedRoute roles={["admin","gerente","admin_master"]}>
                  <IndicadoresOperacionais />
                </ProtectedRoute>
              } />
              <Route path="/lojas" element={
                <ProtectedRoute roles={["admin","franqueador","admin_master"]} redirectTo="/" redirectMessage="Acesso restrito">
                  <Lojas />
                </ProtectedRoute>
              } />
              <Route path="/lojas/:id" element={
                <ProtectedRoute roles={["admin","franqueador","admin_master"]} redirectTo="/" redirectMessage="Acesso restrito">
                  <LojaDetail />
                </ProtectedRoute>
              } />

              {/* Inteligência */}
              <Route path="/analytics" element={
                <ProtectedRoute roles={["admin","gerente","franqueador","admin_master"]}>
                  <Analytics />
                </ProtectedRoute>
              } />
              <Route path="/integracoes" element={
                <ProtectedRoute roles={["admin","gerente","admin_master"]}>
                  <Integracoes />
                </ProtectedRoute>
              } />
              <Route path="/comunicacoes/envios" element={
                <ProtectedRoute roles={["admin","gerente","admin_master"]}>
                  <CentralComunicacao />
                </ProtectedRoute>
              } />
              <Route path="/configuracoes/pagamento" element={
                <ProtectedRoute roles={["admin","gerente","admin_master"]}>
                  <ConfigPagamento />
                </ProtectedRoute>
              } />
              <Route path="/configuracoes/fornecedores" element={
                <ProtectedRoute roles={["admin","gerente","admin_master"]}>
                  <ConfigFornecedores />
                </ProtectedRoute>
              } />
              <Route path="/configuracoes/automacoes" element={
                <ProtectedRoute roles={["admin","gerente","franqueador","admin_master"]}>
                  <Automacoes />
                </ProtectedRoute>
              } />
              <Route path="/estimativa-orcamento" element={<EstimativaOrcamento />} />
              <Route path="/notificacoes" element={<Notificacoes />} />
              <Route path="/configuracao-inicial" element={
                <ProtectedRoute roles={["admin", "gerente", "franqueador", "admin_master"]}>
                  <ConfiguracaoInicial />
                </ProtectedRoute>
              } />
              <Route path="/campo" element={
                <ProtectedRoute roles={["admin", "gerente", "tecnico", "medidor", "conferente", "logistico", "montador", "pos_venda", "almoxarife", "admin_master"]}>
                  <ModoCampo />
                </ProtectedRoute>
              } />
              <Route path="/sem-permissao" element={<SemPermissao />} />
            </Route>

            <Route
              path="/master"
              element={
                <MasterProtectedRoute>
                  <MasterLayout />
                </MasterProtectedRoute>
              }
            >
              <Route index element={<MasterDashboard />} />
              <Route path="clientes" element={<MasterClientes />} />
              <Route path="lojas" element={<MasterLojas />} />
              <Route path="planos" element={<MasterPlanos />} />
              <Route path="assinaturas" element={<MasterAssinaturas />} />
              <Route path="limites" element={<MasterLimites />} />
              <Route path="suporte" element={<MasterSuporte />} />
              <Route path="saude" element={<MasterSaude />} />
              <Route path="auditoria" element={<MasterAuditoria />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
