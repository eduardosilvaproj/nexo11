import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, Percent, Package, ShieldCheck } from "lucide-react";

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
    { title: "Total de Módulos", value: total, icon: Package, tint: "bg-sky-50 text-sky-600" },
    { title: "Concluídos", value: concluidos, icon: CheckCircle2, tint: "bg-emerald-50 text-emerald-600" },
    { title: "Em Revisão", value: emRevisao, icon: AlertCircle, tint: "bg-amber-50 text-amber-600" },
    { title: "Aprovados", value: aprovados, icon: ShieldCheck, tint: "bg-emerald-50 text-emerald-600" },
    { title: "Evolução Geral", value: `${percentualGeral}%`, icon: Percent, tint: "bg-violet-50 text-violet-600" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {stats.map((stat, i) => (
        <Card key={i} className="hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.title}</span>
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${stat.tint}`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
