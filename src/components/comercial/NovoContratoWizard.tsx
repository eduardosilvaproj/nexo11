import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ChevronRight, 
  ChevronLeft, 
  Upload, 
  FileCode2, 
  CheckCircle2, 
  User, 
  Search, 
  Plus, 
  Save, 
  CheckCircle,
  Lock,
  Unlock,
  CalendarIcon,
  Loader2,
  Trash2,
  AlertCircle
} from "lucide-react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { parsePromobXml, type PromobParsed } from "@/lib/promob-xml";

type Step = 1 | 2 | 3;

interface Ambiente {
  id: string;
  nome: string;
  parsed: PromobParsed;
  desconto: number;
  selecionado: boolean;
}

type Parcela = { label: string; data: string; valor: number };

const formatBRL = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const toISO = (d: Date) => format(d, "yyyy-MM-dd");

interface Props {
  initialStep?: Step;
  clienteId?: string;
  leadId?: string;
  onClose?: () => void;
}

export function NovoContratoWizard({ initialStep = 1, clienteId, leadId, onClose }: Props) {
  const navigate = useNavigate();
  const { perfil, user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(initialStep);
  const [descontoGlobal, setDescontoGlobal] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // STEP 1: Cliente
  const [clientOption, setClientOption] = useState<"lead" | "new" | "fixed">(clienteId ? "fixed" : "lead");
  const [selectedLeadId, setSelectedLeadId] = useState<string>(leadId || "");
  const [clientData, setClientData] = useState({
    id: clienteId || "",
    nome: "",
    telefone: "",
    email: "",
    vendedor_id: ""
  });

  // STEP 2: Orçamento XML
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [parsing, setParsing] = useState(false);

  // STEP 3: Negociação
  const [condicaoId, setCondicaoId] = useState<string>("");
  const [tipoVenda, setTipoVenda] = useState("Normal");
  const [percParceiro, setPercParceiro] = useState(0);
  const [ocultarParceiro, setOcultarParceiro] = useState(false);
  const [datasParcelas, setDatasParcelas] = useState<string[]>([]);
  const [showPercParceiro, setShowPercParceiro] = useState(true);

  // --- Queries ---
  const { data: leads = [] } = useQuery({
    queryKey: ["leads-all"],
    enabled: clientOption === "lead",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, nome, contato, email, vendedor_id")
        .order("nome");
      if (error) throw error;
      return data;
    }
  });

  const { data: vendedores = [] } = useQuery({
    queryKey: ["vendedores-loja", perfil?.loja_id],
    enabled: !!perfil?.loja_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nome")
        .eq("loja_id", perfil!.loja_id!)
        .order("nome");
      if (error) throw error;
      return data;
    }
  });

  const { data: condicoes = [] } = useQuery({
    queryKey: ["condicoes-pagamento", perfil?.loja_id],
    enabled: !!perfil?.loja_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("condicoes_pagamento")
        .select("id, nome, parcelas, taxa")
        .eq("loja_id", perfil!.loja_id!)
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    if (clienteId && clientOption === "fixed") {
      (async () => {
        const { data } = await supabase.from("clientes").select("*").eq("id", clienteId).single();
        if (data) {
          setClientData({
            id: data.id,
            nome: data.nome,
            telefone: data.telefone || "",
            email: data.email || "",
            vendedor_id: ""
          });
        }
      })();
    }
  }, [clienteId, clientOption]);

  useEffect(() => {
    if (clientOption === "lead" && selectedLeadId) {
      const lead = leads.find(l => l.id === selectedLeadId);
      if (lead) {
        setClientData({
          id: "",
          nome: lead.nome,
          telefone: lead.contato || "",
          email: lead.email || "",
          vendedor_id: lead.vendedor_id || ""
        });
      }
    }
  }, [selectedLeadId, clientOption, leads]);

  // --- Handlers STEP 1 ---
  const handleNextStep1 = () => {
    if (!clientData.nome || (!clienteId && !clientData.vendedor_id)) {
      toast.error("Preencha o nome e o vendedor responsável");
      return;
    }
    setStep(2);
  };

  // --- Handlers STEP 2 ---
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setParsing(true);
    try {
      for (const f of Array.from(files)) {
        const text = await f.text();
        const data = parsePromobXml(text);
        const novo: Ambiente = {
          id: Math.random().toString(36).substring(7),
          nome: data.ordem_compra || f.name.replace(".xml", ""),
          parsed: data,
          desconto: 0,
          selecionado: true,
        };
        setAmbientes(prev => [...prev, novo]);
        toast.success(`Ambiente "${novo.nome}" adicionado`);
      }
    } catch (e) {
      toast.error("Falha ao ler XML: " + (e instanceof Error ? e.message : "Arquivo inválido"));
    } finally {
      setParsing(false);
    }
  };

  const totalsOrcamento = useMemo(() => {
    const list = ambientes.map(a => {
      const valorBase = a.parsed.total_orcamento || a.parsed.total_pedido || 0;
      const valorFinal = valorBase * (1 - a.desconto / 100);
      return { ...a, valorBase, valorFinal };
    });
    
    // Subtotal: Apenas os ambientes selecionados
    const subtotalSelecionados = list
      .filter(a => a.selecionado)
      .reduce((s, i) => s + i.valorFinal, 0);

    // Aplicar desconto global sobre o subtotal dos selecionados
    const totalComDescontoGlobal = subtotalSelecionados * (1 - descontoGlobal / 100);
    
    const totalFrete = ambientes.filter(a => a.selecionado).reduce((s, a) => s + (a.parsed.frete || 0), 0);
    const totalMontagem = ambientes.filter(a => a.selecionado).reduce((s, a) => s + (a.parsed.montagem || 0), 0);
    
    const baseNegociacao = totalComDescontoGlobal + totalFrete + totalMontagem;

    // Negociação (Taxa e Parceiro)
    const taxa = Number(condicaoSel?.taxa || 0);
    const numParcelas = Math.max(1, Number(condicaoSel?.parcelas || 1));
    const valorComTaxa = baseNegociacao * (1 + taxa / 100);
    const valorFinalTotal = valorComTaxa * (1 + percParceiro / 100);
    const valorParcela = valorFinalTotal / numParcelas;

    return { 
      list, 
      subtotalSelecionados, 
      totalComDescontoGlobal,
      totalFrete, 
      totalMontagem, 
      baseNegociacao,
      valorComTaxa,
      valorFinalTotal,
      valorParcela,
      numParcelas,
      taxa
    };
  }, [ambientes, descontoGlobal, condicaoSel, percParceiro]);

  const handleNextStep2 = () => {
    if (ambientes.filter(a => a.selecionado).length === 0) {
      toast.error("Selecione ao menos um ambiente");
      return;
    }
    setStep(3);
  };

  useEffect(() => {
    if (!condicaoSel) {
      setDatasParcelas([]);
      return;
    }
    const total = condicaoSel.parcelas;
    const hoje = new Date();
    const arr: string[] = [toISO(hoje)];
    for (let i = 1; i <= total; i++) arr.push(toISO(addDays(hoje, i * 30)));
    setDatasParcelas(arr);
  }, [condicaoSel]);

  const parcelas: Parcela[] = useMemo(() => {
    if (!condicaoSel) return [];
    const out: Parcela[] = [];
    out.push({
      label: "Entrada",
      data: datasParcelas[0] || toISO(new Date()),
      valor: totalsOrcamento.valorParcela,
    });
    for (let i = 1; i <= condicaoSel.parcelas; i++) {
      out.push({
        label: String(i),
        data: datasParcelas[i] || toISO(addDays(new Date(), i * 30)),
        valor: totalsOrcamento.valorParcela,
      });
    }
    return out;
  }, [condicaoSel, datasParcelas, totalsOrcamento.valorParcela]);

  const handleFinalize = async (isDraft = false) => {
    if (!perfil?.loja_id) return;
    if (!isDraft && !condicaoSel) {
      toast.error("Selecione uma condição de pagamento");
      return;
    }

    setIsSubmitting(true);
    try {
      let finalClienteId = clientData.id;
      if (!finalClienteId) {
        const { data: newCli, error: cliErr } = await supabase
          .from("clientes")
          .insert({
            loja_id: perfil.loja_id,
            nome: clientData.nome,
            email: clientData.email,
            telefone: clientData.telefone,
          })
          .select("id")
          .single();
        if (cliErr) throw cliErr;
        finalClienteId = newCli.id;
      }

      const todasCategorias: any[] = [];
      const todosItens: any[] = [];
      let totalTabela = 0;
      let totalPedido = 0;

      ambientes.forEach((a) => {
        const descAmbiente = a.desconto;
        const cats = a.parsed.categorias.map((c) => ({
          ...c,
          descricao: `[${a.nome}] ${c.description}`,
          desconto_pct: descAmbiente,
          valor: c.budget * (1 - descAmbiente / 100),
          ambiente: a.nome,
        }));
        todasCategorias.push(...cats);
        todosItens.push(...a.parsed.itens.map(it => ({ ...it, ambiente: a.nome })));
        totalTabela += a.parsed.total_tabela;
        totalPedido += a.parsed.total_pedido;
      });

      const parcelasJson = parcelas.map((p) => ({
        label: p.label,
        data: p.data,
        valor: Number(p.valor.toFixed(2)),
      }));

      const { data: orcamento, error: orcErr } = await supabase
        .from("orcamentos")
        .insert({
          loja_id: perfil.loja_id,
          cliente_id: finalClienteId,
          vendedor_id: clientData.vendedor_id || user?.id,
          nome: ambientes.length === 1 ? ambientes[0].nome : `Orçamento Multi (${ambientes.length})`,
          valor_negociado: totalsStep2.totalFinal,
          total_pedido: totalPedido,
          total_tabela: totalTabela,
          desconto_global: 0,
          frete_loja: totalsStep2.totalFrete,
          montagem_loja: totalsStep2.totalMontagem,
          status: isDraft ? "rascunho" : "aprovado",
          condicao_pagamento_id: condicaoSel?.id || null,
          taxa_financeira: condicaoSel?.taxa || 0,
          parcelas: condicaoSel?.parcelas || null,
          valor_parcela: isDraft ? null : Number(calcStep3.valorParcela.toFixed(2)),
          percentual_parceiro: percParceiro,
          ocultar_parceiro: ocultarParceiro,
          tipo_venda: tipoVenda,
          parcelas_datas: isDraft ? null : parcelasJson as any,
          itens: todosItens as any,
          categorias: todasCategorias as any,
        })
        .select("id")
        .single();
      if (orcErr) throw orcErr;

      if (!isDraft) {
        const { data: contrato, error: contErr } = await supabase
          .from("contratos")
          .insert({
            loja_id: perfil.loja_id,
            cliente_id: finalClienteId,
            cliente_nome: clientData.nome,
            valor_venda: Number(calcStep3.comParceiro.toFixed(2)),
            vendedor_id: clientData.vendedor_id || user?.id,
            status: "comercial",
          })
          .select("id")
          .single();
        if (contErr) throw contErr;

        await supabase.from("orcamentos").update({ contrato_id: contrato.id }).eq("id", orcamento.id);
        if (selectedLeadId) await supabase.from("leads").update({ status: "convertido" }).eq("id", selectedLeadId);

        toast.success("Contrato gerado com sucesso!");
        navigate(`/contratos/${contrato.id}`);
      } else {
        toast.success("Rascunho salvo!");
        if (onClose) onClose(); else navigate("/comercial");
      }
    } catch (e) {
      toast.error("Erro: " + (e instanceof Error ? e.message : "Desconhecido"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4">
      <div className="flex items-center justify-center gap-4">
        {[
          { n: 1, label: "Cliente" },
          { n: 2, label: "Orçamento XML" },
          { n: 3, label: "Negociação" }
        ].map((s, idx) => (
          <div key={s.n} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold",
                step === s.n ? "border-primary bg-primary/10 text-primary" : step > s.n ? "border-emerald-500 bg-emerald-50 text-emerald-500" : "border-slate-200 text-slate-400"
              )}>
                {step > s.n ? <CheckCircle className="h-4 w-4" /> : s.n}
              </div>
              <span className="text-[10px] font-bold uppercase text-slate-400">{s.label}</span>
            </div>
            {idx < 2 && <div className={cn("mx-2 h-[2px] w-8 md:w-20", step > s.n ? "bg-emerald-500" : "bg-slate-200")} />}
          </div>
        ))}
      </div>

      <div className="min-h-[400px]">
        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {clientOption !== "fixed" && (
              <Card 
                className={cn("cursor-pointer border-2 transition-all", clientOption === "lead" ? "border-primary bg-primary/5" : "hover:border-slate-300")}
                onClick={() => setClientOption("lead")}
              >
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <Search className="h-5 w-5 text-primary" />
                    <h3 className="font-bold">Lead Existente</h3>
                  </div>
                  <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Selecione um lead..." />
                    </SelectTrigger>
                    <SelectContent>
                      {leads.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )}
            <Card 
              className={cn("cursor-pointer border-2 transition-all", clientOption === "new" ? "border-primary bg-primary/5" : clientOption === "fixed" ? "border-primary bg-primary/5 cursor-default" : "hover:border-slate-300")}
              onClick={() => clientOption !== "fixed" && setClientOption("new")}
            >
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Plus className="h-5 w-5 text-primary" />
                  <h3 className="font-bold">{clientOption === "fixed" ? "Cliente Selecionado" : "Novo Cliente"}</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Nome Completo</Label>
                    <Input value={clientData.nome} onChange={e => setClientData(d => ({ ...d, nome: e.target.value }))} readOnly={clientOption === "fixed"} />
                  </div>
                  <div>
                    <Label className="text-xs">Vendedor Responsável</Label>
                    <Select value={clientData.vendedor_id} onValueChange={v => setClientData(d => ({ ...d, vendedor_id: v }))}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {vendedores.map(v => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <input type="file" ref={fileInputRef} onChange={e => handleFiles(e.target.files)} multiple className="hidden" accept=".xml" />
            <Button variant="outline" className="w-full h-24 border-dashed flex flex-col gap-2" onClick={() => fileInputRef.current?.click()} disabled={parsing}>
              {parsing ? <Loader2 className="animate-spin" /> : <Upload />}
              <span>{parsing ? "Processando..." : "+ Adicionar Arquivo XML Promob"}</span>
            </Button>
            
            <div className="grid gap-4">
              {ambientes.map(amb => (
                <Card key={amb.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-bold">{amb.nome}</p>
                      <p className="text-sm text-slate-500">{formatBRL(amb.parsed.total_orcamento)} (Base BUDGET)</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-24">
                        <Label className="text-[10px]">Desc %</Label>
                        <Input type="number" value={amb.desconto} onChange={e => setAmbientes(prev => prev.map(x => x.id === amb.id ? { ...x, desconto: Number(e.target.value) } : x))} />
                      </div>
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500" onClick={() => setAmbientes(prev => prev.filter(x => x.id !== amb.id))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label>Condição de Pagamento</Label>
                    <Select value={condicaoId} onValueChange={setCondicaoId}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>{condicoes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Percentual Parceiro (%)</Label>
                    <Input type="number" value={percParceiro} onChange={e => setPercParceiro(Number(e.target.value))} />
                  </div>
                  <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                    <p className="text-xs text-primary font-bold uppercase">Total Final</p>
                    <p className="text-3xl font-bold">{formatBRL(calcStep3.comParceiro)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold mb-4">Plano de Pagamento</h3>
                <Table>
                  <TableHeader><TableRow><TableHead>Parcela</TableHead><TableHead>Vencimento</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {parcelas.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell>{p.label}</TableCell>
                        <TableCell>{format(new Date(p.data), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="text-right">{formatBRL(p.valor)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center border-t pt-6">
        <Button variant="ghost" onClick={() => {
          if (step > 1) {
            setStep(s => (s - 1) as Step);
          } else if (onClose) {
            onClose();
          } else {
            navigate(-1);
          }
        }}>
          {step === 1 ? "Cancelar" : "Anterior"}
        </Button>
        <div className="flex gap-2">
          {step === 3 && <Button variant="outline" onClick={() => handleFinalize(true)} disabled={isSubmitting}>Salvar Rascunho</Button>}
          <Button onClick={() => {
            if (step === 1) handleNextStep1();
            else if (step === 2) handleNextStep2();
            else handleFinalize();
          }} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : null}
            {step === 3 ? "Finalizar Contrato" : "Próximo"}
          </Button>
        </div>
      </div>
    </div>
  );
}
