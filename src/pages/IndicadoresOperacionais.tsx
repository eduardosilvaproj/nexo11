import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IndicadoresVisaoGeral } from "@/components/operacao/IndicadoresVisaoGeral";
import { IndicadoresSLA } from "@/components/operacao/IndicadoresSLA";
import { IndicadoresQualidade } from "@/components/operacao/IndicadoresQualidade";
import { BarChart3, Clock, ShieldCheck, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { canPerform } from "@/lib/permissions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function IndicadoresOperacionaisPage() {
  const [activeTab, setActiveTab] = useState("visao-geral");
  const { roles } = useAuth();

  if (!canPerform(roles || [], "operacao.indicadores.view")) {
    return (
      <AppLayout>
        <div className="p-8">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Acesso Negado</AlertTitle>
            <AlertDescription>
              Você não tem permissão para visualizar os indicadores operacionais.
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Indicadores Operacionais</h2>
            <p className="text-sm text-slate-500">Métricas reais de execução, prazos e qualidade.</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-100/50 p-1">
            <TabsTrigger value="visao-geral" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="sla" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              SLA e Prazos
            </TabsTrigger>
            <TabsTrigger value="qualidade" className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Qualidade
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visao-geral">
            <IndicadoresVisaoGeral />
          </TabsContent>

          <TabsContent value="sla">
            <IndicadoresSLA />
          </TabsContent>

          <TabsContent value="qualidade">
            <IndicadoresQualidade />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
