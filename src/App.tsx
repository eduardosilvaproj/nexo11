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
import Tecnico from "./pages/Tecnico";
import Producao from "./pages/Producao";
import Logistica from "./pages/Logistica";
import Montagem from "./pages/Montagem";
import ContratoDetail from "./pages/ContratoDetail";
import NotFound from "./pages/NotFound.tsx";

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
                <ProtectedRoute>
                  <Logistica />
                </ProtectedRoute>
              } />
              <Route path="/montagem" element={
                <ProtectedRoute>
                  <Montagem />
                </ProtectedRoute>
              } />
              <Route path="/pos-venda" element={<Placeholder title="NEXO Pós-venda" description="Chamados e NPS." />} />
              <Route path="/dre" element={<Placeholder title="NEXO DRE" description="Fechamento e margem realizada." />} />

              {/* Gestão */}
              <Route path="/financeiro" element={
                <ProtectedRoute roles={["admin","gerente","franqueador"]}>
                  <Placeholder title="NEXO Financeiro" />
                </ProtectedRoute>
              } />
              <Route path="/comissoes" element={
                <ProtectedRoute roles={["admin","gerente"]}>
                  <Placeholder title="NEXO Comissões" />
                </ProtectedRoute>
              } />
              <Route path="/compras" element={
                <ProtectedRoute roles={["admin","gerente"]}>
                  <Placeholder title="NEXO Compras" />
                </ProtectedRoute>
              } />
              <Route path="/equipe" element={
                <ProtectedRoute roles={["admin","gerente"]}>
                  <Placeholder title="NEXO Equipe" />
                </ProtectedRoute>
              } />
              <Route path="/lojas" element={
                <ProtectedRoute roles={["admin","franqueador"]}>
                  <Placeholder title="NEXO Lojas" description="Comparativo entre unidades." />
                </ProtectedRoute>
              } />

              {/* Inteligência */}
              <Route path="/analytics" element={<Placeholder title="NEXO Analytics" />} />
              <Route path="/integracoes" element={
                <ProtectedRoute roles={["admin"]}>
                  <Placeholder title="NEXO Integrações" />
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
