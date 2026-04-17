import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function formatBRL(v: number) {
  if (!isFinite(v)) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function PontoEquilibrio() {
  const [custosFixos, setCustosFixos] = useState<number>(45000);
  const [margemPct, setMargemPct] = useState<number>(32);
  const [ticketMedio, setTicketMedio] = useState<number>(18000);

  const { faturamentoPE, contratosPE } = useMemo(() => {
    const m = margemPct / 100;
    const fat = m > 0 ? custosFixos / m : Infinity;
    const ctr = ticketMedio > 0 ? Math.ceil(fat / ticketMedio) : Infinity;
    return { faturamentoPE: fat, contratosPE: ctr };
  }, [custosFixos, margemPct, ticketMedio]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Parâmetros da loja</CardTitle>
          <CardDescription>
            Ajuste os valores para calcular quanto sua loja precisa faturar para cobrir os custos.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="cf">Custos fixos mensais</Label>
            <Input
              id="cf"
              type="number"
              value={custosFixos}
              onChange={(e) => setCustosFixos(Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mg">Margem média (%)</Label>
            <Input
              id="mg"
              type="number"
              value={margemPct}
              onChange={(e) => setMargemPct(Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tm">Ticket médio</Label>
            <Input
              id="tm"
              type="number"
              value={ticketMedio}
              onChange={(e) => setTicketMedio(Number(e.target.value) || 0)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground font-medium">
              Faturamento de equilíbrio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatBRL(faturamentoPE)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Receita mensal mínima para cobrir os custos fixos.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground font-medium">
              Contratos necessários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {isFinite(contratosPE) ? contratosPE : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Considerando o ticket médio informado.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmConstrucaoBanner() {
  return (
    <div
      className="mb-4 rounded-md px-4 py-3 text-sm"
      style={{
        background: "#F5F7FA",
        border: "1px dashed #B0BAC9",
        color: "#6B7A90",
      }}
    >
      Em construção — disponível em breve
    </div>
  );
}

function FluxoCaixaPlaceholder() {
  return (
    <div>
      <EmConstrucaoBanner />
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fluxo de caixa</CardTitle>
          <CardDescription>
            Entradas e saídas previstas e realizadas no período.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Aqui você verá o gráfico mensal de entradas vs. saídas, o saldo
          projetado e a comparação com o mês anterior.
        </CardContent>
      </Card>
    </div>
  );
}

function ContasPlaceholder() {
  return (
    <div>
      <EmConstrucaoBanner />
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contas a pagar e receber</CardTitle>
          <CardDescription>
            Acompanhe vencimentos, pagamentos e recebimentos da loja.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Listagem de contas com status, vencimento, valor e responsável.
        </CardContent>
      </Card>
    </div>
  );
}


export default function Financeiro() {
  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">NEXO Financeiro</h1>
        <p className="text-sm text-muted-foreground">Gestão financeira da loja</p>
      </header>

      <Tabs defaultValue="ponto-equilibrio">
        <TabsList>
          <TabsTrigger value="ponto-equilibrio">Ponto de equilíbrio</TabsTrigger>
          <TabsTrigger value="fluxo-caixa">Fluxo de caixa</TabsTrigger>
          <TabsTrigger value="contas">Contas</TabsTrigger>
        </TabsList>
        <TabsContent value="ponto-equilibrio" className="mt-4">
          <PontoEquilibrio />
        </TabsContent>
        <TabsContent value="fluxo-caixa" className="mt-4">
          <EmBreve titulo="Fluxo de caixa" />
        </TabsContent>
        <TabsContent value="contas" className="mt-4">
          <EmBreve titulo="Contas a pagar e receber" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
