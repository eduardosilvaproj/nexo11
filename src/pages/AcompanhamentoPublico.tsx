import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  LogOut, 
  Clock,
  AlertCircle,
  Image as ImageIcon,
  ChevronRight
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function AcompanhamentoPublico() {
  const navigate = useNavigate();
  const serial = sessionStorage.getItem('acompanhamento_serial');
  const nomeCliente = sessionStorage.getItem('acompanhamento_nome_cliente');
  const [selectedPrint, setSelectedPrint] = React.useState<string | null>(null);

  React.useEffect(() => {
    const isValidated = sessionStorage.getItem('acompanhamento_serial_validado') === 'true';
    if (!isValidated || !serial) {
      navigate('/acesso-acompanhamento');
    }
  }, [navigate, serial]);

  const { data: modulos, isLoading } = useQuery({
    queryKey: ['acompanhamento_publico', serial],
    queryFn: async () => {
      if (!serial) return [];
      const { data, error } = await supabase.rpc('get_acompanhamento_publico', {
        p_serial: serial
      });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!serial
  });

  const handleLogout = () => {
    sessionStorage.removeItem('acompanhamento_serial_validado');
    sessionStorage.removeItem('acompanhamento_serial');
    sessionStorage.removeItem('acompanhamento_nome_cliente');
    navigate('/acesso-acompanhamento');
    toast.success("Sessão encerrada");
  };

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
      nao_iniciado: 'border-slate-200 bg-slate-100 text-slate-600',
      em_andamento: 'border-sky-200 bg-sky-50 text-sky-700',
      em_revisao: 'border-amber-200 bg-amber-50 text-amber-700',
      concluido: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      pausado: 'border-rose-200 bg-rose-50 text-rose-700'
    };
    return colors[status] || 'border-slate-200 bg-slate-100 text-slate-600';
  };

  const totalModulos = modulos?.length || 0;
  const progressoMedio = totalModulos
    ? Math.round(modulos.reduce((acc, modulo) => acc + Number(modulo.percentual || 0), 0) / totalModulos)
    : 0;
  const concluidos = modulos?.filter((modulo) => modulo.status === 'concluido' || modulo.aprovado).length || 0;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-950 md:p-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.08),transparent_32%)]" />
      {/* Header Público */}
      <div className="relative mx-auto mb-10 flex max-w-6xl flex-col gap-6 rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/70 backdrop-blur md:flex-row md:items-center md:justify-between md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <div className="flex h-20 w-36 items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-inner shadow-slate-100">
            <img src="/nexo-logo.png" alt="NEXO Logo" className="h-auto w-28 object-contain" />
          </div>
          <div className="space-y-3">
            <Badge variant="outline" className="rounded-full border-sky-200 bg-sky-50 text-[10px] font-black uppercase tracking-[0.22em] text-sky-700">
              Portal do cliente
            </Badge>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">Acompanhamento da Criação</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Olá, <span className="font-bold text-slate-800">{nomeCliente}</span>. Este é o status atual da evolução do seu sistema.
              </p>
            </div>
          </div>
        </div>
        <Button variant="outline" className="gap-2 rounded-2xl border-slate-200 bg-white font-bold text-slate-700 shadow-sm hover:bg-slate-100" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>

      <div className="relative mx-auto max-w-6xl space-y-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="rounded-[1.75rem] border-slate-200 bg-white shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Progresso médio</p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <span className="text-4xl font-black text-slate-950">{progressoMedio}%</span>
                <Progress value={progressoMedio} className="mb-3 h-2 w-28 bg-slate-100" />
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-[1.75rem] border-slate-200 bg-white shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Módulos mapeados</p>
              <p className="mt-3 text-4xl font-black text-slate-950">{totalModulos}</p>
            </CardContent>
          </Card>
          <Card className="rounded-[1.75rem] border-slate-200 bg-white shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Aprovados/concluídos</p>
              <p className="mt-3 text-4xl font-black text-emerald-600">{concluidos}</p>
            </CardContent>
          </Card>
        </div>
        {modulos && modulos.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {modulos.map((modulo) => (
              <Card key={modulo.id} className="flex h-full flex-col overflow-hidden rounded-[1.75rem] border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/80">
                <CardHeader className="pb-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      {modulo.area}
                    </Badge>
                    <Badge className={`${getStatusColor(modulo.status)} rounded-full border font-bold`} variant="secondary">
                      {getStatusLabel(modulo.status)}
                    </Badge>
                  </div>
                  <CardTitle className="flex items-center gap-2 text-xl font-black leading-tight text-slate-950">
                    {modulo.nome}
                    {modulo.aprovado && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col space-y-6">
                  {/* Resumo e Progresso */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-slate-500">Evolução</span>
                        <span className="font-black text-slate-950">{modulo.percentual}%</span>
                      </div>
                      <Progress value={modulo.percentual} className="h-2 bg-slate-100" />
                    </div>

                    {modulo.resumo_modulo && (
                      <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-sm leading-relaxed text-slate-600">
                        {modulo.resumo_modulo}
                      </div>
                    )}
                  </div>

                  {/* Listas em Acordion Simples/Grid */}
                  <div className="flex-1 space-y-4">
                    {modulo.funcionalidades_json?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Funcionalidades</h4>
                        <ul className="space-y-2">
                          {modulo.funcionalidades_json.slice(0, 3).map((item: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                              <ChevronRight className="mt-1 h-3 w-3 shrink-0 text-sky-500" />
                              <span className="truncate">{item}</span>
                            </li>
                          ))}
                          {modulo.funcionalidades_json.length > 3 && (
                            <li className="pl-5 text-xs font-medium text-slate-400">
                              + {modulo.funcionalidades_json.length - 3} itens
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    {modulo.proximos_passos_json?.length > 0 && (
                      <div className="space-y-2 border-t border-slate-100 pt-4">
                        <h4 className="text-xs font-black uppercase tracking-[0.16em] text-sky-600">Próximos passos</h4>
                        <ul className="space-y-2">
                          {modulo.proximos_passos_json.slice(0, 2).map((item: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-500">
                              <Clock className="mt-1 h-3 w-3 shrink-0 text-sky-500" />
                              <span className="truncate">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Visualização de Print */}
                  <div className="mt-auto flex flex-col gap-3 border-t border-slate-100 pt-4">
                    {modulo.print_url ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full gap-2 rounded-2xl border border-sky-100 bg-sky-50 font-bold text-sky-700 hover:bg-sky-100"
                        onClick={() => setSelectedPrint(modulo.print_url)}
                      >
                        <ImageIcon className="h-4 w-4" />
                        Ver print da tela
                      </Button>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Print ainda não disponível
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4 rounded-[2rem] border border-dashed border-slate-300 bg-white/80 py-20 text-center shadow-sm">
            <AlertCircle className="h-12 w-12 text-slate-300" />
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-950">Nenhum módulo encontrado</h3>
              <p className="text-slate-500">O acompanhamento ainda não possui dados registrados para este código.</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Visualização de Print */}
      <Dialog open={!!selectedPrint} onOpenChange={() => setSelectedPrint(null)}>
        <DialogContent className="max-w-5xl overflow-hidden rounded-[2rem] border-slate-200 bg-white p-0 text-slate-950 shadow-2xl">
          <DialogHeader className="border-b border-slate-100 p-5">
            <DialogTitle className="font-black">Visualização da Tela</DialogTitle>
          </DialogHeader>
          <div className="relative flex min-h-[50vh] items-center justify-center bg-slate-100 p-4">
            {selectedPrint && (
              <img
                src={selectedPrint}
                alt="Print do Módulo"
                className="h-auto max-w-full rounded-2xl shadow-2xl shadow-slate-300/60"
                onError={(e) => {
                  (e.target as any).src = 'https://placehold.co/1200x800?text=URL+da+Imagem+Invalida';
                }}
              />
            )}
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 bg-white p-4">
            <Button variant="outline" size="sm" className="rounded-2xl border-slate-200 font-bold" onClick={() => window.open(selectedPrint!, '_blank')}>
              Abrir em nova aba
            </Button>
            <Button variant="default" size="sm" className="rounded-2xl bg-slate-950 font-bold hover:bg-slate-800" onClick={() => setSelectedPrint(null)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
