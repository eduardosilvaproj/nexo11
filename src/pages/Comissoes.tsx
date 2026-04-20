import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ComissoesRelatorioTab, REGRA_PADRAO, type RegraComissao } from "@/components/comissoes/ComissoesRelatorioTab";
import { PapeisTab } from "@/components/comissoes/PapeisTab";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function MetricCard({
  label,
  valor,
  cor,
}: {
  label: string;
  valor: number;
  cor: string;
}) {
  return (
    <Card style={{ borderTop: `3px solid ${cor}` }}>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-medium tabular-nums" style={{ color: cor }}>
          {fmtBRL(valor)}
        </p>
      </CardContent>
    </Card>
  );
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function buildOptions() {
  const hoje = new Date();
  const opts: { value: string; label: string }[] = [];
  for (let i = 0; i < 18; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    opts.push({ value, label: `${MESES[d.getMonth()]} ${d.getFullYear()}` });
  }
  return opts;
}

export default function Comissoes() {
  const opcoes = useMemo(buildOptions, []);
  const [mes, setMes] = useState<string>(opcoes[0].value);
  const mesLabel = opcoes.find((o) => o.value === mes)?.label ?? mes;
  const [regra, setRegra] = useState<RegraComissao>(REGRA_PADRAO);
  const [regraId, setRegraId] = useState<string | null>(null);
  const [lojaId, setLojaId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [metricas, setMetricas] = useState({ totalMes: 0, pagas: 0, bonus: 0 });
  const { hasRole } = useAuth();
  const podeEditarRegra = hasRole("admin") || hasRole("franqueador");
  const podePagar = podeEditarRegra;
  const podeVerRelatorioCompleto =
    hasRole("admin") || hasRole("franqueador") || hasRole("gerente");

  // Carrega loja do usuário e regra ativa
  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;
      const { data: u } = await supabase
        .from("usuarios")
        .select("loja_id")
        .eq("id", uid)
        .maybeSingle();
      const lid = u?.loja_id ?? null;
      setLojaId(lid);
      if (!lid) return;
      const { data: r } = await supabase
        .from("regras_comissao")
        .select("id, percentual_base, margem_min_bonus, percentual_bonus, bonus_ativo")
        .eq("loja_id", lid)
        .eq("ativo", true)
        .maybeSingle();
      if (r) {
        setRegraId(r.id);
        setRegra({
          percentual_base: Number(r.percentual_base) / 100,
          margem_min_bonus: Number(r.margem_min_bonus),
          percentual_bonus: r.bonus_ativo ? Number(r.percentual_bonus) / 100 : 0,
        });
      }
    })();
  }, []);

  // Carrega métricas reais do mês
  useEffect(() => {
    if (!lojaId) return;
    (async () => {
      const [y, m] = mes.split("-").map(Number);
      const fim = new Date(y, m, 0);
      const fimStr = `${fim.getFullYear()}-${String(fim.getMonth() + 1).padStart(2, "0")}-${String(fim.getDate()).padStart(2, "0")}`;
      const { data } = await supabase
        .from("comissoes")
        .select("valor, status, gatilho, created_at")
        .eq("loja_id", lojaId)
        .gte("created_at", `${mes}T00:00:00`)
        .lte("created_at", `${fimStr}T23:59:59`);
      const rows = data ?? [];
      const totalMes = rows.reduce((s, r) => s + Number(r.valor ?? 0), 0);
      const pagas = rows
        .filter((r) => r.status === "paga")
        .reduce((s, r) => s + Number(r.valor ?? 0), 0);
      const bonus = rows
        .filter((r) => (r.gatilho ?? "").includes("bonus"))
        .reduce((s, r) => s + Number(r.valor ?? 0), 0);
      setMetricas({ totalMes, pagas, bonus });
    })();
  }, [mes, lojaId]);

  async function handleSaveRegra(nova: RegraComissao) {
    setRegra(nova);
    if (!lojaId) return;
    const payload = {
      loja_id: lojaId,
      percentual_base: nova.percentual_base * 100,
      margem_min_bonus: nova.margem_min_bonus,
      percentual_bonus: nova.percentual_bonus * 100,
      bonus_ativo: nova.percentual_bonus > 0,
      ativo: true,
    };
    const { error } = regraId
      ? await supabase.from("regras_comissao").update(payload).eq("id", regraId)
      : await supabase.from("regras_comissao").insert(payload).select("id").single().then((r) => {
          if (r.data) setRegraId(r.data.id);
          return r;
        });
    if (error) toast.error(error.message);
  }

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">NEXO Comissões</h1>
          <p className="text-sm text-muted-foreground">
            Qualidade de venda, não só volume
          </p>
        </div>
        <Select value={mes} onValueChange={setMes}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {opcoes.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Total a pagar (mês)" valor={metricas.totalMes - metricas.pagas} cor="#1E6FBF" />
        <MetricCard label="Comissões pagas" valor={metricas.pagas} cor="#12B76A" />
        <MetricCard label="Bônus por margem" valor={metricas.bonus} cor="#E8A020" />
      </div>

      <Tabs defaultValue="relatorio">
        <TabsList
          className="h-auto justify-start rounded-none bg-transparent p-0 border-b"
          style={{ borderColor: "#E8ECF2" }}
        >
          {[
            { v: "relatorio", l: "Relatório" },
            { v: "regras", l: "Regras" },
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

        <TabsContent value="relatorio" className="mt-4">
          <ComissoesRelatorioTab
            mes={mes}
            mesLabel={mesLabel}
            regra={regra}
            podePagar={podePagar}
            apenasProprio={!podeVerRelatorioCompleto}
          />
        </TabsContent>

        <TabsContent value="regras" className="mt-4">
          <ComissoesRegrasTab
            regra={regra}
            onEdit={podeEditarRegra ? () => setEditOpen(true) : undefined}
          />
        </TabsContent>
      </Tabs>

      {podeEditarRegra && (
        <RegraEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          regra={regra}
          onSave={handleSaveRegra}
        />
      )}
    </div>
  );
}

