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
import { Search, FileUp, Download, Eye } from "lucide-react";
import { format } from "date-fns";

export function RHDocumentos() {
  const [search, setSearch] = useState("");

  const { data: documentos, isLoading } = useQuery({
    queryKey: ["rh-documentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rh_documentos")
        .select("*, rh_funcionarios(nome)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Buscar documentos..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button className="w-full md:w-auto">
          <FileUp className="w-4 h-4 mr-2" />
          Enviar Documento
        </Button>
      </div>

      <div className="border rounded-lg bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Funcionário</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell>
              </TableRow>
            ) : documentos?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">Nenhum documento encontrado.</TableCell>
              </TableRow>
            ) : documentos?.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.titulo}</TableCell>
                <TableCell>{d.rh_funcionarios?.nome || "N/A"}</TableCell>
                <TableCell className="text-sm capitalize">{d.tipo.replace("_", " ")}</TableCell>
                <TableCell className="text-sm">{format(new Date(d.created_at), "dd/MM/yyyy")}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Download className="w-4 h-4" />
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
