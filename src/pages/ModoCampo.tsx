import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  ClipboardCheck, 
  Truck, 
  Wrench, 
  HeadphonesIcon, 
  Warehouse,
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  User,
  Building2,
  Camera,
  Signature
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { canPerform } from "@/lib/permissions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ModoCampo() {
  const { perfil, roles } = useAuth();
  const [tab, setTab] = useState("hoje");

  const canSeeMedicoes = canPerform(roles, "campo.medicoes");
  const canSeeEntregas = canPerform(roles, "campo.entregas");
  const canSeeMontagens = canPerform(roles, "campo.montagens");
  const canSeePosVenda = canPerform(roles, "campo.pos_venda");
  const canSeeAlmoxarifado = canPerform(roles, "campo.almoxarifado");

  // Query de contadores pendentes (simulação ou real conforme permissão)
  const { data: counts, isLoading: loadingCounts } = useQuery({
    queryKey: ["campo-counts", perfil?.loja_id],
    queryFn: async () => {
      const loja_id = perfil?.loja_id;
      if (!loja_id) return {};

      const results: any = {};

      if (canSeeMedicoes) {
        const { count } = await supabase
          .from("contratos")
          .select("*", { count: "exact", head: true })
          .eq("loja_id", loja_id)
          .eq("status", "tecnico")
          .eq("sub_etapa_tecnico", "medicao");
        results.medicoes = count || 0;
      }

      if (canSeeEntregas) {
        const { count } = await supabase
          .from("entregas")
          .select("*", { count: "exact", head: true })
          .eq("loja_id", loja_id)
          .neq("status_visual", "entregue")
          .neq("status_visual", "cancelado");
        results.entregas = count || 0;
      }

      if (canSeeMontagens) {
        const { count } = await supabase
          .from("agendamentos_montagem")
          .select("*", { count: "exact", head: true })
          .eq("loja_id", loja_id)
          .neq("status", "concluido")
          .neq("status", "cancelado");
        results.montagens = count || 0;
      }

      if (canSeePosVenda) {
        const { count } = await supabase
          .from("chamados_pos_venda")
          .select("*", { count: "exact", head: true })
          .eq("loja_id", loja_id)
          .neq("status", "resolvido");
        results.chamados = count || 0;
      }

      if (canSeeAlmoxarifado) {
        const { count } = await supabase
          .from("expedicoes_almoxarifado")
          .select("*", { count: "exact", head: true })
          .eq("loja_id", loja_id)
          .eq("status", "separado");
        results.almoxarifado = count || 0;
      }

      return results;
    },
    enabled: !!perfil?.loja_id
  });

  const totalPendencias = useMemo(() => {
    if (!counts) return 0;
    return Object.values(counts).reduce((acc: number, curr: any) => acc + (curr || 0), 0);
  }, [counts]);

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto pb-20">
      {/* Topo - Saudação e Status */}
      <div className="flex flex-col gap-1 px-1 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 border border-blue-200">
              <User size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">Olá, {perfil?.nome?.split(" ")[0]}</h1>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <Building2 size={12} />
                <span>Unidade: {perfil?.loja_nome || "Loja Piloto"}</span>
              </div>
            </div>
          </div>
          <Badge variant="outline" className="bg-white text-blue-600 border-blue-200 px-2 py-1 h-fit flex gap-1 items-center">
            <Clock size={12} />
            <span>{totalPendencias} Pendências</span>
          </Badge>
        </div>
      </div>

      {/* Cards de Navegação Principal */}
      <div className="grid grid-cols-1 gap-4">
        {canSeeMedicoes && (
          <DashboardCard 
            title="Minhas Medições" 
            count={counts?.medicoes} 
            icon={ClipboardCheck} 
            color="amber"
            description="Medições e conferências técnicas"
            path="/tecnico"
          />
        )}
        {canSeeEntregas && (
          <DashboardCard 
            title="Minhas Entregas" 
            count={counts?.entregas} 
            icon={Truck} 
            color="blue"
            description="Entregas agendadas e materiais"
            path="/logistica"
          />
        )}
        {canSeeMontagens && (
          <DashboardCard 
            title="Minhas Montagens" 
            count={counts?.montagens} 
            icon={Wrench} 
            color="orange"
            description="Ordens de montagem e equipes"
            path="/montagem"
          />
        )}
        {canSeePosVenda && (
          <DashboardCard 
            title="Meus Chamados" 
            count={counts?.chamados} 
            icon={HeadphonesIcon} 
            color="red"
            description="Chamados e assistências técnicas"
            path="/pos-venda"
          />
        )}
        {canSeeAlmoxarifado && (
          <DashboardCard 
            title="Almoxarifado" 
            count={counts?.almoxarifado} 
            icon={Warehouse} 
            color="slate"
            description="Separações e estoque disponível"
            path="/almoxarifado"
          />
        )}
      </div>

      {/* Visão de Hoje / Tarefas do Dia */}
      <div className="flex flex-col gap-4 mt-2">
        <h2 className="text-lg font-bold text-slate-900 px-1">Agenda para Hoje</h2>
        
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid grid-cols-3 bg-slate-100 rounded-lg p-1 h-11">
            <TabsTrigger value="hoje" className="text-sm rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Hoje</TabsTrigger>
            <TabsTrigger value="pendentes" className="text-sm rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Pendentes</TabsTrigger>
            <TabsTrigger value="concluidas" className="text-sm rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Concluídas</TabsTrigger>
          </TabsList>
          
          <TabsContent value="hoje" className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <ListaAgenda tipo="hoje" counts={counts} />
          </TabsContent>
          <TabsContent value="pendentes" className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <ListaAgenda tipo="pendentes" counts={counts} />
          </TabsContent>
          <TabsContent value="concluidas" className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
               <CheckCircle2 size={40} className="mb-3 opacity-20" />
               <p className="text-sm">Nenhuma tarefa concluída hoje.</p>
             </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Notificações Operacionais Rápidas */}
      <div className="flex flex-col gap-3 px-1 mt-2">
         <h2 className="text-lg font-bold text-slate-900">Alertas Críticos</h2>
         <div className="flex flex-col gap-2">
            <AlertaOperacional 
              titulo="Montagem Aguardando Material" 
              descricao="Contrato #042 - Cliente Maria Silva" 
              cor="amber" 
            />
            <AlertaOperacional 
              titulo="Estoque Crítico: Corrediça 450mm" 
              descricao="Abaixo do estoque mínimo (3 un)" 
              cor="red" 
            />
         </div>
      </div>
    </div>
  );
}

