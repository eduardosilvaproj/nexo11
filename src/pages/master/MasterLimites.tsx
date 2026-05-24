import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MasterLimites() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Limites & Consumo</h1>
        <p className="text-muted-foreground">Acompanhe o uso versus os limites de cada plano</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Em construção</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Esta visão consolidará envios diários, total de usuários e filiais por cliente.
          Os dados são coletados das tabelas de comunicação e cadastros ativos.
        </CardContent>
      </Card>
    </div>
  );
}
