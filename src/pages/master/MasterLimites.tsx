import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export default function MasterLimites() {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Busca estatísticas por cliente (join entre clientes, assinaturas e planos)
        const { data, error } = await supabase
          .from("saas_clients")
          .select(`
            id,
            nome_empresa,
            saas_subscriptions (
              status,
              saas_plans (
                nome,
                limite_lojas,
                limite_usuarios
              )
            )
          `);

        if (error) throw error;

        // Complementa com contagem real de lojas
        const enriched = await Promise.all((data || []).map(async (client: any) => {
          const { count } = await supabase
            .from("lojas")
            .select('*', { count: 'exact', head: true })
            .eq("saas_client_id", client.id);
          
          return {
            ...client,
            lojas_count: count || 0
          };
        }));

        setStats(enriched);
      } catch (e: any) {
        toast.error("Erro ao carregar estatísticas: " + e.message);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Limites & Consumo SaaS</h1>
        <p className="text-muted-foreground">Monitoramento de recursos utilizados por cliente vs plano contratado</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
           <p className="text-sm text-muted-foreground">Calculando consumo...</p>
        ) : stats.map(s => {
          const sub = s.saas_subscriptions?.[0];
          const plan = sub?.saas_plans;
          const limitStores = plan?.limite_lojas || 1;
          const usageStoresPercent = Math.min((s.lojas_count / limitStores) * 100, 100);

          return (
            <Card key={s.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold truncate">{s.nome_empresa}</CardTitle>
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Plano: {plan?.nome || "Sem Plano"}</span>
                  <span className={sub?.status === 'active' ? 'text-green-600' : 'text-red-600'}>
                    {sub?.status || 'Inativo'}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span>Lojas Utilizadas</span>
                    <span>{s.lojas_count} / {limitStores}</span>
                  </div>
                  <Progress value={usageStoresPercent} className="h-1.5" />
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-[10px] pt-2 border-t">
                  <div>
                    <p className="text-muted-foreground">Usuários (Plano)</p>
                    <p className="font-bold">{plan?.limite_usuarios || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status Assinatura</p>
                    <p className="font-bold">{sub?.status === 'active' ? 'Ok' : 'Bloqueado'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
