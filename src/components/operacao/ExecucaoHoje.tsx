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
import { format, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PlayCircle, CheckCircle2, Clock } from "lucide-react";

export function ExecucaoHoje() {
  const { data: checkins, isLoading } = useQuery({
    queryKey: ["operacao-execucao-hoje"],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from("operacao_checkins")
        .select("*, rh_funcionarios(nome)")
        .gte("iniciado_em", `${today}T00:00:00Z`)
        .order("iniciado_em", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      iniciado: { label: "Em curso", variant: "default", icon: PlayCircle },
      concluido: { label: "Finalizado", variant: "success", icon: CheckCircle2 },
      com_ocorrencia: { label: "Ocorrência", variant: "destructive", icon: Clock },
    };
    const s = variants[status] || { label: status, variant: "outline", icon: Clock };
    return (
      <Badge variant={s.variant === "success" ? "default" : s.variant} className={status === 'concluido' ? 'bg-green-500' : ''}>
        <s.icon className="w-3 h-3 mr-1" />
        {s.label}
      </Badge>
    );
  };

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Funcionário</TableHead>
            <TableHead>Módulo</TableHead>
            <TableHead>Início</TableHead>
            <TableHead>Fim / Duração</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell></TableRow>
          ) : checkins?.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center py-8">Nenhuma atividade registrada hoje.</TableCell></TableRow>
          ) : checkins?.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.rh_funcionarios?.nome || "N/A"}</TableCell>
              <TableCell className="capitalize">{c.modulo}</TableCell>
              <TableCell>{format(new Date(c.iniciado_em), "HH:mm")}</TableCell>
              <TableCell>
                {c.finalizado_em ? (
                  <div className="text-sm">
                    {format(new Date(c.finalizado_em), "HH:mm")}
                    <span className="text-xs text-slate-500 ml-2">({c.duracao_minutos} min)</span>
                  </div>
                ) : "-"}
              </TableCell>
              <TableCell>{getStatusBadge(c.status)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
