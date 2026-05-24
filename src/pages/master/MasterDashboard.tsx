import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Store, CreditCard, LifeBuoy } from "lucide-react";

export default function MasterDashboard() {
  const [stats, setStats] = useState({ clientes: 0, lojas: 0, assinaturas: 0, tickets: 0 });

  useEffect(() => {
    (async () => {
      const [c, l, s, t] = await Promise.all([
        supabase.from("saas_clients" as any).select("id", { count: "exact", head: true }),
        supabase.from("lojas").select("id", { count: "exact", head: true }),
        supabase.from("saas_subscriptions" as any).select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("saas_support_tickets" as any).select("id", { count: "exact", head: true }).eq("status", "aberto"),
      ]);
      setStats({
        clientes: c.count || 0,
        lojas: l.count || 0,
        assinaturas: s.count || 0,
        tickets: t.count || 0,
      });
    })();
  }, []);

  const cards = [
    { label: "Clientes", value: stats.clientes, icon: Users },
    { label: "Lojas ativas", value: stats.lojas, icon: Store },
    { label: "Assinaturas ativas", value: stats.assinaturas, icon: CreditCard },
    { label: "Tickets abertos", value: stats.tickets, icon: LifeBuoy },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard SaaS</h1>
        <p className="text-muted-foreground">Visão geral da plataforma</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
