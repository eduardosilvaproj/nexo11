import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  Camera, 
  FileSignature,
  Zap,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export function IndicadoresVisaoGeral() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["operacao-indicadores-geral"],
    queryFn: async () => {
      // In a real scenario, these would be complex aggregation queries
      // For now, we fetch the data and aggregate in JS
      const { data: checkins } = await supabase.from("operacao_checkins").select("*");
      const { data: ocorrencias } = await supabase.from("operacao_ocorrencias").select("*");
      
      const total = checkins?.length || 0;
      const concluidos = checkins?.filter(c => c.status === "concluido").length || 0;
      const emCurso = checkins?.filter(c => c.status === "iniciado").length || 0;
      const comOcorrencia = ocorrencias?.length || 0;

      // Group by module for the chart
      const byModule = checkins?.reduce((acc: any, c) => {
        acc[c.modulo] = (acc[c.modulo] || 0) + 1;
        return acc;
      }, {});

      const chartData = Object.keys(byModule || {}).map(key => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        total: byModule[key]
      }));

      return {
        total,
        concluidos,
        emCurso,
        comOcorrencia,
        chartData,
        taxaConclusao: total > 0 ? Math.round((concluidos / total) * 100) : 0
      };
    }
  });

  const exportCSV = () => {
    if (!stats) return;
    const headers = ["Indicador", "Valor"];
    const rows = [
      ["Total de Atividades", stats.total],
      ["Concluidas", stats.concluidos],
      ["Em Execucao", stats.emCurso],
      ["Ocorrencias", stats.comOcorrencia],
      ["Taxa de Conclusao", `${stats.taxaConclusao}%`]
    ];

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `indicadores_operacionais_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const cards = [
    { title: "Total de Atividades", value: stats?.total, icon: Zap, color: "text-blue-600", bg: "bg-blue-100" },
    { title: "Concluídas", value: stats?.concluidos, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100" },
    { title: "Em Execução", value: stats?.emCurso, icon: Clock, color: "text-orange-600", bg: "bg-orange-100" },
    { title: "Ocorrências", value: stats?.comOcorrencia, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-100" },
  ];

  if (isLoading) return <div className="p-8 text-center">Carregando indicadores...</div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={`p-2 rounded-full ${card.bg}`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value || 0}</div>
              {card.title === "Concluídas" && (
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.taxaConclusao}% de aproveitamento
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Distribuição por Módulo</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Status da Execução</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Concluído', value: stats?.concluidos },
                    { name: 'Em Curso', value: stats?.emCurso },
                    { name: 'Ocorrência', value: stats?.comOcorrencia },
                  ]}
                  cx="50%" cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#22c55e" />
                  <Cell fill="#3b82f6" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Legend />
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
