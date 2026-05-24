import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function MasterPlanos() {
  const [planos, setPlanos] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("saas_plans" as any).select("*").order("preco_mensal").then(({ data, error }) => {
      if (error) return toast.error(error.message);
      setPlanos((data as any) || []);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Planos</h1>
        <p className="text-muted-foreground">Tarifários e limites disponíveis</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {planos.map(p => (
          <Card key={p.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{p.nome}</CardTitle>
                <Badge variant={p.ativo ? "default" : "secondary"}>{p.ativo ? "Ativo" : "Inativo"}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{p.descricao}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-3xl font-bold">R$ {Number(p.preco_mensal).toFixed(2)}<span className="text-sm text-muted-foreground font-normal">/mês</span></div>
              <ul className="text-sm space-y-1 pt-2 border-t">
                <li>• {p.limite_filiais} filial(is)</li>
                <li>• {p.limite_usuarios} usuários</li>
                <li>• {p.limite_envios_diarios} envios/dia</li>
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
