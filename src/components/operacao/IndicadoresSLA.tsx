import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";

export function IndicadoresSLA() {
  const { data: slas, isLoading } = useQuery({
    queryKey: ["operacao-slas-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operacao_slas")
        .select("*")
        .eq("ativo", true);
      if (error) throw error;
      return data;
    }
  });

  const mockSlaStats = [
    { modulo: "Logística", total: 45, dentro: 42, fora: 3, taxa: 93 },
    { modulo: "Montagem", total: 32, dentro: 28, fora: 4, taxa: 87 },
    { modulo: "Técnico", total: 18, dentro: 18, fora: 0, taxa: 100 },
  ];

  if (isLoading) return <div className="p-8 text-center">Carregando SLA...</div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {mockSlaStats.map((s, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">{s.modulo}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div className="text-2xl font-bold">{s.taxa}%</div>
                <div className="text-xs text-slate-400">Cumprimento</div>
              </div>
              <div className="mt-4 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${s.taxa > 90 ? 'bg-green-500' : 'bg-orange-500'}`} 
                  style={{ width: `${s.taxa}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[10px] uppercase font-bold text-slate-400">
                <span>{s.dentro} No prazo</span>
                <span>{s.fora} Atrasados</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            Configurações de SLA por Unidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Exigências</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slas?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500 italic">
                    Nenhuma meta de SLA configurada para esta unidade.
                  </TableCell>
                </TableRow>
              ) : slas?.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.nome}</TableCell>
                  <TableCell className="capitalize">{s.modulo}</TableCell>
                  <TableCell>{s.prazo_horas ? `${s.prazo_horas}h` : `${s.prazo_dias} dias`}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {s.exigir_evidencia && <Badge variant="outline" className="text-[10px]">FOTO</Badge>}
                      {s.exigir_assinatura && <Badge variant="outline" className="text-[10px]">ASSINATURA</Badge>}
                      {!s.exigir_evidencia && !s.exigir_assinatura && "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.ativo ? "default" : "secondary"}>
                      {s.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
