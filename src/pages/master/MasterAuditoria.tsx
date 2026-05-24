import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function MasterAuditoria() {
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("saas_audit_logs" as any).select("*").order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => setLogs((data as any) || []));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Auditoria</h1>
        <p className="text-muted-foreground">Trilha de ações administrativas</p>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Entidade</TableHead>
              <TableHead>Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Sem registros</TableCell></TableRow>}
            {logs.map(l => (
              <TableRow key={l.id}>
                <TableCell className="text-xs">{new Date(l.created_at).toLocaleString("pt-BR")}</TableCell>
                <TableCell className="font-medium">{l.acao}</TableCell>
                <TableCell>{l.entidade}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-md truncate">{JSON.stringify(l.detalhes)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
