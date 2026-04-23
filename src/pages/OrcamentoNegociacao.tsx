import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, CalendarIcon, Eye, EyeOff, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Condicao = {
  id: string;
  nome: string;
  parcelas: number;
  taxa: number;
  ativo: boolean;
  ordem: number | null;
};

type Orcamento = {
  id: string;
  nome: string;
  loja_id: string;
  cliente_id: string;
  vendedor_id?: string | null;
  valor_negociado: number | null;
  total_pedido: number | null;
  total_tabela: number | null;
  condicao_pagamento_id: string | null;
  taxa_financeira: number | null;
  parcelas: number | null;
  valor_parcela: number | null;
  percentual_parceiro: number | null;
  ocultar_parceiro: boolean | null;
  tipo_venda: string | null;
  parcelas_datas: unknown;
  desconto_global: number | null;
  status: string | null;
  frete_loja?: number | null;
  montagem_loja?: number | null;
};

type Parcela = { label: string; data: string; valor: number };

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const toISO = (d: Date) => format(d, "yyyy-MM-dd");

export default function OrcamentoNegociacao() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orcamento, setOrcamento] = useState<Orcamento | null>(null);
  const [clienteNome, setClienteNome] = useState("");
  const [condicoes, setCondicoes] = useState<Condicao[]>([]);

  const [condicaoId, setCondicaoId] = useState<string>("");
  const [tipoVenda, setTipoVenda] = useState("Normal");
  const [percParceiro, setPercParceiro] = useState(0);
  const [ocultarParceiro, setOcultarParceiro] = useState(false);
  const [descontoExtra, setDescontoExtra] = useState(0);
  const [datasParcelas, setDatasParcelas] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      if (!id) return;
      setLoading(true);
      const { data: orc, error } = await supabase
        .from("orcamentos")
        .select(
          "id,nome,loja_id,cliente_id,vendedor_id,valor_negociado,total_pedido,total_tabela,condicao_pagamento_id,taxa_financeira,parcelas,valor_parcela,percentual_parceiro,ocultar_parceiro,tipo_venda,parcelas_datas,desconto_global,status,frete_loja,montagem_loja",
        )
        .eq("id", id)
        .maybeSingle();
      if (error || !orc) {
        toast.error("Orçamento não encontrado");
        setLoading(false);
        return;
      }
      setOrcamento(orc as Orcamento);

      const { data: cli } = await supabase
        .from("clientes")
        .select("nome")
        .eq("id", orc.cliente_id)
        .maybeSingle();
      setClienteNome(cli?.nome || "");

      const { data: conds } = await supabase
        .from("condicoes_pagamento")
        .select("id,nome,parcelas,taxa,ativo,ordem")
        .eq("loja_id", orc.loja_id)
        .eq("ativo", true)
        .order("ordem", { ascending: true });
      setCondicoes((conds as Condicao[]) ?? []);

      setCondicaoId(orc.condicao_pagamento_id || "");
      setTipoVenda(orc.tipo_venda || "Normal");
      setPercParceiro(Number(orc.percentual_parceiro || 0));
      setOcultarParceiro(!!orc.ocultar_parceiro);
      setDescontoExtra(Number(orc.desconto_global || 0));
      if (Array.isArray(orc.parcelas_datas)) {
        setDatasParcelas((orc.parcelas_datas as string[]) ?? []);
      }
      setLoading(false);
    })();
  }, [id]);

  const condicaoSel = useMemo(
    () => condicoes.find((c) => c.id === condicaoId) || null,
    [condicoes, condicaoId],
  );

  const valorBase = useMemo(
    () => Number(orcamento?.valor_negociado || orcamento?.total_pedido || 0),
    [orcamento],
  );

  const calc = useMemo(() => {
    const taxa = Number(condicaoSel?.taxa || 0);
    const numParcelas = Math.max(1, Number(condicaoSel?.parcelas || 1));
    const comTaxa = valorBase * (1 + taxa / 100);
    const comDesconto = comTaxa * (1 - descontoExtra / 100);
    const comParceiro = comDesconto * (1 + percParceiro / 100);
    const valorParcela = comParceiro / numParcelas;
    const pontuacao = comParceiro * (percParceiro / 100);
    return { taxa, numParcelas, comTaxa, comDesconto, comParceiro, valorParcela, pontuacao };
  }, [valorBase, condicaoSel, descontoExtra, percParceiro]);

  // gerar datas quando condição muda
  useEffect(() => {
    if (!condicaoSel) {
      setDatasParcelas([]);
      return;
    }
    const total = condicaoSel.parcelas;
    setDatasParcelas((prev) => {
      if (prev.length === total + 1) return prev;
      const hoje = new Date();
      const arr: string[] = [toISO(hoje)];
      for (let i = 1; i <= total; i++) arr.push(toISO(addDays(hoje, i * 30)));
      return arr;
    });
  }, [condicaoSel]);

  const parcelas: Parcela[] = useMemo(() => {
    if (!condicaoSel) return [];
    const valorEntrada = calc.valorParcela; // distribuição igual incluindo entrada
    const total = condicaoSel.parcelas;
    const out: Parcela[] = [];
    out.push({
      label: "Entrada",
      data: datasParcelas[0] || toISO(new Date()),
      valor: valorEntrada,
    });
    for (let i = 1; i <= total; i++) {
      out.push({
        label: String(i),
        data: datasParcelas[i] || toISO(addDays(new Date(), i * 30)),
        valor: calc.valorParcela,
      });
    }
    return out;
  }, [condicaoSel, datasParcelas, calc.valorParcela]);

  const handleDataChange = (idx: number, data: Date | undefined) => {
    if (!data) return;
    setDatasParcelas((prev) => {
      const arr = [...prev];
      arr[idx] = toISO(data);
      return arr;
    });
  };

  const handleAprovar = async () => {
    if (!orcamento) return;
    if (!condicaoSel) {
      toast.error("Selecione uma condição de pagamento");
      return;
    }
    setSaving(true);
    try {
      const parcelasJson = parcelas.map((p) => ({
        label: p.label,
        data: p.data,
        valor: Number(p.valor.toFixed(2)),
      }));

      // 1) Criar o contrato
      const { data: contrato, error: contErr } = await supabase
        .from("contratos")
        .insert({
          loja_id: orcamento.loja_id,
          cliente_id: orcamento.cliente_id,
          cliente_nome: clienteNome || "Cliente",
          valor_venda: Number(calc.comParceiro.toFixed(2)),
          vendedor_id: orcamento.vendedor_id,
          status: "comercial",
        })
        .select("id")
        .single();
        
      if (contErr) throw contErr;

      // 2) Atualizar o orçamento
      const { error: orcErr } = await supabase
        .from("orcamentos")
        .update({
          status: "aprovado",
          contrato_id: contrato.id,
          condicao_pagamento_id: condicaoSel.id,
          taxa_financeira: condicaoSel.taxa,
          valor_com_taxa: Number(calc.comParceiro.toFixed(2)),
          parcelas: condicaoSel.parcelas,
          valor_parcela: Number(calc.valorParcela.toFixed(2)),
          percentual_parceiro: percParceiro,
          ocultar_parceiro: ocultarParceiro,
          tipo_venda: tipoVenda,
          parcelas_datas: parcelasJson,
          desconto_global: descontoExtra,
        })
        .eq("id", orcamento.id);
        
      if (orcErr) throw orcErr;

      // 3) Atualizar DRE (o contrato_id trigger já deve ter criado o DRE)
      // Usamos update no dre_contrato vinculado ao novo contrato
      const { error: dreErr } = await supabase
        .from("dre_contrato")
        .update({
          valor_venda: Number(calc.comParceiro.toFixed(2)),
          custo_produto_previsto: Number(orcamento.total_tabela || 0),
          custo_frete_previsto: Number(orcamento.frete_loja || 0),
          custo_montagem_previsto: Number(orcamento.montagem_loja || 0),
        })
        .eq("contrato_id", contrato.id);
      
      // O dreErr pode falhar se o trigger demorar, mas não é crítico para o fluxo principal
      if (dreErr) console.warn("Erro ao atualizar DRE previsto:", dreErr);

      toast.success("Orçamento aprovado e contrato gerado ✓");
      navigate(`/contratos/${contrato.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao aprovar orçamento");
    } finally {
      setSaving(false);
    }
  };

  const handleSalvarRascunho = async () => {
    if (!orcamento) return;
    setSaving(true);
    const parcelasJson = parcelas.map((p) => ({
      label: p.label,
      data: p.data,
      valor: Number(p.valor.toFixed(2)),
    }));
    const { error } = await supabase
      .from("orcamentos")
      .update({
        condicao_pagamento_id: condicaoSel?.id || null,
        taxa_financeira: condicaoSel?.taxa || 0,
        valor_com_taxa: Number(calc.comParceiro.toFixed(2)),
        parcelas: condicaoSel?.parcelas || 1,
        valor_parcela: Number(calc.valorParcela.toFixed(2)),
        percentual_parceiro: percParceiro,
        ocultar_parceiro: ocultarParceiro,
        tipo_venda: tipoVenda,
        parcelas_datas: parcelasJson,
        desconto_global: descontoExtra,
      })
      .eq("id", orcamento.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Desconto liberado/salvo");
  };

  if (loading) return <div className="p-8 text-muted-foreground">Carregando...</div>;
  if (!orcamento) return <div className="p-8">Orçamento não encontrado</div>;

  return (
    <div className="space-y-6 p-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(`/clientes/${orcamento.cliente_id}`)}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para {clienteNome || "cliente"}
      </Button>

      <div>
        <h1 className="text-[22px] font-medium" style={{ color: "#0D1117" }}>
          {orcamento.nome}
        </h1>
        <p className="text-[13px]" style={{ color: "#6B7A90" }}>
          Negociação e condições de pagamento
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Coluna Esquerda — Resumo do orçamento */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Resumo do Orçamento</p>
                <h2 className="text-xl font-medium">{orcamento.nome}</h2>
              </div>

              <div className="space-y-1 border-t pt-4">
                <p className="text-sm text-muted-foreground">Valor de venda base</p>
                <p className="text-3xl font-bold text-slate-900">{formatBRL(valorBase)}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div className="space-y-1">
                  <Label className="text-xs">Desconto (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={descontoExtra}
                    onChange={(e) => setDescontoExtra(Number(e.target.value || 0))}
                    className="h-10"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Valor após desconto</p>
                  <p className="text-lg font-medium py-2">{formatBRL(valorBase * (1 - descontoExtra / 100))}</p>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="space-y-1">
                  <Label className="text-xs">Condição de Pagamento</Label>
                  <Select value={condicaoId} onValueChange={setCondicaoId}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {condicoes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Taxa financeira embutida</p>
                  <p className="text-sm font-medium">
                    {formatBRL(calc.comTaxa - valorBase)}
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg space-y-1 border border-slate-100">
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Valor Total Final</p>
                  <p className="text-4xl font-bold text-emerald-600 tabular-nums">
                    {formatBRL(calc.comParceiro)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div className="space-y-1">
                  <Label className="text-xs">Tipo de Venda</Label>
                  <Select value={tipoVenda} onValueChange={setTipoVenda}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Normal">Normal</SelectItem>
                      <SelectItem value="Assistencia">Assistência</SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1.5 print:hidden">
                    Per. % Parceiro
                    <button
                      type="button"
                      onClick={() => setOcultarParceiro((v) => !v)}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      {ocultarParceiro ? (
                        <Lock className="h-3.5 w-3.5" />
                      ) : (
                        <Unlock className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </Label>
                  <div className={cn("relative", ocultarParceiro && "print:hidden")}>
                    <Input
                      type="number"
                      step="0.1"
                      value={percParceiro}
                      onChange={(e) => setPercParceiro(Number(e.target.value || 0))}
                      className="h-10 pr-8"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita — Parcelas */}
        <div className="space-y-4">
          <Card className="h-full">
            <CardContent className="p-6">
              <div className="mb-6">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Plano de Pagamento</p>
                <h3 className="text-lg font-medium">Parcelas e Vencimentos</h3>
              </div>
              
              {parcelas.length > 0 ? (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-semibold text-slate-700">Parcela</TableHead>
                        <TableHead className="font-semibold text-slate-700">Vencimento</TableHead>
                        <TableHead className="text-right font-semibold text-slate-700">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parcelas.map((p, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-50/50">
                          <TableCell className="font-medium">{p.label}</TableCell>
                          <TableCell>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    "h-8 w-full justify-start font-normal hover:bg-slate-100",
                                    !p.data && "text-muted-foreground",
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-3.5 w-3.5 text-slate-400" />
                                  {p.data
                                    ? format(new Date(p.data + "T00:00:00"), "dd/MM/yyyy", {
                                        locale: ptBR,
                                      })
                                    : "—"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={p.data ? new Date(p.data + "T00:00:00") : undefined}
                                  onSelect={(d) => handleDataChange(idx, d)}
                                  initialFocus
                                  className="p-3"
                                />
                              </PopoverContent>
                            </Popover>
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium">
                            {formatBRL(p.valor)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                  <p>Selecione uma condição de pagamento</p>
                  <p className="text-xs">para visualizar as parcelas</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Rodapé — Ações */}
      <div className="flex items-center justify-between pt-6 border-t mt-4">
        <Button
          variant="outline"
          onClick={() => navigate(`/clientes/${orcamento.cliente_id}`)}
          className="h-11 px-6"
        >
          Voltar
        </Button>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={handleSalvarRascunho}
            disabled={saving}
            className="text-muted-foreground hover:text-amber-600 hover:bg-amber-50 h-11"
          >
            Liberar desconto
          </Button>
          <Button
            onClick={handleAprovar}
            disabled={saving || !condicaoSel}
            className="h-11 px-8 bg-emerald-600 text-white hover:bg-emerald-700 font-semibold shadow-lg shadow-emerald-600/20"
          >
            Aprovar Orçamento ✓
          </Button>
        </div>
      </div>
    </div>
  );
}
