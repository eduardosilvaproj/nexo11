import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MasterSaude() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Saúde Operacional</h1>
        <p className="text-muted-foreground">Status dos providers, webhooks e automações</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Em construção</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Esta visão consolidará latência de webhooks, taxa de entrega por canal e alertas críticos por loja.
        </CardContent>
      </Card>
    </div>
  );
}
