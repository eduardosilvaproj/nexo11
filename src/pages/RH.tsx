import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RHStats } from "@/components/rh/RHStats";
import { RHFuncionarios } from "@/components/rh/RHFuncionarios";
import { RHSolicitacoes } from "@/components/rh/RHSolicitacoes";
import { RHDocumentos } from "@/components/rh/RHDocumentos";
import { RHAusencias } from "@/components/rh/RHAusencias";
import { Users, FileText, Calendar, ClipboardCheck } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function RHPage() {
  const [activeTab, setActiveTab] = useState("visao-geral");
  const { canAccess } = usePermissions();

  if (!canAccess("rh.view")) {
    return (
      <AppLayout>
        <div className="p-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Acesso Negado</AlertTitle>
            <AlertDescription>
              Você não tem permissão para acessar o módulo de RH.
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Recursos Humanos">
      <div className="p-4 md:p-8 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <TabsList className="grid grid-cols-2 md:flex w-full md:w-auto overflow-x-auto">
              <TabsTrigger value="visao-geral" className="flex items-center gap-2">
                Visão Geral
              </TabsTrigger>
              <TabsTrigger value="funcionarios" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Funcionários
              </TabsTrigger>
              <TabsTrigger value="solicitacoes" className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4" />
                Solicitações
              </TabsTrigger>
              <TabsTrigger value="documentos" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Documentos
              </TabsTrigger>
              <TabsTrigger value="ausencias" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Ausências
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="visao-geral" className="space-y-6">
            <RHStats />
          </TabsContent>

          <TabsContent value="funcionarios">
            <RHFuncionarios />
          </TabsContent>

          <TabsContent value="solicitacoes">
            <RHSolicitacoes />
          </TabsContent>

          <TabsContent value="documentos">
            <RHDocumentos />
          </TabsContent>

          <TabsContent value="ausencias">
            <RHAusencias />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
