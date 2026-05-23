import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, LogOut, Clock, Layout, AlertCircle,
  Image as ImageIcon, ChevronRight, Eye, Info, CheckCircle,
  FileText, Activity, ArrowRight, Check
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

const statusLabel = (s: string) => ({
  nao_iniciado: 'Não iniciado',
  em_andamento: 'Em andamento',
  em_revisao: 'Em revisão',
  concluido: 'Concluído',
  pausado: 'Pausado',
}[s] || s);

const statusVariant = (s: string): any => ({
  nao_iniciado: 'muted',
  em_andamento: 'info',
  em_revisao: 'warning',
  concluido: 'success',
  pausado: 'destructive',
}[s] || 'muted');

export default function AcompanhamentoPublico() {
  const navigate = useNavigate();
  const serial = sessionStorage.getItem('acompanhamento_serial');
  const nomeCliente = sessionStorage.getItem('acompanhamento_nome_cliente');
  const [selectedPrint, setSelectedPrint] = React.useState<string | null>(null);
  const [selectedModulo, setSelectedModulo] = React.useState<any | null>(null);

  React.useEffect(() => {
    const isValidated = sessionStorage.getItem('acompanhamento_serial_validado') === 'true';
    if (!isValidated || !serial) navigate('/acesso-acompanhamento');
  }, [navigate, serial]);

  const { data: modulos, isLoading } = useQuery({
    queryKey: ['acompanhamento_publico', serial],
    queryFn: async () => {
      if (!serial) return [];
      const { data, error } = await supabase.rpc('get_acompanhamento_publico', { p_serial: serial });
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

  if (isLoading) {
    return (
      <div className="min-h-screen nexo-gradient-soft flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen nexo-gradient-soft text-slate-900 p-4 md:p-10">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <img src="/nexo-logo.png" alt="NEXO Logo" className="w-28 h-auto object-contain mb-3" />
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">Acompanhamento da Criação</h1>
          <p className="text-slate-600">
            Olá, <span className="text-slate-900 font-semibold">{nomeCliente}</span>. Este é o status atual da evolução do seu sistema.
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>

      <div className="max-w-6xl mx-auto">
        {modulos && modulos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modulos.map((modulo) => (
              <Card key={modulo.id} className="flex flex-col h-full hover:shadow-md hover:-translate-y-0.5 transition-all">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <Badge variant="muted" className="uppercase text-[10px] tracking-wider">{modulo.area}</Badge>
                    <Badge variant={statusVariant(modulo.status)}>{statusLabel(modulo.status)}</Badge>
                  </div>
                  <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    {modulo.nome}
                    {modulo.aprovado && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 flex-1 flex flex-col">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Evolução</span>
                      <span className="font-semibold text-slate-900 tabular-nums">{modulo.percentual}%</span>
                    </div>
                    <Progress value={modulo.percentual} className="h-2" />
                  </div>

                  {modulo.resumo_modulo && (
                    <div className="bg-sky-50/60 rounded-xl p-3 text-sm text-slate-700 leading-relaxed border-l-2 border-primary">
                      {modulo.resumo_modulo}
                    </div>
                  )}

                  <div className="space-y-4 flex-1">
                    {modulo.funcionalidades_json?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-semibold uppercase text-slate-500 tracking-wider">Funcionalidades</h4>
                        <ul className="space-y-1">
                          {modulo.funcionalidades_json.slice(0, 3).map((item: string, i: number) => (
                            <li key={i} className="text-sm flex items-start gap-2 text-slate-700">
                              <ChevronRight className="h-3 w-3 mt-1 text-primary shrink-0" />
                              <span className="truncate">{item}</span>
                            </li>
                          ))}
                          {modulo.funcionalidades_json.length > 3 && (
                            <li className="text-xs text-slate-400 italic pl-5">
                              + {modulo.funcionalidades_json.length - 3} itens
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    {modulo.proximos_passos_json?.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <h4 className="text-[10px] font-semibold uppercase text-sky-600 tracking-wider">Próximos Passos</h4>
                        <ul className="space-y-1">
                          {modulo.proximos_passos_json.slice(0, 2).map((item: string, i: number) => (
                            <li key={i} className="text-sm flex items-start gap-2 text-slate-600">
                              <Clock className="h-3 w-3 mt-1 text-sky-500/70 shrink-0" />
                              <span className="truncate">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 mt-auto border-t border-slate-100 flex flex-col gap-2">
                    <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setSelectedModulo(modulo)}>
                      <Eye className="h-4 w-4" />
                      Ver detalhes completos
                    </Button>
                    {modulo.print_url && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full gap-2 bg-sky-50 hover:bg-sky-100 text-sky-700"
                        onClick={() => setSelectedPrint(modulo.print_url)}
                      >
                        <ImageIcon className="h-4 w-4" />
                        Ver print da tela
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="py-20">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                <AlertCircle className="h-7 w-7 text-slate-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-semibold text-slate-900">Nenhum módulo encontrado</h3>
                <p className="text-slate-500">O acompanhamento ainda não possui dados registrados para este código.</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Modal de Print */}
      <Dialog open={!!selectedPrint} onOpenChange={() => setSelectedPrint(null)}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b border-slate-100">
            <DialogTitle>Visualização da Tela</DialogTitle>
          </DialogHeader>
          <div className="relative bg-slate-100 flex items-center justify-center min-h-[50vh]">
            {selectedPrint && (
              <img
                src={selectedPrint}
                alt="Print do Módulo"
                className="max-w-full h-auto"
                onError={(e) => {
                  (e.target as any).src = 'https://placehold.co/1200x800?text=URL+da+Imagem+Invalida';
                }}
              />
            )}
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
            <Button variant="outline" size="sm" onClick={() => window.open(selectedPrint!, '_blank')}>
              Abrir em nova aba
            </Button>
            <Button variant="default" size="sm" onClick={() => setSelectedPrint(null)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de detalhes do módulo */}
      <Dialog open={!!selectedModulo} onOpenChange={() => setSelectedModulo(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="p-6 border-b border-slate-100 shrink-0">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="muted" className="uppercase text-[10px]">{selectedModulo?.area}</Badge>
                <Badge variant={selectedModulo ? statusVariant(selectedModulo.status) : 'muted'}>
                  {selectedModulo ? statusLabel(selectedModulo.status) : ""}
                </Badge>
              </div>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-slate-900">
                {selectedModulo?.nome}
                {selectedModulo?.aprovado && <CheckCircle2 className="h-6 w-6 text-emerald-500" />}
              </DialogTitle>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 p-6">
            <div className="space-y-8 pb-4">
              {/* Progresso */}
              <div className="bg-sky-50/60 rounded-2xl p-4 border border-sky-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-700 font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Evolução do Módulo
                  </span>
                  <span className="text-xl font-bold text-primary tabular-nums">{selectedModulo?.percentual}%</span>
                </div>
                <Progress value={selectedModulo?.percentual} className="h-2.5" />
              </div>

              {/* Resumo */}
              {selectedModulo?.resumo_modulo && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase text-slate-500 tracking-widest flex items-center gap-2">
                    <Info className="h-4 w-4" /> Resumo do Módulo
                  </h3>
                  <div className="bg-slate-50 rounded-xl p-4 text-slate-700 leading-relaxed border-l-4 border-primary">
                    {selectedModulo.resumo_modulo}
                  </div>
                </div>
              )}

              {/* Funcionalidades */}
              {selectedModulo?.funcionalidades_json?.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase text-slate-500 tracking-widest flex items-center gap-2">
                    <Layout className="h-4 w-4" /> Funcionalidades Implementadas
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedModulo.funcionalidades_json.map((item: string, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100/60 transition-colors">
                        <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                        <span className="text-sm text-slate-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {selectedModulo?.processos_json?.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase text-slate-500 tracking-widest flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Processos Mapeados
                    </h3>
                    <ul className="space-y-2">
                      {selectedModulo.processos_json.map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                          <ArrowRight className="h-3.5 w-3.5 mt-0.5 text-slate-400 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="space-y-6">
                  {selectedModulo?.ok_items_json?.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase text-emerald-600 tracking-widest flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" /> O que está OK
                      </h3>
                      <ul className="space-y-2">
                        {selectedModulo.ok_items_json.map((item: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedModulo?.revisar_items_json?.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase text-amber-600 tracking-widest flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" /> O que revisar
                      </h3>
                      <ul className="space-y-2">
                        {selectedModulo.revisar_items_json.map((item: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                            <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {selectedModulo?.proximos_passos_json?.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <h3 className="text-xs font-semibold uppercase text-primary tracking-widest flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Próximos Passos
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedModulo.proximos_passos_json.map((item: string, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="h-5 w-5 rounded-md bg-sky-100 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                        </div>
                        <span className="text-sm text-slate-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
            {selectedModulo?.print_url && (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setSelectedPrint(selectedModulo.print_url)}>
                <ImageIcon className="h-4 w-4" />
                Ver Print
              </Button>
            )}
            <Button variant="default" size="sm" onClick={() => setSelectedModulo(null)}>
              Fechar Detalhes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
