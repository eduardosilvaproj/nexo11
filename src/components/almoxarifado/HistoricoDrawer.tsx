
import { useQuery } from "@tanstack/react-query";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ArrowUpCircle, ArrowDownCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HistoricoDrawerProps {
  item: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HistoricoDrawer({ item, open, onOpenChange }: HistoricoDrawerProps) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["estoque_movimentacoes", item?.id],
    enabled: !!item?.id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estoque_movimentacoes")
        .select("*")
        .eq("item_id", item.id)
        .order("data", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[500px] overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2">
            <Clock className="text-blue-600" size={20} />
            Histórico de Movimentações
          </SheetTitle>
          {item && (
            <div className="mt-2">
              <p className="font-semibold text-slate-900">{item.descricao}</p>
              <p className="text-sm text-slate-500">{item.codigo || 'Sem código'} · {item.unidade}</p>
            </div>
          )}
        </SheetHeader>

        <div className="space-y-4">
          {isLoading ? (
            <p className="text-center text-slate-500 py-8">Carregando histórico...</p>
          ) : history.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl">
              <p className="text-slate-400">Nenhuma movimentação registrada para este item.</p>
            </div>
          ) : (
            history.map((mov) => (
              <div key={mov.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {mov.tipo === 'entrada' ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none flex items-center gap-1">
                        <ArrowUpCircle size={12} />
                        Entrada
                      </Badge>
                    ) : (
                      <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none flex items-center gap-1">
                        <ArrowDownCircle size={12} />
                        Saída
                      </Badge>
                    )}
                    <span className="text-xs text-slate-400">
                      {mov.subtipo}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {mov.data && format(new Date(mov.data), "dd MMM yyyy, HH:mm", { locale: ptBR })}
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-bold text-slate-900">
                    {mov.tipo === 'entrada' ? '+' : '-'}{Number(mov.quantidade).toLocaleString()} {item?.unidade}
                  </span>
                  {mov.valor_unitario > 0 && (
                    <span className="text-sm text-slate-500">
                      Vl. Un: R$ {Number(mov.valor_unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>

                {mov.observacoes && (
                  <p className="text-sm text-slate-600 bg-white p-2 rounded border border-slate-100 italic">
                    "{mov.observacoes}"
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
