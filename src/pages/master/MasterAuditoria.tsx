import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";

export default function MasterAuditoria() {
  const { isSupport } = usePlatformAdmin();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupport) return;
    
    const loadLogs = async () => {
      const { data, error } = await supabase
        .from("saas_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      
      if (!error) setLogs(data || []);
      setLoading(false);
    };

    loadLogs();
  }, [isSupport]);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT': return 'bg-green-100 text-green-700 border-green-200';
      case 'UPDATE': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'DELETE': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Auditoria SaaS</h1>
        <p className="text-muted-foreground">Trilha completa de ações administrativas na plataforma</p>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Entidade</TableHead>
              <TableHead>ID Alvo</TableHead>
              <TableHead>Usuário ADM</TableHead>
              <TableHead className="max-w-[300px]">Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Carregando trilha...</TableCell></TableRow>
            ) : logs.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sem registros de auditoria</TableCell></TableRow>
            ) : (
              logs.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-[10px] whitespace-nowrap">
                    {new Date(l.created_at).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getActionColor(l.action)}>
                      {l.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono">{l.target_table}</TableCell>
                  <TableCell className="text-[10px] font-mono text-muted-foreground">
                    {l.target_id?.slice(0, 8)}...
                  </TableCell>
                  <TableCell className="text-[10px] text-muted-foreground">
                    {l.user_id ? l.user_id.slice(0, 8) : 'SISTEMA'}
                  </TableCell>
                  <TableCell className="text-[10px] text-muted-foreground max-w-[300px] truncate font-mono">
                    {JSON.stringify(l.details)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
