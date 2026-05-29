import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";

interface AcompanhamentoModuloCardProps {
  modulo: any;
  onEdit: () => void;
}

export default function AcompanhamentoModuloCard({ modulo, onEdit }: AcompanhamentoModuloCardProps) {
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      nao_iniciado: 'Não iniciado',
      em_andamento: 'Em andamento',
      em_revisao: 'Em revisão',
      concluido: 'Concluído',
      pausado: 'Pausado'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      nao_iniciado: 'bg-slate-100 text-slate-600',
      em_andamento: 'bg-sky-100 text-sky-700',
      em_revisao: 'bg-amber-100 text-amber-700',
      concluido: 'bg-emerald-100 text-emerald-700',
      pausado: 'bg-rose-100 text-rose-700'
    };
    return colors[status] || 'bg-slate-100 text-slate-600';
  };

  const funcionalidadesCount = Array.isArray(modulo.funcionalidades_json) ? modulo.funcionalidades_json.length : 0;
  const revisarCount = Array.isArray(modulo.revisar_items_json) ? modulo.revisar_items_json.length : 0;

  return (
    <Card className="group overflow-hidden border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div className="min-w-0 space-y-2">
          <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            {modulo.area}
          </Badge>
          <CardTitle className="flex items-center gap-2 text-lg font-black leading-tight text-slate-950">
            <span className="line-clamp-2">{modulo.nome}</span>
            {modulo.aprovado && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
          </CardTitle>
        </div>
        <Badge className={`${getStatusColor(modulo.status)} shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold`} variant="secondary">
          {getStatusLabel(modulo.status)}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold text-slate-500">
            <span>Progresso</span>
            <span className="text-slate-900">{modulo.percentual}%</span>
          </div>
          <Progress value={modulo.percentual} className="h-2 bg-slate-100" />
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs text-slate-500">
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-xl font-black text-slate-950">{funcionalidadesCount}</div>
            <div className="font-medium">Funcionalidades</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-xl font-black text-slate-950">{revisarCount}</div>
            <div className="font-medium">Pendências</div>
          </div>
        </div>

        <Button onClick={onEdit} variant="outline" size="sm" className="w-full gap-2 rounded-2xl border-slate-200 bg-white font-bold hover:bg-slate-50">
          Ver detalhes
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
