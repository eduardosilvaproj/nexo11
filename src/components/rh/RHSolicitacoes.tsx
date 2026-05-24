import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function RHSolicitacoes() {
  const [search, setSearch] = useState("");

  const { data: solicitacoes, isLoading } = useQuery({
    queryKey: ["rh-solicitacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rh_solicitacoes")
        .select("*, rh_funcionarios(nome)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      enviada: { label: "Enviada", variant: "default" },
      em_analise: { label: "Em Análise", variant: "secondary" },
      aprovada: { label: "Aprovada", variant: "success" }, // Success isn't always default, let's use outline or something
      recusada: { label: "Recusada", variant: "destructive" },
      cancelada: { label: "Cancelada", variant: "outline" },
    };
    const s = variants[status] || { label: status, variant: "outline" };
    // Custom success color if variant success doesn't exist in basic shadcn badge
    const isApproved = status === "aprovada";
    return (
      <Badge 
        variant={s.variant === "success" ? "default" : s.variant} 
        className={isApproved ? "bg-green-500 hover:bg-green-600" : ""}
      >
        {s.label}
      </Badge>
    );
  };

  const getTipoLabel = (tipo: string) => {
    const tipos: Record<string, string> = {
      ferias: "Férias",
      folga: "Folga",
      atestado: "Atestado",
      afastamento: "Afastamento",
      justificativa: "Justificativa",
      alteracao_dados: "Alteração de Dados",
      outros: "Outros",
    };
    return tipos[tipo] || tipo;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Buscar solicitações..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" className="w-full md:w-auto">
          <Filter className="w-4 h-4 mr-2" />
          Filtros
        </Button>
      </div>

      <div className="border rounded-lg bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Funcionário</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell>
              </TableRow>
            ) : solicitacoes?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">Nenhuma solicitação encontrada.</TableCell>
              </TableRow>
            ) : solicitacoes?.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <div className="font-medium">{s.rh_funcionarios?.nome || "N/A"}</div>
                  <div className="text-xs text-slate-500">{format(new Date(s.created_at), "dd/MM/yyyy HH:mm")}</div>
                </TableCell>
                <TableCell>{getTipoLabel(s.tipo)}</TableCell>
                <TableCell className="text-sm">
                  {s.data_inicio ? format(new Date(s.data_inicio), "dd/MM", { locale: ptBR }) : "-"}
                  {s.data_fim ? ` até ${format(new Date(s.data_fim), "dd/MM", { locale: ptBR })}` : ""}
                </TableCell>
                <TableCell>{getStatusBadge(s.status)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" title="Aprovar">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Recusar">
                      <XCircle className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
