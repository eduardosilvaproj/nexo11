import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CustosFixosCard } from "@/components/financeiro/CustosFixosCard";
import { SimuladorPECard } from "@/components/financeiro/SimuladorPECard";

function PontoEquilibrio() {
  const [custoFixoTotal, setCustoFixoTotal] = useState<number>(0);
  const [mes, setMes] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <CustosFixosCard onTotalChange={setCustoFixoTotal} onMesChange={setMes} />
      <SimuladorPECard custoFixoTotal={custoFixoTotal} mes={mes} />
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
        <TabsList
          className="h-auto justify-start rounded-none bg-transparent p-0 border-b"
          style={{ borderColor: "#E8ECF2" }}
        >
          {[
            { v: "ponto-equilibrio", l: "Ponto de equilíbrio" },
            { v: "fluxo-caixa", l: "Fluxo de caixa" },
            { v: "contas", l: "Contas" },
          ].map((t) => (
            <TabsTrigger
              key={t.v}
              value={t.v}
              className="rounded-none bg-transparent px-4 py-2 text-[#6B7A90] shadow-none data-[state=active]:bg-transparent data-[state=active]:text-[#1E6FBF] data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#1E6FBF] -mb-px"
            >
              {t.l}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="ponto-equilibrio" className="mt-4">
          <PontoEquilibrio />
        </TabsContent>
        <TabsContent value="fluxo-caixa" className="mt-4">
          <FluxoCaixaPlaceholder />
        </TabsContent>
        <TabsContent value="contas" className="mt-4">
          <ContasPlaceholder />
        </TabsContent>
      </Tabs>
    </div>
  );
}
