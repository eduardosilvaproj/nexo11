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
import Placeholder from "./pages/Placeholder";
import Comercial from "./pages/Comercial";
import Clientes from "./pages/Clientes";
import ClienteDetail from "./pages/ClienteDetail";
import Tecnico from "./pages/Tecnico";
import Producao from "./pages/Producao";
import Logistica from "./pages/Logistica";
import Montagem from "./pages/Montagem";
import Equipe from "./pages/Equipe";

import PosVenda from "./pages/PosVenda";
import Dre from "./pages/Dre";
import Financeiro from "./pages/Financeiro";
import Comissoes from "./pages/Comissoes";
import ContratoDetail from "./pages/ContratoDetail";
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
import ConfigMontadores from "./pages/ConfigMontadores";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/portal" element={<PortalEntrada />} />
            <Route path="/portal/:token" element={<PortalCliente />} />

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
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/clientes/:id" element={<ClienteDetail />} />
              <Route path="/orcamentos/:id/negociacao" element={
                <ProtectedRoute roles={["admin","gerente","vendedor"]}>
                  <OrcamentoNegociacao />
                </ProtectedRoute>
              } />
              <Route path="/contratos/:id" element={<ContratoDetail />} />
              <Route path="/tecnico" element={
                <ProtectedRoute roles={["admin","gerente","tecnico","franqueador"]}>
                  <Tecnico />
                </ProtectedRoute>
              } />
              <Route path="/producao" element={
                <ProtectedRoute roles={["admin","gerente","tecnico","franqueador"]}>
                  <Producao />
                </ProtectedRoute>
              } />
              <Route path="/logistica" element={
                <ProtectedRoute roles={["admin","gerente","tecnico","franqueador"]}>
                  <Logistica />
                </ProtectedRoute>
              } />
              <Route path="/montagem" element={
                <ProtectedRoute roles={["admin","gerente","montador","tecnico","franqueador"]}>
                  <Montagem />
                </ProtectedRoute>
              } />
              <Route path="/pos-venda" element={<PosVenda />} />
              <Route path="/dre" element={
                <ProtectedRoute roles={["admin","gerente","franqueador"]}>
                  <Dre />
                </ProtectedRoute>
              } />

              {/* Gestão */}
              <Route path="/financeiro" element={
                <ProtectedRoute roles={["admin","gerente","franqueador"]}>
                  <Financeiro />
                </ProtectedRoute>
              } />
              <Route path="/comissoes" element={
                <ProtectedRoute roles={["admin","gerente"]}>
                  <Comissoes />
                </ProtectedRoute>
              } />
              <Route path="/compras" element={
                <ProtectedRoute roles={["admin","gerente"]}>
                  <Placeholder title="NEXO Compras" />
                </ProtectedRoute>
              } />
              <Route path="/equipe" element={
                <ProtectedRoute roles={["admin","gerente"]}>
                  <Equipe />
                </ProtectedRoute>
              } />
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
              <Route path="/analytics" element={
                <ProtectedRoute roles={["admin","gerente","franqueador"]}>
                  <Analytics />
                </ProtectedRoute>
              } />
              <Route path="/integracoes" element={
                <ProtectedRoute roles={["admin","gerente"]}>
                  <Integracoes />
                </ProtectedRoute>
              } />
              <Route path="/configuracoes/pagamento" element={
                <ProtectedRoute roles={["admin","gerente"]}>
                  <ConfigPagamento />
                </ProtectedRoute>
              } />
              <Route path="/configuracoes/fornecedores" element={
                <ProtectedRoute roles={["admin","gerente"]}>
                  <ConfigFornecedores />
                </ProtectedRoute>
              } />
              <Route path="/configuracoes/montadores" element={
                <ProtectedRoute roles={["admin","gerente"]}>
                  <ConfigMontadores />
                </ProtectedRoute>
              } />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
