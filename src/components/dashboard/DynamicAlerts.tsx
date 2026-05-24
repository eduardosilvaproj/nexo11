import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { canPerform } from "@/lib/permissions";
import { 
  AlertCircle, 
  Clock, 
  Package, 
  ShoppingCart, 
  Truck, 
  Wrench, 
  MessageSquare,
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  type: 'danger' | 'warning' | 'info';
  icon: any;
  title: string;
  description: string;
  link: string;
  modulo: string;
}

export function DynamicAlerts() {
  const { roles, perfil } = useAuth();
  
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["dynamic-alerts", roles, perfil?.loja_id],
    enabled: !!perfil?.loja_id,
    queryFn: async () => {
      const activeAlerts: Alert[] = [];
      const tiendaId = perfil?.loja_id;

      // 1. Financeiro / Gestão
      if (canPerform(roles, "financeiro.view")) {
        // Contas a Receber Vencidas
        const { count: recVencidos } = await supabase
          .from("financeiro_contas_receber")
          .select("*", { count: 'exact', head: true })
          .eq("loja_id", tiendaId)
          .eq("status", "pendente")
          .lt("data_vencimento", new Date().toISOString());
        
        if (recVencidos && recVencidos > 0) {
          activeAlerts.push({
            id: 'fin-rec-vencidos',
            type: 'danger',
            icon: AlertCircle,
            title: `${recVencidos} Contas a Receber Vencidas`,
            description: 'Existem pagamentos de clientes em atraso.',
            link: '/financeiro',
            modulo: 'financeiro'
          });
        }

        // Contas a Pagar Vencendo Hoje/Vencidas
        const { count: pagVencidos } = await supabase
          .from("financeiro_contas_pagar")
          .select("*", { count: 'exact', head: true })
          .eq("loja_id", tiendaId)
          .eq("status", "pendente")
          .lte("data_vencimento", new Date().toISOString());

        if (pagVencidos && pagVencidos > 0) {
          activeAlerts.push({
            id: 'fin-pag-vencidos',
            type: 'warning',
            icon: Clock,
            title: `${pagVencidos} Contas a Pagar em Atraso/Hoje`,
            description: 'Atenção aos compromissos financeiros.',
            link: '/financeiro',
            modulo: 'financeiro'
          });
        }
      }

      // 2. Compras
      if (canPerform(roles, "compras.view")) {
        const { count: reqPendentes } = await supabase
          .from("requisicoes_compra")
          .select("*", { count: 'exact', head: true })
          .eq("loja_id", tiendaId)
          .in("status", ["aberta", "em_cotacao"]);

        if (reqPendentes && reqPendentes > 0) {
          activeAlerts.push({
            id: 'com-req-pendentes',
            type: 'info',
            icon: ShoppingCart,
            title: `${reqPendentes} Requisições de Compra`,
            description: 'Existem solicitações aguardando cotação ou compra.',
            link: '/compras',
            modulo: 'compras'
          });
        }
      }

      // 3. Almoxarifado / Estoque
      if (canPerform(roles, "almoxarifado.view")) {
        const { data: estoqueCritico } = await supabase
          .from("estoque_itens")
          .select("id")
          .eq("loja_id", tiendaId)
          .filter("quantidade", "lt", "estoque_minimo");

        if (estoqueCritico && estoqueCritico.length > 0) {
          activeAlerts.push({
            id: 'alm-estoque-critico',
            type: 'danger',
            icon: Package,
            title: `${estoqueCritico.length} Itens com Estoque Crítico`,
            description: 'Itens abaixo do estoque mínimo configurado.',
            link: '/almoxarifado',
            modulo: 'almoxarifado'
          });
        }
      }

      // 4. Logística
      if (canPerform(roles, "logistica.view")) {
        const { count: entregasPendentes } = await supabase
          .from("expedicoes_almoxarifado" as any)
          .select("*", { count: 'exact', head: true })
          .eq("loja_id", tiendaId)
          .eq("status", "aguardando_entrega");

        if (entregasPendentes && entregasPendentes > 0) {
          activeAlerts.push({
            id: 'log-entregas',
            type: 'info',
            icon: Truck,
            title: `${entregasPendentes} Entregas Aguardando`,
            description: 'Materiais prontos para serem entregues.',
            link: '/logistica',
            modulo: 'logistica'
          });
        }
      }

      // 5. Montagem
      if (canPerform(roles, "montagem.view")) {
        // Obter contratos da loja primeiro para filtrar
        const { data: storeContratos } = await supabase.from("contratos").select("id").eq("loja_id", tiendaId);
        const contratoIds = (storeContratos ?? []).map(c => c.id);

        if (contratoIds.length > 0) {
          const { count: montagensHoje } = await supabase
            .from("agendamentos_montagem")
            .select("*", { count: 'exact', head: true })
            .in("contrato_id", contratoIds)
            .eq("status", "agendado")
            .eq("data", new Date().toISOString().split('T')[0]);

          if (montagensHoje && montagensHoje > 0) {
            activeAlerts.push({
              id: 'mon-hoje',
              type: 'warning',
              icon: Wrench,
              title: `${montagensHoje} Montagens para Hoje`,
              description: 'Confira o cronograma de montagens do dia.',
              link: '/montagem',
              modulo: 'montagem'
            });
          }
        }
      }

      // 6. Pós-venda
      if (canPerform(roles, "pos_venda.view")) {
        const { data: storeContratos } = await supabase.from("contratos").select("id").eq("loja_id", tiendaId);
        const contratoIds = (storeContratos ?? []).map(c => c.id);

        if (contratoIds.length > 0) {
          const { count: chamadosAbertos } = await supabase
            .from("chamados_pos_venda")
            .select("*", { count: 'exact', head: true })
            .in("contrato_id", contratoIds)
            .eq("status", "aberto");

          if (chamadosAbertos && chamadosAbertos > 0) {
            activeAlerts.push({
              id: 'pos-chamados',
              type: 'info',
              icon: MessageSquare,
              title: `${chamadosAbertos} Chamados de Pós-venda`,
              description: 'Novos chamados aguardando atendimento.',
              link: '/pos-venda',
              modulo: 'pos_venda'
            });
          }
        }
      }

      // 7. Gestão - Contratos Parados (> 15 dias)
      if (canPerform(roles, "analytics.view")) {
        const quinzeDiasAtras = new Date();
        quinzeDiasAtras.setDate(quinzeDiasAtras.getDate() - 15);
        
        const { count: contratosParados } = await supabase
          .from("contratos")
          .select("*", { count: 'exact', head: true })
          .eq("loja_id", tiendaId)
          .not("status", "in", '("concluido", "cancelado")')
          .lt("updated_at", quinzeDiasAtras.toISOString());

        if (contratosParados && contratosParados > 0) {
          activeAlerts.push({
            id: 'ges-contratos-parados',
            type: 'warning',
            icon: AlertCircle,
            title: `${contratosParados} Contratos Parados`,
            description: 'Contratos sem movimentação há mais de 15 dias.',
            link: '/analytics',
            modulo: 'gestao'
          });
        }
      }

      return activeAlerts;
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
        <CheckCircle2 className="h-8 w-8 text-slate-300 mb-2" />
        <p className="text-sm text-slate-500 font-medium">Nenhum alerta prioritário</p>
        <p className="text-xs text-slate-400 mt-0.5">Sua operação está em dia.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
      {alerts.slice(0, 4).map((alert) => (
        <Link 
          key={alert.id} 
          to={alert.link}
          className={cn(
            "group relative flex items-start gap-4 p-4 rounded-xl border transition-all hover:shadow-md",
            alert.type === 'danger' ? "bg-red-50/50 border-red-100 hover:border-red-200" :
            alert.type === 'warning' ? "bg-orange-50/50 border-orange-100 hover:border-orange-200" :
            "bg-blue-50/50 border-blue-100 hover:border-blue-200"
          )}
        >
          <div className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg shadow-sm",
            alert.type === 'danger' ? "bg-red-100 text-red-600" :
            alert.type === 'warning' ? "bg-orange-100 text-orange-600" :
            "bg-blue-100 text-blue-600"
          )}>
            <alert.icon size={20} />
          </div>
          
          <div className="flex-1 min-w-0 pr-4">
            <h4 className={cn(
              "text-sm font-semibold truncate",
              alert.type === 'danger' ? "text-red-900" :
              alert.type === 'warning' ? "text-orange-900" :
              "text-blue-900"
            )}>
              {alert.title}
            </h4>
            <p className={cn(
              "text-xs line-clamp-1 mt-0.5",
              alert.type === 'danger' ? "text-red-700" :
              alert.type === 'warning' ? "text-orange-700" :
              "text-blue-700"
            )}>
              {alert.description}
            </p>
          </div>
          
          <ArrowRight 
            size={16} 
            className={cn(
              "absolute right-4 top-1/2 -translate-y-1/2 transition-transform group-hover:translate-x-1",
              alert.type === 'danger' ? "text-red-400" :
              alert.type === 'warning' ? "text-orange-400" :
              "text-blue-400"
            )} 
          />
        </Link>
      ))}
      
      {alerts.length > 4 && (
        <Button variant="ghost" size="sm" className="w-full text-xs text-slate-500 hover:text-primary" asChild>
          <Link to="/notificacoes">
            Ver todos os {alerts.length} alertas
          </Link>
        </Button>
      )}
    </div>
  );
}
