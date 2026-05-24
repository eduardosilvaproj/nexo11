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
import { Search, UserPlus, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function RHFuncionarios() {
  const [search, setSearch] = useState("");

  const { data: funcionarios, isLoading } = useQuery({
    queryKey: ["rh-funcionarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rh_funcionarios")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const filtered = funcionarios?.filter(f => 
    f.nome.toLowerCase().includes(search.toLowerCase()) ||
    f.cargo?.toLowerCase().includes(search.toLowerCase()) ||
    f.setor?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      ativo: { label: "Ativo", variant: "default" },
      ferias: { label: "Férias", variant: "secondary" },
      afastado: { label: "Afastado", variant: "destructive" },
      desligado: { label: "Desligado", variant: "outline" },
      inativo: { label: "Inativo", variant: "outline" },
    };
    const s = variants[status] || { label: status, variant: "outline" };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Buscar funcionários..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" className="flex-1 md:flex-none">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
          <Button className="flex-1 md:flex-none">
            <UserPlus className="w-4 h-4 mr-2" />
            Novo Funcionário
          </Button>
        </div>
      </div>

      <div className="border rounded-lg bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Cargo / Setor</TableHead>
              <TableHead>Admissão</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell>
              </TableRow>
            ) : filtered?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">Nenhum funcionário encontrado.</TableCell>
              </TableRow>
            ) : filtered?.map((f) => (
              <TableRow key={f.id}>
                <TableCell>
                  <div className="font-medium">{f.nome}</div>
                  <div className="text-xs text-slate-500">{f.email}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{f.cargo || "-"}</div>
                  <div className="text-xs text-slate-500">{f.setor || "-"}</div>
                </TableCell>
                <TableCell className="text-sm">
                  {f.data_admissao ? format(new Date(f.data_admissao), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                </TableCell>
                <TableCell>{getStatusBadge(f.status)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">Ver Detalhes</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
