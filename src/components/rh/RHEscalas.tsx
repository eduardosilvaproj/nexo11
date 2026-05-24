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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, Copy } from "lucide-react";

const DIAS_SEMANA = [
  { id: 0, label: "Dom" },
  { id: 1, label: "Seg" },
  { id: 2, label: "Ter" },
  { id: 3, label: "Qua" },
  { id: 4, label: "Qui" },
  { id: 5, label: "Sex" },
  { id: 6, label: "Sáb" },
];

export function RHEscalas() {
  const { data: funcionarios, isLoading } = useQuery({
    queryKey: ["rh-funcionarios-escalas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rh_funcionarios")
        .select("*, rh_escalas(*)")
        .eq("status", "ativo")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const getEscalaNoDia = (escalas: any[], dia: number) => {
    return escalas?.find(e => e.dia_semana === dia && e.ativo);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Configuração de Escalas Semanais</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Copy className="w-4 h-4 mr-2" />
            Copiar Escala
          </Button>
        </div>
      </div>

      <div className="border rounded-lg bg-white overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Funcionário</TableHead>
              {DIAS_SEMANA.map((dia) => (
                <TableHead key={dia.id} className="text-center min-w-[100px]">{dia.label}</TableHead>
              ))}
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">Carregando...</TableCell>
              </TableRow>
            ) : funcionarios?.map((f) => (
              <TableRow key={f.id}>
                <TableCell>
                  <div className="font-medium">{f.nome}</div>
                  <div className="text-xs text-slate-500">{f.cargo}</div>
                </TableCell>
                {DIAS_SEMANA.map((dia) => {
                  const escala = getEscalaNoDia(f.rh_escalas, dia.id);
                  return (
                    <TableCell key={dia.id} className="text-center">
                      {escala ? (
                        <div className="flex flex-col items-center">
                          <Badge variant="secondary" className="text-[10px]">
                            {escala.hora_inicio.slice(0, 5)} - {escala.hora_fim.slice(0, 5)}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Folga</span>
                      )}
                    </TableCell>
                  );
                })}
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
