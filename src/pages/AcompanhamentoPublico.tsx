import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  LogOut, 
  Clock, 
  Layout, 
  Circle, 
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
      nao_iniciado: 'bg-gray-500/20 text-gray-400',
      em_andamento: 'bg-blue-500/20 text-blue-400',
      em_revisao: 'bg-yellow-500/20 text-yellow-400',
      concluido: 'bg-green-500/20 text-green-400',
      pausado: 'bg-red-500/20 text-red-400'
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-[#1a9be8] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-8">
      {/* Header Público */}
      <div className="max-w-6xl mx-auto mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <img src="/nexo-logo.png" alt="NEXO Logo" className="w-32 h-auto object-contain mb-4" />
          <h1 className="text-3xl font-bold">Acompanhamento da Criação</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            Olá, <span className="text-white font-medium">{nomeCliente}</span>. Este é o status atual da evolução do seu sistema.
          </p>
        </div>
        <Button variant="outline" className="border-white/10 hover:bg-white/5 gap-2" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>

      <div className="max-w-6xl mx-auto space-y-12">
        {modulos && modulos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modulos.map((modulo) => (
              <Card key={modulo.id} className="bg-[#0c1526] border-white/10 flex flex-col h-full shadow-lg">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <Badge variant="outline" className="bg-white/5 border-white/10 text-muted-foreground uppercase text-[10px]">
                      {modulo.area}
                    </Badge>
                    <Badge className={getStatusColor(modulo.status)} variant="secondary">
                      {getStatusLabel(modulo.status)}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                    {modulo.nome}
                    {modulo.aprovado && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 flex-1 flex flex-col">
                  {/* Resumo e Progresso */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Evolução</span>
                        <span className="font-bold">{modulo.percentual}%</span>
                      </div>
                      <Progress value={modulo.percentual} className="h-2" />
                    </div>

                    {modulo.resumo_modulo && (
                      <div className="bg-white/5 rounded-lg p-3 text-sm text-gray-300 leading-relaxed italic border-l-2 border-[#1a9be8]">
                        {modulo.resumo_modulo}
                      </div>
                    )}
                  </div>

                  {/* Listas em Acordion Simples/Grid */}
                  <div className="space-y-4 flex-1">
                    {modulo.funcionalidades_json?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Funcionalidades</h4>
                        <ul className="space-y-1">
                          {modulo.funcionalidades_json.slice(0, 3).map((item: string, i: number) => (
                            <li key={i} className="text-sm flex items-start gap-2 text-gray-300">
                              <ChevronRight className="h-3 w-3 mt-1 text-[#1a9be8] shrink-0" />
                              <span className="truncate">{item}</span>
                            </li>
                          ))}
                          {modulo.funcionalidades_json.length > 3 && (
                            <li className="text-xs text-muted-foreground italic pl-5">
                              + {modulo.funcionalidades_json.length - 3} itens
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    {modulo.proximos_passos_json?.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-white/5">
                        <h4 className="text-xs font-bold uppercase text-blue-400 tracking-wider">Próximos Passos</h4>
                        <ul className="space-y-1">
                          {modulo.proximos_passos_json.slice(0, 2).map((item: string, i: number) => (
                            <li key={i} className="text-sm flex items-start gap-2 text-gray-400">
                              <Clock className="h-3 w-3 mt-1 text-blue-400/60 shrink-0" />
                              <span className="truncate">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Visualização de Print */}
                  <div className="pt-4 mt-auto border-t border-white/5 flex flex-col gap-3">
                    {modulo.print_url ? (
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="w-full bg-[#1a9be8]/10 hover:bg-[#1a9be8]/20 text-[#1a9be8] border-none gap-2"
                        onClick={() => setSelectedPrint(modulo.print_url)}
                      >
                        <ImageIcon className="h-4 w-4" />
                        Ver print da tela
                      </Button>
                    ) : (
                      <div className="text-center py-2 bg-white/5 rounded text-[10px] text-muted-foreground uppercase tracking-widest">
                        Print ainda não disponível
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <div className="space-y-1">
              <h3 className="text-xl font-bold">Nenhum módulo encontrado</h3>
              <p className="text-muted-foreground">O acompanhamento ainda não possui dados registrados para este código.</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Visualização de Print */}
      <Dialog open={!!selectedPrint} onOpenChange={() => setSelectedPrint(null)}>
        <DialogContent className="max-w-5xl bg-[#0c1526] border-white/10 text-white p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b border-white/5">
            <DialogTitle>Visualização da Tela</DialogTitle>
          </DialogHeader>
          <div className="relative bg-black/40 flex items-center justify-center min-h-[50vh]">
            {selectedPrint && (
              <img 
                src={selectedPrint} 
                alt="Print do Módulo" 
                className="max-w-full h-auto shadow-2xl"
                onError={(e) => {
                  (e.target as any).src = 'https://placehold.co/1200x800?text=URL+da+Imagem+Invalida';
                }}
              />
            )}
          </div>
          <div className="p-4 bg-white/5 flex justify-end gap-3">
            <Button variant="outline" size="sm" onClick={() => window.open(selectedPrint!, '_blank')}>
              Abrir em nova aba
            </Button>
            <Button variant="default" size="sm" onClick={() => setSelectedPrint(null)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
