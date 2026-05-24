import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function MasterAssinaturas() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("saas_subscriptions" as any)
      .select("*, saas_clients(nome_empresa), saas_plans(nome, preco_mensal)")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data as any) || []));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Assinaturas</h1>
        <p className="text-muted-foreground">Contratos ativos por cliente</p>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma assinatura</TableCell></TableRow>}
            {rows.map(s => (
              <TableRow key={s.id}>
                <TableCell>{s.saas_clients?.nome_empresa}</TableCell>
                <TableCell>{s.saas_plans?.nome}</TableCell>
                <TableCell>R$ {Number(s.saas_plans?.preco_mensal || 0).toFixed(2)}</TableCell>
                <TableCell>{new Date(s.inicio_em).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell><Badge>{s.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
