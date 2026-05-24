import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExecucaoHoje } from "@/components/operacao/ExecucaoHoje";
import { OcorrenciasList } from "@/components/operacao/OcorrenciasList";
import { Activity, AlertCircle, PlayCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { canPerform } from "@/lib/permissions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ExecucaoPage() {
  const [activeTab, setActiveTab] = useState("hoje");
  const { roles } = useAuth();

  if (!canPerform(roles || [], "operacao.execucao.view")) {
    return (
      <AppLayout>
        <div className="p-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Acesso Negado</AlertTitle>
            <AlertDescription>
              Você não tem permissão para acessar o painel de execução.
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold tracking-tight">Execução Operacional</h2>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="hoje" className="flex items-center gap-2">
              <PlayCircle className="w-4 h-4" />
              Execução de Hoje
            </TabsTrigger>
            <TabsTrigger value="ocorrencias" className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Ocorrências em Aberto
            </TabsTrigger>
            <TabsTrigger value="historico" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Histórico de Check-ins
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hoje" className="space-y-6">
            <ExecucaoHoje />
          </TabsContent>

          <TabsContent value="ocorrencias">
            <OcorrenciasList status="aberta" />
          </TabsContent>

          <TabsContent value="historico">
            <p className="text-slate-500 text-sm">Em breve: Relatórios avançados de produtividade e tempo médio de execução.</p>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
