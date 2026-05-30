import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CustosFixosCard } from "@/components/financeiro/CustosFixosCard";
import { SimuladorPECard } from "@/components/financeiro/SimuladorPECard";
import { HistoricoPECard } from "@/components/financeiro/HistoricoPECard";
import { FluxoCaixaCard } from "@/components/financeiro/FluxoCaixaCard";
import { ContasCard } from "@/components/financeiro/ContasCard";
import { PagamentosImediatos } from "@/components/financeiro/PagamentosImediatos";
import { CartaoCreditoManager } from "@/components/financeiro/CartaoCreditoManager";
import { TransferenciasModulos } from "@/components/financeiro/TransferenciasModulos";
import { TaxasFinanceirasCard } from "@/components/financeiro/TaxasFinanceirasCard";
import { FinanciamentoContrato } from "@/components/financeiro/FinanciamentoContrato";
import { BoletoConciliacao } from "@/components/financeiro/BoletoConciliacao";

function PontoEquilibrio() {
  const [custoFixoTotal, setCustoFixoTotal] = useState<number>(0);
  const [mes, setMes] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <CustosFixosCard onTotalChange={setCustoFixoTotal} onMesChange={setMes} />
        <SimuladorPECard custoFixoTotal={custoFixoTotal} mes={mes} />
      </div>
      <HistoricoPECard />
    </div>
  );
}

export default function Financeiro() {
  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">NEXO Financeiro</h1>
        <p className="text-sm text-muted-foreground">Gestão financeira completa da loja</p>
      </header>

      <Tabs defaultValue="pagamentos">
        <TabsList
          className="h-auto flex-wrap justify-start rounded-none bg-transparent p-0 border-b"
          style={{ borderColor: "#E8ECF2" }}
        >
          {[
            { v: "pagamentos", l: "Pagamentos Imediatos" },
            { v: "contas", l: "Contas" },
            { v: "boletos", l: "Boletos" },
            { v: "financiamento", l: "Financiamentos" },
            { v: "cartao", l: "Cartões" },
            { v: "transferencias", l: "Transferências" },
            { v: "taxas", l: "Taxas" },
            { v: "fluxo-caixa", l: "Fluxo de Caixa" },
            { v: "ponto-equilibrio", l: "Ponto de Equilíbrio" },
          ].map((t) => (
            <TabsTrigger
              key={t.v}
              value={t.v}
              className="rounded-none bg-transparent px-3 py-2 text-[#6B7A90] text-sm shadow-none data-[state=active]:bg-transparent data-[state=active]:text-[#1E6FBF] data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#1E6FBF] -mb-px"
            >
              {t.l}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="pagamentos" className="mt-4">
          <PagamentosImediatos />
        </TabsContent>
        <TabsContent value="contas" className="mt-4">
          <ContasCard />
        </TabsContent>
        <TabsContent value="boletos" className="mt-4">
          <BoletoConciliacao />
        </TabsContent>
        <TabsContent value="financiamento" className="mt-4">
          <FinanciamentoContrato />
        </TabsContent>
        <TabsContent value="cartao" className="mt-4">
          <CartaoCreditoManager />
        </TabsContent>
        <TabsContent value="transferencias" className="mt-4">
          <TransferenciasModulos />
        </TabsContent>
        <TabsContent value="taxas" className="mt-4">
          <TaxasFinanceirasCard />
        </TabsContent>
        <TabsContent value="fluxo-caixa" className="mt-4">
          <FluxoCaixaCard />
        </TabsContent>
        <TabsContent value="ponto-equilibrio" className="mt-4">
          <PontoEquilibrio />
        </TabsContent>
      </Tabs>
    </div>
  );
}
