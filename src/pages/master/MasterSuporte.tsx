import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function MasterSuporte() {
  const [tickets, setTickets] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("saas_support_tickets" as any).select("*").order("created_at", { ascending: false })
      .then(({ data }) => setTickets((data as any) || []));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Suporte & Sugestões</h1>
        <p className="text-muted-foreground">Chamados abertos por clientes</p>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Assunto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum chamado</TableCell></TableRow>}
            {tickets.map(t => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.assunto}</TableCell>
                <TableCell><Badge variant="outline">{t.tipo}</Badge></TableCell>
                <TableCell>{t.prioridade}</TableCell>
                <TableCell><Badge>{t.status}</Badge></TableCell>
                <TableCell>{new Date(t.created_at).toLocaleDateString("pt-BR")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
