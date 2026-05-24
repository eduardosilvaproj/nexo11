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
import { format, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export function RHAusencias() {
  const { data: ausencias, isLoading } = useQuery({
    queryKey: ["rh-ausencias"],
    queryFn: async () => {
      const today = startOfDay(new Date()).toISOString();
      const { data, error } = await supabase
        .from("rh_solicitacoes")
        .select("*, rh_funcionarios(nome)")
        .eq("status", "aprovada")
        .in("tipo", ["ferias", "folga", "afastamento", "atestado"])
        .or(`data_fim.gte.${today},data_inicio.gte.${today}`)
        .order("data_inicio");
      if (error) throw error;
      return data;
    },
  });

  const getStatus = (inicio: string, fim: string) => {
    const today = new Date();
    const start = new Date(inicio);
    const end = new Date(fim);

    if (isBefore(today, start)) return { label: "Agendado", className: "bg-blue-100 text-blue-700" };
    if (isAfter(today, end)) return { label: "Concluído", className: "bg-slate-100 text-slate-700" };
    return { label: "Em curso", className: "bg-green-100 text-green-700" };
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Funcionário</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Fim</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell>
              </TableRow>
            ) : ausencias?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">Nenhuma ausência registrada.</TableCell>
              </TableRow>
            ) : ausencias?.map((a) => {
              const status = getStatus(a.data_inicio!, a.data_fim!);
              return (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.rh_funcionarios?.nome || "N/A"}</TableCell>
                  <TableCell className="capitalize">{a.tipo}</TableCell>
                  <TableCell>{format(new Date(a.data_inicio!), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{format(new Date(a.data_fim!), "dd/MM/yyyy")}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={status.className}>
                      {status.label}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
