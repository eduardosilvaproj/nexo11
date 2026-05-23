import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Eye, CheckCircle2 } from "lucide-react";

interface AcompanhamentoModuloCardProps {
  modulo: any;
  onEdit: () => void;
}

export default function AcompanhamentoModuloCard({ modulo, onEdit }: AcompanhamentoModuloCardProps) {
  const labels: Record<string, string> = {
    nao_iniciado: 'Não iniciado',
    em_andamento: 'Em andamento',
    em_revisao: 'Em revisão',
    concluido: 'Concluído',
    pausado: 'Pausado'
  };
  const statusVariant = (s: string): any => ({
    nao_iniciado: 'muted',
    em_andamento: 'info',
    em_revisao: 'warning',
    concluido: 'success',
    pausado: 'destructive'
  }[s] || 'muted');

  const funcionalidadesCount = Array.isArray(modulo.funcionalidades_json) ? modulo.funcionalidades_json.length : 0;
  const revisarCount = Array.isArray(modulo.revisar_items_json) ? modulo.revisar_items_json.length : 0;

  return (
    <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all">
      <CardHeader className="flex flex-row items-start justify-between pb-3">
        <div className="space-y-1.5">
          <Badge variant="muted" className="text-[10px] font-medium uppercase tracking-wider">
            {modulo.area}
          </Badge>
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            {modulo.nome}
            {modulo.aprovado && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          </CardTitle>
        </div>
        <Badge variant={statusVariant(modulo.status)}>{labels[modulo.status] || modulo.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Progresso</span>
            <span className="font-semibold text-slate-900 tabular-nums">{modulo.percentual}%</span>
          </div>
          <Progress value={modulo.percentual} className="h-1.5" />
        </div>

        <div className="flex gap-4 text-xs text-slate-500">
          <div><span className="text-slate-900 font-semibold">{funcionalidadesCount}</span> Funcionalidades</div>
          <div><span className="text-slate-900 font-semibold">{revisarCount}</span> Pendências</div>
        </div>

        <Button onClick={onEdit} variant="outline" size="sm" className="w-full gap-2">
          <Eye className="h-4 w-4" />
          Ver detalhes
        </Button>
      </CardContent>
    </Card>
  );
}
