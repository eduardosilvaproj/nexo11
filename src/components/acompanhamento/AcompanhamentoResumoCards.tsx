import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, Percent, Package } from "lucide-react";

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
    { title: "Total de Módulos", value: total, icon: Package, color: "text-sky-600", bg: "bg-sky-50" },
    { title: "Concluídos", value: concluidos, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { title: "Em Revisão", value: emRevisao, icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
    { title: "Aprovados", value: aprovados, icon: CheckCircle2, color: "text-teal-600", bg: "bg-teal-50" },
    { title: "Evolução Geral", value: `${percentualGeral}%`, icon: Percent, color: "text-violet-600", bg: "bg-violet-50" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {stats.map((stat, i) => (
        <Card key={i} className="border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{stat.title}</CardTitle>
            <div className={`rounded-2xl ${stat.bg} p-2`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tight text-slate-950">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
