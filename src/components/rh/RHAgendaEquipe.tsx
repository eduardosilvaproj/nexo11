import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, MapPin, Wrench, Truck, Search } from "lucide-react";

export function RHAgendaEquipe() {
  const [dataSelecionada, setDataSelecionada] = useState(new Date());

  const { data: agendaData, isLoading } = useQuery({
    queryKey: ["rh-agenda-equipe", dataSelecionada.toISOString()],
    queryFn: async () => {
      // Load active employees
      const { data: funcionarios } = await supabase
        .from("rh_funcionarios")
        .select("id, nome, cargo, status")
        .eq("status", "ativo");

      // For each employee, calculate availability for the selected day
      const agenda = await Promise.all((funcionarios || []).map(async (f) => {
        const { data: disp } = await supabase.rpc("calcular_disponibilidade_funcionario", {
          p_funcionario_id: f.id,
          p_data_inicio: new Date(dataSelecionada.setHours(0,0,0,0)).toISOString(),
          p_data_fim: new Date(dataSelecionada.setHours(23,59,59,999)).toISOString()
        });
        
        // This is a placeholder for where we'd fetch actual operational tasks
        // In a real implementation, we'd query agendamentos_montagem, entregas, etc.
        return {
          ...f,
          disponibilidade: disp || { status: 'desconhecido', motivo: 'Erro ao calcular' },
          tarefas: [] // Placeholder
        };
      }));

      return agenda;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'disponivel': return 'bg-green-100 text-green-700 border-green-200';
      case 'ocupado': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'ferias': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'fora_da_escala': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-red-100 text-red-700 border-red-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold">Agenda Diária da Equipe</h3>
          <p className="text-sm text-slate-500">
            {format(dataSelecionada, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2">
          {Array.from({ length: 7 }).map((_, i) => {
            const date = addDays(startOfWeek(new Date(), { weekStartsOn: 0 }), i);
            const isSelected = isSameDay(date, dataSelecionada);
            return (
              <Button
                key={i}
                variant={isSelected ? "default" : "outline"}
                className="flex flex-col h-14 w-14 p-0 shrink-0"
                onClick={() => setDataSelecionada(date)}
              >
                <span className="text-[10px] uppercase font-bold">{format(date, "EEE", { locale: ptBR })}</span>
                <span className="text-lg">{format(date, "dd")}</span>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <p className="text-center py-8 col-span-full">Carregando agenda...</p>
        ) : agendaData?.map((f) => (
          <Card key={f.id} className="overflow-hidden border-l-4" style={{ borderLeftColor: f.disponibilidade.status === 'disponivel' ? '#22c55e' : '#64748b' }}>
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base">{f.nome}</CardTitle>
                  <p className="text-xs text-slate-500">{f.cargo}</p>
                </div>
                <Badge variant="outline" className={getStatusColor(f.disponibilidade.status)}>
                  {f.disponibilidade.status.replace('_', ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {f.disponibilidade.motivo && (
                <p className="text-xs text-slate-400 mt-1 italic">{f.disponibilidade.motivo}</p>
              )}
              
              <div className="mt-4 space-y-2">
                {f.tarefas.length === 0 ? (
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Sem tarefas atribuídas</p>
                ) : (
                  f.tarefas.map((t: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded text-xs border border-slate-100">
                      <Wrench className="w-3 h-3 text-slate-400" />
                      <span className="flex-1 truncate">{t.titulo}</span>
                      <span className="text-slate-400 font-mono">{t.horario}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Minimal Button component if not imported correctly
function Button({ children, variant, className, onClick }: any) {
  const base = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50";
  const variants: any = {
    default: "bg-slate-900 text-slate-50 hover:bg-slate-900/90",
    outline: "border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900",
  };
  return (
    <button className={`${base} ${variants[variant] || variants.default} ${className}`} onClick={onClick}>
      {children}
    </button>
  );
}