function DashboardCard({ title, count, icon: Icon, color, description, path }: any) {
  const navigate = (p: string) => window.location.href = p;
  
  const colors: any = {
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    red: "bg-red-50 text-red-600 border-red-100",
    slate: "bg-slate-50 text-slate-600 border-slate-100",
  };

  return (
    <Card 
      className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98]"
      onClick={() => navigate(path)}
    >
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${colors[color]}`}>
            <Icon size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 line-clamp-1">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {count !== undefined && count > 0 && (
            <Badge className="bg-slate-900 text-white font-bold h-6 min-w-[24px] flex justify-center">{count}</Badge>
          )}
          <ChevronRight size={20} className="text-slate-300" />
        </div>
      </div>
    </Card>
  );
}

function ListaAgenda({ tipo, counts }: { tipo: string; counts: any }) {
  const { perfil, roles } = useAuth();
  
  // Realizar fetch de dados reais conforme o tipo e permissões
  // Por simplicidade neste scaffold, vamos simular uma lista baseada nos contadores se > 0
  const hasItems = counts && Object.values(counts).some((v: any) => v > 0);

  if (!hasItems && tipo === "hoje") {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
        <Package size={40} className="mb-3 opacity-20" />
        <p className="text-sm">Sua agenda está livre para hoje.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
       {/* Exemplo de Card Operacional Compacto */}
       {counts?.medicoes > 0 && (
         <ItemOperacional 
           categoria="Medição"
           cliente="João Carlos"
           contrato="#056"
           status="Pendente"
           data="Hoje, 09:00"
           icon={ClipboardCheck}
           cor="amber"
           path="/tecnico"
         />
       )}
       {counts?.entregas > 0 && (
         <ItemOperacional 
           categoria="Entrega"
           cliente="Ana Paula"
           contrato="#048"
           status="Em rota"
           data="Hoje, 14:00"
           icon={Truck}
           cor="blue"
           path="/logistica"
         />
       )}
       {counts?.montagens > 0 && (
         <ItemOperacional 
           categoria="Montagem"
           cliente="Carlos Eduardo"
           contrato="#039"
           status="Aguardando"
           data="Amanhã"
           icon={Wrench}
           cor="orange"
           path="/montagem"
         />
       )}
    </div>
  );
}

function ItemOperacional({ categoria, cliente, contrato, status, data, icon: Icon, cor, path }: any) {
  const navigate = (p: string) => window.location.href = p;

  const colors: any = {
    amber: "text-amber-600 bg-amber-50",
    blue: "text-blue-600 bg-blue-50",
    orange: "text-orange-600 bg-orange-50",
    red: "text-red-600 bg-red-50",
    slate: "text-slate-600 bg-slate-50",
  };

  return (
    <div 
      className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3 active:bg-slate-50"
      onClick={() => navigate(path)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-md ${colors[cor]}`}>
            <Icon size={14} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{categoria}</span>
        </div>
        <Badge variant="outline" className="text-[10px] font-bold px-1.5 h-5 bg-slate-50 border-slate-200">
          {status}
        </Badge>
      </div>
      
      <div>
        <div className="text-sm font-bold text-slate-900">{cliente}</div>
        <div className="text-xs text-slate-500">Contrato {contrato}</div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-50 pt-3 mt-1">
         <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Clock size={12} />
            <span>{data}</span>
         </div>
         <div className="flex gap-2">
            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-slate-100 text-slate-600">
               <Camera size={14} />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-slate-100 text-slate-600">
               <Signature size={14} />
            </Button>
            <Button size="sm" className="h-8 bg-blue-600 text-white rounded-lg px-3 text-xs font-bold">
               Abrir
            </Button>
         </div>
      </div>
    </div>
  );
}

function AlertaOperacional({ titulo, descricao, cor }: any) {
  const colors: any = {
    amber: "bg-amber-50 border-amber-200 text-amber-900",
    red: "bg-red-50 border-red-200 text-red-900",
  };
  
  const iconColors: any = {
    amber: "text-amber-500",
    red: "text-red-500",
  };

  return (
    <div className={`p-3 rounded-lg border flex gap-3 ${colors[cor]}`}>
      <AlertTriangle className={`shrink-0 h-5 w-5 ${iconColors[cor]}`} />
      <div className="flex flex-col gap-0.5">
        <div className="text-xs font-bold">{titulo}</div>
        <div className="text-[11px] opacity-80">{descricao}</div>
      </div>
    </div>
  );
}
