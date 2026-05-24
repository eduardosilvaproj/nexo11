import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileCheck, 
   Timer,
   Info,
   Star
 } from "lucide-react";
import { format } from "date-fns";

interface Props {
  contratoId: string;
}

export function ContratoIndicadoresTab({ contratoId }: Props) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["contrato-indicadores", contratoId],
    queryFn: async () => {
      const { data: checkins } = await supabase
        .from("operacao_checkins")
        .select("*")
        .eq("contrato_id", contratoId);
      
      const { data: ocorrencias } = await supabase
        .from("operacao_ocorrencias")
        .select("*")
        .eq("contrato_id", contratoId);

       const { data: pesquisas } = await supabase
        .from("cliente_pesquisas")
        .select("*")
        .eq("contrato_id", contratoId)
        .eq("status", "respondida");

      const concluidos = checkins?.filter(c => c.status === "concluido") || [];
      const totalDuracao = concluidos.reduce((acc, c) => acc + (c.duracao_minutos || 0), 0);
      
      return {
        checkins: checkins || [],
        ocorrencias: ocorrencias || [],
        totalDuracao,
         numOcorrencias: ocorrencias?.length || 0,
        numCheckins: checkins?.length || 0,
        pesquisas: pesquisas || [],
        mediaNps: pesquisas?.length ? pesquisas.reduce((a, b) => a + (b.nota || 0), 0) / pesquisas.length : null
      };
    }
  });

  if (isLoading) return <div className="py-8 text-center text-slate-500">Carregando métricas...</div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
              <Timer className="w-3 h-3" />
              Tempo em Campo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalDuracao} min</div>
            <p className="text-[10px] text-slate-400 mt-1">Soma de todos os check-ins concluídos.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" />
              Ocorrências
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.numOcorrencias}</div>
            <p className="text-[10px] text-slate-400 mt-1">Total de incidentes registrados.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
              <FileCheck className="w-3 h-3" />
              Check-ins Reais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.numCheckins}</div>
            <p className="text-[10px] text-slate-400 mt-1">Registros de início/fim de atividade.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
              <Star className="w-3 h-3" />
              Satisfação (Média)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.mediaNps !== null ? stats?.mediaNps.toFixed(1) : "—"}</div>
            <p className="text-[10px] text-slate-400 mt-1">Média das pesquisas respondidas.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Histórico de Execução Real</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {stats?.checkins.length === 0 ? (
              <p className="text-sm text-slate-400 italic py-4 text-center">Nenhum check-in realizado para este contrato.</p>
            ) : stats?.checkins.map((c: any) => (
              <div key={c.id} className="flex items-start justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div>
                  <div className="text-xs font-bold text-slate-900 uppercase">{c.modulo}</div>
                  <div className="text-xs text-slate-500">{format(new Date(c.iniciado_em), "dd/MM/yyyy HH:mm")}</div>
                </div>
                <div className="text-right">
                  <Badge variant={c.status === 'concluido' ? 'default' : 'outline'}>{c.status}</Badge>
                  {c.duracao_minutos && <div className="text-[10px] text-slate-400 mt-1">{c.duracao_minutos} min</div>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Ocorrências Operacionais</CardTitle></CardHeader>
          <CardContent className="space-y-3">
             {stats?.ocorrencias.length === 0 ? (
              <p className="text-sm text-slate-400 italic py-4 text-center">Nenhuma ocorrência registrada.</p>
            ) : stats?.ocorrencias.map((o: any) => (
              <div key={o.id} className={`p-3 rounded-lg border ${o.status === 'aberta' ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-[10px] font-bold uppercase ${o.status === 'aberta' ? 'text-red-700' : 'text-slate-500'}`}>{o.tipo}</span>
                  <Badge variant={o.prioridade === 'critica' || o.prioridade === 'alta' ? 'destructive' : 'secondary'}>{o.prioridade}</Badge>
                </div>
                <div className="text-xs text-slate-700 leading-relaxed">{o.descricao}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Badge({ children, variant, className }: any) {
  const variants: any = {
    destructive: "bg-red-100 text-red-700 border-red-200",
    default: "bg-blue-100 text-blue-700 border-blue-200",
    secondary: "bg-slate-100 text-slate-700 border-slate-200",
    outline: "bg-white text-slate-500 border-slate-200"
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${variants[variant] || variants.default} ${className}`}>
      {children}
    </span>
  );
}
