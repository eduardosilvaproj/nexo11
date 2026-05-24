import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export function OcorrenciasList({ status }: { status?: string }) {
  const { data: ocorrencias, isLoading } = useQuery({
    queryKey: ["operacao-ocorrencias", status],
    queryFn: async () => {
      let q = supabase
        .from("operacao_ocorrencias")
        .select("*, rh_funcionarios(nome), contratos(cliente_nome)")
        .order("created_at", { ascending: false });
      
      if (status) q = q.eq("status", status);
      
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const getPriorityBadge = (prio: string) => {
    const variants: Record<string, any> = {
      baixa: "secondary",
      media: "default",
      alta: "destructive",
      critica: "destructive",
    };
    return <Badge variant={variants[prio] || "outline"}>{prio}</Badge>;
  };

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Funcionário / Cliente</TableHead>
            <TableHead>Tipo / Descrição</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={6} className="text-center py-8">Carregando...</TableCell></TableRow>
          ) : ocorrencias?.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center py-8">Nenhuma ocorrência encontrada.</TableCell></TableRow>
          ) : ocorrencias?.map((o) => (
            <TableRow key={o.id}>
              <TableCell className="text-sm">{format(new Date(o.created_at), "dd/MM HH:mm")}</TableCell>
              <TableCell>
                <div className="font-medium">{o.rh_funcionarios?.nome || "N/A"}</div>
                <div className="text-xs text-slate-500">{o.contratos?.cliente_nome || "Manual"}</div>
              </TableCell>
              <TableCell>
                <div className="text-sm font-bold capitalize">{o.tipo.replace('_', ' ')}</div>
                <div className="text-xs text-slate-500 truncate max-w-xs">{o.descricao}</div>
              </TableCell>
              <TableCell>{getPriorityBadge(o.prioridade)}</TableCell>
              <TableCell>
                <Badge variant={o.status === 'resolvida' ? 'outline' : 'default'}>{o.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm">Resolver</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
