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
      nao_iniciado: 'bg-gray-500/20 text-gray-400',
      em_andamento: 'bg-blue-500/20 text-blue-400',
      em_revisao: 'bg-yellow-500/20 text-yellow-400',
      concluido: 'bg-green-500/20 text-green-400',
      pausado: 'bg-red-500/20 text-red-400'
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400';
  };

  const funcionalidadesCount = Array.isArray(modulo.funcionalidades_json) ? modulo.funcionalidades_json.length : 0;
  const revisarCount = Array.isArray(modulo.revisar_items_json) ? modulo.revisar_items_json.length : 0;

  return (
    <Card className="bg-[#0c1526] border-white/10 hover:border-white/20 transition-all">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="space-y-1">
          <Badge variant="outline" className="text-[10px] font-normal uppercase tracking-wider bg-white/5 border-white/10 text-muted-foreground">
            {modulo.area}
          </Badge>
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            {modulo.nome}
            {modulo.aprovado && <CheckCircle2 className="h-4 w-4 text-green-500" />}
          </CardTitle>
        </div>
        <Badge className={getStatusColor(modulo.status)} variant="secondary">
          {getStatusLabel(modulo.status)}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progresso</span>
            <span>{modulo.percentual}%</span>
          </div>
          <Progress value={modulo.percentual} className="h-1.5" />
        </div>
        
        <div className="flex gap-4 text-xs text-muted-foreground">
          <div>
            <span className="text-white font-medium">{funcionalidadesCount}</span> Funcionalidades
          </div>
          <div>
            <span className="text-white font-medium">{revisarCount}</span> Pendências
          </div>
        </div>

        <div className="pt-2">
          <Button onClick={onEdit} variant="outline" size="sm" className="w-full gap-2 border-white/10 hover:bg-white/5">
            <Eye className="h-4 w-4" />
            Ver detalhes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
