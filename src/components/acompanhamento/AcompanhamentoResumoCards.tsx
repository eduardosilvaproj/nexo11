import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ListTodo, AlertCircle, Percent, Package } from "lucide-react";

interface AcompanhamentoResumoCardsProps {
  modulos: any[];
}

export default function AcompanhamentoResumoCards({ modulos }: AcompanhamentoResumoCardsProps) {
  const total = modulos.length;
  const concluidos = modulos.filter(m => m.status === 'concluido').length;
  const emRevisao = modulos.filter(m => m.status === 'em_revisao').length;
  const aprovados = modulos.filter(m => m.aprovado).length;
  
  const percentualGeral = total > 0 
    ? Math.round(modulos.reduce((acc, curr) => acc + curr.percentual, 0) / total)
    : 0;

  const stats = [
    { title: "Total de Módulos", value: total, icon: Package, color: "text-blue-500" },
    { title: "Concluídos", value: concluidos, icon: CheckCircle2, color: "text-green-500" },
    { title: "Em Revisão", value: emRevisao, icon: AlertCircle, color: "text-yellow-500" },
    { title: "Aprovados", value: aprovados, icon: CheckCircle2, color: "text-emerald-500" },
    { title: "Evolução Geral", value: `${percentualGeral}%`, icon: Percent, color: "text-purple-500" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {stats.map((stat, i) => (
        <Card key={i} className="bg-[#0c1526] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
