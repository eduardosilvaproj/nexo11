import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Star, MessageSquare, History, Clock, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  contratoId: string;
}

const CLASSIFICACAO_BADGE: Record<string, { bg: string, fg: string, label: string }> = {
  promotor: { bg: "bg-green-100", fg: "text-green-700", label: "Promotor" },
  neutro: { bg: "bg-yellow-100", fg: "text-yellow-700", label: "Neutro" },
  detrator: { bg: "bg-red-100", fg: "text-red-700", label: "Detrator" },
};

export function ContratoSatisfacaoTab({ contratoId }: Props) {
  const qc = useQueryClient();
  
  const { data: pesquisas, isLoading } = useQuery({
    queryKey: ["cliente_pesquisas", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cliente_pesquisas")
        .select(`
          *,
          enviada_por_user:usuarios!cliente_pesquisas_enviada_por_fkey(nome)
        `)
        .eq("contrato_id", contratoId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const deletePesquisa = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cliente_pesquisas")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pesquisa removida");
      qc.invalidateQueries({ queryKey: ["cliente_pesquisas", contratoId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Clock className="w-8 h-8 animate-spin text-slate-300" />
      </div>
    );
  }

  if (!pesquisas || pesquisas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-xl bg-slate-50 text-slate-500">
        <Star className="w-10 h-10 mb-3 opacity-20" />
        <p className="text-sm">Nenhuma pesquisa de satisfação registrada para este contrato.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Pesquisas de Satisfação</h3>
      </div>

      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-4">
          {pesquisas.map((p) => (
            <Card key={p.id} className="overflow-hidden border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      p.status === 'respondida' ? "bg-purple-100 text-purple-600" : "bg-slate-100 text-slate-500"
                    )}>
                      <Star className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 capitalize">
                          Etapa: {p.etapa.replace(/_/g, " ")}
                        </span>
                        <Badge variant={p.status === 'respondida' ? "default" : "secondary"} className="text-[10px] h-5">
                          {p.status.toUpperCase()}
                        </Badge>
                        {p.classificacao && (
                          <Badge className={cn(
                            "border-none text-[10px] h-5",
                            CLASSIFICACAO_BADGE[p.classificacao].bg,
                            CLASSIFICACAO_BADGE[p.classificacao].fg
                          )}>
                            {CLASSIFICACAO_BADGE[p.classificacao].label}
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-1">
                        <span>Enviada em: {format(new Date(p.enviada_em), "dd/MM/yy HH:mm", { locale: ptBR })}</span>
                        {p.respondida_em && (
                          <>
                            <span>•</span>
                            <span>Respondida em: {format(new Date(p.respondida_em), "dd/MM/yy HH:mm", { locale: ptBR })}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {p.status === 'enviada' && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-slate-400 hover:text-red-500"
                      onClick={() => deletePesquisa.mutate(p.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {p.status === 'respondida' && (
                  <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Nota NPS</p>
                        <p className={cn(
                          "text-2xl font-black",
                          p.nota >= 9 ? "text-green-600" : p.nota >= 7 ? "text-yellow-600" : "text-red-600"
                        )}>{p.nota}</p>
                      </div>
                      <div className="h-8 w-px bg-slate-200" />
                      <div className="flex-1">
                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Motivos</p>
                        <div className="flex flex-wrap gap-1">
                          {p.motivos?.map((m: string) => (
                            <Badge key={m} variant="outline" className="text-[9px] font-medium capitalize">
                              {m.replace(/_/g, " ")}
                            </Badge>
                          ))}
                          {(!p.motivos || p.motivos.length === 0) && <span className="text-xs text-slate-400">Nenhum motivo selecionado</span>}
                        </div>
                      </div>
                    </div>
                    
                    {p.comentario && (
                      <div className="bg-white border border-slate-100 rounded-lg p-3 text-sm text-slate-700 italic">
                        "{p.comentario}"
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
