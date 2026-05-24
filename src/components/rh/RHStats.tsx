import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, Clock, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function RHStats() {
  const { data: stats } = useQuery({
    queryKey: ["rh-stats"],
    queryFn: async () => {
      const { data: funcionarios } = await supabase
        .from("rh_funcionarios")
        .select("status");
      
      const { data: solicitacoes } = await supabase
        .from("rh_solicitacoes")
        .select("status");

      return {
        ativos: funcionarios?.filter(f => f.status === "ativo").length || 0,
        ferias: funcionarios?.filter(f => f.status === "ferias").length || 0,
        afastados: funcionarios?.filter(f => f.status === "afastado").length || 0,
        solicitacoesPendentes: solicitacoes?.filter(s => s.status === "enviada").length || 0,
      };
    }
  });

  const items = [
    {
      title: "Funcionários Ativos",
      value: stats?.ativos || 0,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      title: "Em Férias",
      value: stats?.ferias || 0,
      icon: Calendar,
      color: "text-green-600",
      bg: "bg-green-100",
    },
    {
      title: "Afastados",
      value: stats?.afastados || 0,
      icon: AlertCircle,
      color: "text-orange-600",
      bg: "bg-orange-100",
    },
    {
      title: "Solicitações Pendentes",
      value: stats?.solicitacoesPendentes || 0,
      icon: Clock,
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {items.map((item, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
            <div className={`p-2 rounded-full ${item.bg}`}>
              <item.icon className={`w-4 h-4 ${item.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
