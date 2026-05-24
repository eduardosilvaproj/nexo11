import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function MasterLojas() {
  const [lojas, setLojas] = useState<any[]>([]);

  const load = async () => {
    const { data, error } = await supabase
      .from("lojas")
      .select("id, nome, cidade, estado, tipo, ativo, saas_client_id")
      .order("nome");
    if (error) return toast.error(error.message);
    setLojas(data || []);
  };
  useEffect(() => { load(); }, []);

  const toggle = async (id: string, ativo: boolean) => {
    const { error } = await supabase.from("lojas").update({ ativo }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(ativo ? "Loja ativada" : "Loja bloqueada");
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lojas</h1>
        <p className="text-muted-foreground">Todas as lojas da plataforma</p>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Ativa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lojas.map(l => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{l.nome}</TableCell>
                <TableCell>{l.cidade}/{l.estado}</TableCell>
                <TableCell><Badge variant="outline">{l.tipo || "loja"}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{l.saas_client_id ? l.saas_client_id.slice(0,8) : "—"}</TableCell>
                <TableCell><Switch checked={l.ativo} onCheckedChange={(v) => toggle(l.id, v)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
