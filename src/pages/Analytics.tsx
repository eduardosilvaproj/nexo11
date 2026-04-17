import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertasBanner } from "@/components/analytics/AlertasBanner";
import { KpiRow } from "@/components/analytics/KpiRow";
import { FaturamentoVsPeChart } from "@/components/analytics/FaturamentoVsPeChart";
import { FunilLeadsChart } from "@/components/analytics/FunilLeadsChart";
import { MargemEvolucaoChart } from "@/components/analytics/MargemEvolucaoChart";
import { MargemAlertasCard } from "@/components/analytics/MargemAlertasCard";
import { PipelineCard } from "@/components/analytics/PipelineCard";

type Loja = { id: string; nome: string };

function buildMonthOptions(months = 12) {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    opts.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return opts;
}

export default function Analytics() {
  const { hasRole } = useAuth();
  const isFranqueador = hasRole("franqueador");
  const monthOptions = useMemo(() => buildMonthOptions(12), []);
  const [mes, setMes] = useState(monthOptions[0].value);
  const [lojaId, setLojaId] = useState<string>("all");
  const [lojas, setLojas] = useState<Loja[]>([]);

  useEffect(() => {
    if (!isFranqueador) return;
    supabase
      .from("lojas")
      .select("id, nome")
      .order("nome")
      .then(({ data }) => setLojas(data ?? []));
  }, [isFranqueador]);

  return (
    <div className="flex flex-col gap-6">
      <AlertasBanner />
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: "#0D1117" }}>
            NEXO Analytics
          </h1>
          <p style={{ fontSize: 13, color: "#6B7A90", marginTop: 2 }}>
            Visão executiva da operação
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div style={{ width: 180 }}>
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isFranqueador && (
            <div style={{ width: 200 }}>
              <Select value={lojaId} onValueChange={setLojaId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas as lojas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as lojas</SelectItem>
                  {lojas.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      <KpiRow mes={mes} lojaId={lojaId} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <FaturamentoVsPeChart />
        </div>
        <div className="lg:col-span-2">
          <FunilLeadsChart />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-20 gap-4" style={{ gridTemplateColumns: "repeat(20, minmax(0, 1fr))" }}>
        <div className="lg:col-span-13" style={{ gridColumn: "span 13 / span 13" }}>
          <MargemEvolucaoChart />
        </div>
        <div style={{ gridColumn: "span 7 / span 7" }}>
          <MargemAlertasCard mes={mes} lojaId={lojaId} />
      </div>

      <div className="grid grid-cols-1 gap-4" style={{ gridTemplateColumns: "repeat(20, minmax(0, 1fr))" }}>
        <div style={{ gridColumn: "span 9 / span 9" }}>
          <PipelineCard lojaId={lojaId} />
        </div>
        <div style={{ gridColumn: "span 11 / span 11" }} />
      </div>
      </div>
    </div>
  );
}
