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
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
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
  const [lojaId, setLojaId] = useState<string | null>(null);
  const [metricas, setMetricas] = useState({ totalMes: 0, pagas: 0, bonus: 0 });
  const [recalculando, setRecalculando] = useState(false);
  const { hasRole } = useAuth();
  const podeEditarRegra = hasRole("admin") || hasRole("franqueador");
  const podePagar = podeEditarRegra;
  const podeRecalcular = hasRole("admin") || hasRole("franqueador") || hasRole("gerente");
  const podeVerRelatorioCompleto =
    hasRole("admin") || hasRole("franqueador") || hasRole("gerente");

  async function recalcularComissoes() {
    if (!lojaId || recalculando) return;
    setRecalculando(true);
    try {
      // 1. Papéis ativos com regra contrato_assinado
      const { data: papeis, error: errPapeis } = await supabase
        .from("papeis_comissao")
        .select("id, percentual_padrao")
        .eq("loja_id", lojaId)
        .eq("ativo", true)
        .eq("regra_pagamento", "contrato_assinado");
      if (errPapeis) throw errPapeis;
      const papelIds = (papeis ?? []).map((p) => p.id);
      if (!papelIds.length) {
        toast.info("Nenhum papel com regra 'contrato assinado' configurado");
        return;
      }

      // 2. Membros da equipe com esses papéis
      const { data: membros, error: errMembros } = await supabase
        .from("usuarios")
        .select("id, papel_comissao_id, comissao_percentual")
        .eq("loja_id", lojaId)
        .in("papel_comissao_id", papelIds);
      if (errMembros) throw errMembros;
      const membrosValidos = (membros ?? []).filter((m) => m.papel_comissao_id);
      if (!membrosValidos.length) {
        toast.info("Nenhum membro com papel de comissão configurado");
        return;
      }

      // 3. Contratos da loja com status != cancelado
      const { data: contratos, error: errContr } = await supabase
        .from("contratos")
        .select("id, valor_venda, created_at, status")
        .eq("loja_id", lojaId);
      if (errContr) throw errContr;
      const contratosLista = contratos ?? [];
      if (!contratosLista.length) {
        toast.info("Nenhum contrato elegível para comissão");
        return;
      }

      // 4. Buscar comissões existentes para evitar duplicação
      const contratoIds = contratosLista.map((c) => c.id);
      const { data: existentes, error: errExist } = await supabase
        .from("comissoes")
        .select("contrato_id, usuario_id")
        .in("contrato_id", contratoIds);
      if (errExist) throw errExist;
      const chavesExistentes = new Set(
        (existentes ?? []).map((e) => `${e.contrato_id}|${e.usuario_id}`)
      );

      // 5. Montar inserts
      const inserts: Array<{
        contrato_id: string;
        loja_id: string;
        usuario_id: string;
        papel_id: string;
        base_calculo: number;
        percentual: number;
        valor: number;
        status: string;
        gatilho: string;
        data_gatilho: string;
      }> = [];
      const contratosAfetados = new Set<string>();

      for (const contrato of contratosLista) {
        const valor = Number(contrato.valor_venda ?? 0);
        if (valor <= 0) continue;
        for (const m of membrosValidos) {
          const chave = `${contrato.id}|${m.id}`;
          if (chavesExistentes.has(chave)) continue;
          const papel = papeis!.find((p) => p.id === m.papel_comissao_id);
          if (!papel) continue;
          const pct = Number(m.comissao_percentual ?? papel.percentual_padrao ?? 0);
          if (pct <= 0) continue;
          inserts.push({
            contrato_id: contrato.id,
            loja_id: lojaId,
            usuario_id: m.id,
            papel_id: m.papel_comissao_id!,
            base_calculo: valor,
            percentual: pct,
            valor: Number(((valor * pct) / 100).toFixed(2)),
            status: "liberada",
            gatilho: "contrato_assinado",
            data_gatilho: contrato.created_at,
          });
          contratosAfetados.add(contrato.id);
        }
      }

      if (!inserts.length) {
        toast.info("Nenhuma comissão nova para gerar");
        return;
      }

      const { error: errIns } = await supabase.from("comissoes").insert(inserts);
      if (errIns) throw errIns;

      toast.success(
        `${inserts.length} comissões geradas para ${contratosAfetados.size} contratos`
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao recalcular comissões";
      toast.error(msg);
    } finally {
      setRecalculando(false);
    }
  }

  // Carrega loja do usuário e regra ativa (legado, usado apenas no relatório)
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
        .select("percentual_base, margem_min_bonus, percentual_bonus, bonus_ativo")
        .eq("loja_id", lid)
        .eq("ativo", true)
        .maybeSingle();
      if (r) {
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

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">NEXO Comissões</h1>
          <p className="text-sm text-muted-foreground">
            Qualidade de venda, não só volume
          </p>
        </div>
        <div className="flex items-center gap-2">
          {podeRecalcular && (
            <Button
              variant="outline"
              size="sm"
              onClick={recalcularComissoes}
              disabled={recalculando || !lojaId}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${recalculando ? "animate-spin" : ""}`} />
              {recalculando ? "Recalculando..." : "Recalcular"}
            </Button>
          )}
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
        </div>
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
            { v: "papeis", l: "Papéis" },
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

        <TabsContent value="papeis" className="mt-4">
          <PapeisTab lojaId={lojaId} podeEditar={podeEditarRegra} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

