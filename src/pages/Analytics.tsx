import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertasBanner } from "@/components/analytics/AlertasBanner";
import { VisaoGeralSection } from "@/components/analytics/VisaoGeralSection";
import { ComercialSection } from "@/components/analytics/ComercialSection";
import { FinanceiroSection } from "@/components/analytics/FinanceiroSection";
import { OperacionalSection } from "@/components/analytics/OperacionalSection";
import { EstoqueSection } from "@/components/analytics/EstoqueSection";
import { LogisticaMontagemSection } from "@/components/analytics/LogisticaMontagemSection";
import { PosVendaSection } from "@/components/analytics/PosVendaSection";
import { Periodo, rangeFromPeriodo } from "@/components/analytics/shared";

type Loja = { id: string; nome: string };

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: "mes_atual", label: "Mês atual" },
  { value: "mes_anterior", label: "Mês anterior" },
  { value: "ult_3m", label: "Últimos 3 meses" },
  { value: "ult_6m", label: "Últimos 6 meses" },
  { value: "ano_atual", label: "Ano atual" },
];

export default function Analytics() {
  const { hasRole, perfil } = useAuth();
  const isFranqueador = hasRole("franqueador");
  const [periodo, setPeriodo] = useState<Periodo>("mes_atual");
  const [lojaId, setLojaId] = useState<string>(
    isFranqueador ? "all" : perfil?.loja_id ?? "all",
  );
  const [lojas, setLojas] = useState<Loja[]>([]);

  useEffect(() => {
    if (!isFranqueador && perfil?.loja_id) setLojaId(perfil.loja_id);
  }, [isFranqueador, perfil?.loja_id]);

  useEffect(() => {
    if (!isFranqueador) return;
    supabase
      .from("lojas")
      .select("id, nome")
      .order("nome")
      .then(({ data }) => setLojas(data ?? []));
  }, [isFranqueador]);

  const { label: periodoLabel } = rangeFromPeriodo(periodo);

  return (
    <div className="flex flex-col gap-6 p-6">
      <AlertasBanner />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: "#0D1117" }}>NEXO Analytics</h1>
          <p style={{ fontSize: 13, color: "#6B7A90", marginTop: 2 }}>
            Visão gerencial consolidada — {periodoLabel}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div style={{ width: 200 }}>
            <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIODOS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isFranqueador && (
            <div style={{ width: 220 }}>
              <Select value={lojaId} onValueChange={setLojaId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Todas as lojas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as lojas</SelectItem>
                  {lojas.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      <VisaoGeralSection periodo={periodo} lojaId={lojaId} />

      <Tabs defaultValue="comercial">
        <TabsList
          className="h-auto justify-start rounded-none bg-transparent p-0 border-b w-full overflow-x-auto"
          style={{ borderColor: "#E8ECF2" }}
        >
          {[
            { v: "comercial", l: "Comercial" },
            { v: "financeiro", l: "Financeiro" },
            { v: "operacional", l: "Operacional" },
            { v: "estoque", l: "Compras & Almoxarifado" },
            { v: "logistica", l: "Logística & Montagem" },
            { v: "posvenda", l: "Pós-venda" },
          ].map((t) => (
            <TabsTrigger
              key={t.v}
              value={t.v}
              className="rounded-none bg-transparent px-4 py-2 text-[#6B7A90] shadow-none data-[state=active]:bg-transparent data-[state=active]:text-[#1E6FBF] data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#1E6FBF] -mb-px whitespace-nowrap"
            >
              {t.l}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="comercial" className="mt-4">
          <ComercialSection periodo={periodo} lojaId={lojaId} />
        </TabsContent>
        <TabsContent value="financeiro" className="mt-4">
          <FinanceiroSection periodo={periodo} lojaId={lojaId} />
        </TabsContent>
        <TabsContent value="operacional" className="mt-4">
          <OperacionalSection lojaId={lojaId} />
        </TabsContent>
        <TabsContent value="estoque" className="mt-4">
          <EstoqueSection periodo={periodo} lojaId={lojaId} />
        </TabsContent>
        <TabsContent value="logistica" className="mt-4">
          <LogisticaMontagemSection periodo={periodo} lojaId={lojaId} />
        </TabsContent>
        <TabsContent value="posvenda" className="mt-4">
          <PosVendaSection periodo={periodo} lojaId={lojaId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
