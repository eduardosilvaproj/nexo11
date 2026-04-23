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
  AlertCircle,
  Eye,
  EyeOff
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
    vendedor_id: "",
    projetista_id: "",
    mesmo_vendedor: true
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

  // Manter sincronizado se "mesmo_vendedor" estiver ativo
  useEffect(() => {
    if (clientData.mesmo_vendedor && clientData.vendedor_id !== clientData.projetista_id) {
      setClientData(prev => ({ ...prev, projetista_id: prev.vendedor_id }));
    }
  }, [clientData.mesmo_vendedor, clientData.vendedor_id, clientData.projetista_id]);

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

  const { data: membrosEquipe = [] } = useQuery({
    queryKey: ["membros-equipe-loja", perfil?.loja_id],
    enabled: !!perfil?.loja_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select(`
          id, 
          nome,
          papeis_comissao!papel_comissao_id (
            nome
          )
        `)
        .eq("loja_id", perfil!.loja_id!)
        .order("nome");
      if (error) throw error;
      return data;
    }
  });

  const vendedores = useMemo(() => {
    return membrosEquipe.filter(m => {
      const papel = (m as any).papeis_comissao?.nome;
      return papel === "Vendedor" || papel === "Vendedor + Projetista";
    });
  }, [membrosEquipe]);

  const projetistas = useMemo(() => {
    return membrosEquipe.filter(m => {
      const papel = (m as any).papeis_comissao?.nome;
      return papel === "Projetista" || papel === "Vendedor + Projetista";
    });
  }, [membrosEquipe]);

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
          setClientData(prev => ({
            ...prev,
            id: data.id,
            nome: data.nome,
            telefone: data.telefone || "",
            email: data.email || "",
          }));
        }
      })();
    }
  }, [clienteId, clientOption]);

  useEffect(() => {
    if (clientOption === "lead" && selectedLeadId) {
      const lead = leads.find(l => l.id === selectedLeadId);
      if (lead) {
        setClientData(prev => ({
          ...prev,
          id: "",
          nome: lead.nome,
          telefone: lead.contato || "",
          email: lead.email || "",
          vendedor_id: lead.vendedor_id || "",
          projetista_id: lead.vendedor_id || "", // Default projetista to lead's vendedor
          mesmo_vendedor: true
        }));
      }
    }
  }, [selectedLeadId, clientOption, leads]);

  // --- Handlers STEP 1 ---
  const validateStep1 = () => {
    if (!clientData.nome) {
      toast.error("Preencha o nome do cliente");
      return false;
    }
    
    if (!clientData.vendedor_id) {
      toast.error("Selecione o vendedor responsável");
      return false;
    }

    if (!clientData.mesmo_vendedor) {
      if (!clientData.projetista_id) {
        toast.error("Selecione o projetista responsável");
        return false;
      }
      
      if (clientData.vendedor_id === clientData.projetista_id) {
        toast.error("Vendedor e Projetista não podem ser a mesma pessoa se a opção 'Mesmo que o vendedor' estiver desmarcada");
        return false;
      }
    }
    return true;
  };

  const handleNextStep1 = () => {
    if (validateStep1()) {
      setStep(2);
    }
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

  const condicaoSel = useMemo(
    () => condicoes.find((c) => c.id === condicaoId) || null,
    [condicoes, condicaoId],
  );

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
    setStep(2); // In the new layout, we only have step 1 and 2
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
    
    if (!isDraft) {
      if (!validateStep1()) return;

      if (!condicaoSel) {
        toast.error("Selecione uma condição de pagamento");
        return;
      }
    }

    const finalVendedorId = clientData.vendedor_id || user?.id;
    const finalProjetistaId = clientData.mesmo_vendedor ? finalVendedorId : (clientData.projetista_id || user?.id);

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
          projetista_id: clientData.projetista_id || user?.id,
          nome: ambientes.length === 1 ? ambientes[0].nome : `Orçamento Multi (${ambientes.length})`,
          valor_negociado: totalsOrcamento.valorFinalTotal,
          total_pedido: totalPedido,
          total_tabela: totalTabela,
          desconto_global: descontoGlobal,
          frete_loja: totalsOrcamento.totalFrete,
          montagem_loja: totalsOrcamento.totalMontagem,
          status: isDraft ? "rascunho" : "aprovado",
          condicao_pagamento_id: condicaoSel?.id || null,
          taxa_financeira: condicaoSel?.taxa || 0,
          parcelas: condicaoSel?.parcelas || null,
          valor_parcela: isDraft ? null : Number(totalsOrcamento.valorParcela.toFixed(2)),
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
            valor_venda: Number(totalsOrcamento.valorFinalTotal.toFixed(2)),
            vendedor_id: clientData.vendedor_id || user?.id,
            projetista_id: clientData.projetista_id || user?.id,
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
    <div className="mx-auto max-w-6xl space-y-8 p-4">
      {step === 1 ? (
        <div className="space-y-6">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Vendedor *</Label>
                      <Select 
                        value={clientData.vendedor_id} 
                        onValueChange={v => setClientData(d => ({
                          ...d, 
                          vendedor_id: v,
                          projetista_id: d.mesmo_vendedor ? v : d.projetista_id
                        }))}
                      >
                        <SelectTrigger className="bg-white border-slate-200">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {vendedores.map(v => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">Projetista *</Label>
                        <div className="flex items-center gap-1.5">
                          <Checkbox 
                            id="mesmo_vendedor"
                            checked={clientData.mesmo_vendedor}
                            onCheckedChange={(checked) => {
                              const isChecked = checked === true;
                              setClientData(d => ({
                                ...d,
                                mesmo_vendedor: isChecked,
                                projetista_id: isChecked ? d.vendedor_id : ""
                              }));
                            }}
                          />
                          <Label htmlFor="mesmo_vendedor" className="text-[10px] text-slate-500 cursor-pointer">
                            Mesmo que o vendedor
                          </Label>
                        </div>
                      </div>
                      <Select 
                        value={clientData.projetista_id} 
                        disabled={clientData.mesmo_vendedor}
                        onValueChange={v => setClientData(d => ({ ...d, projetista_id: v }))}
                      >
                        <SelectTrigger className={cn("bg-white border-slate-200", clientData.mesmo_vendedor && "opacity-60")}>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {projetistas.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleNextStep1} size="lg">
              Próximo <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Orçamento e Negociação</h2>
            <div className="flex items-center gap-2">
               <span className="text-sm font-medium text-slate-500">Cliente:</span>
               <span className="text-sm font-bold text-slate-900">{clientData.nome}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* COLUNA ESQUERDA — Ambientes */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-700 uppercase text-xs tracking-wider">Ambientes</h3>
                <input type="file" ref={fileInputRef} onChange={e => handleFiles(e.target.files)} multiple className="hidden" accept=".xml" />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={parsing}>
                  {parsing ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                  + Adicionar ambiente (XML)
                </Button>
              </div>

              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-2">
                    {totalsOrcamento.list.map((amb) => (
                      <div key={amb.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                        <Checkbox 
                          checked={amb.selecionado} 
                          onCheckedChange={(val) => setAmbientes(prev => prev.map(x => x.id === amb.id ? { ...x, selecionado: !!val } : x))} 
                        />
                        <div className="flex-1 grid grid-cols-[1fr,auto] gap-2 items-center">
                          <span className={cn("text-sm font-medium", !amb.selecionado && "text-slate-400 line-through")}>{amb.nome}</span>
                          <span className={cn("text-sm font-bold tabular-nums", !amb.selecionado && "text-slate-400")}>
                            {formatBRL(amb.valorFinal)}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-400">Desc:</span>
                            <div className="flex items-center gap-1">
                              <Input 
                                type="number" 
                                value={amb.desconto} 
                                onChange={e => setAmbientes(prev => prev.map(x => x.id === amb.id ? { ...x, desconto: Number(e.target.value) } : x))}
                                className="h-6 w-12 text-[10px] px-1"
                              />
                              <span className="text-[10px] text-slate-400">%</span>
                            </div>
                            <span className="text-[10px] text-slate-400">→ {formatBRL(amb.valorFinal)}</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-300 hover:text-red-500"
                            onClick={() => setAmbientes(prev => prev.filter(x => x.id !== amb.id))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {ambientes.length === 0 && (
                      <p className="text-center py-8 text-slate-400 text-sm italic">Nenhum ambiente importado</p>
                    )}
                  </div>

                  <div className="pt-4 border-t space-y-2">
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>Subtotal ambientes selecionados:</span>
                      <span className="font-bold tabular-nums">{formatBRL(totalsOrcamento.subtotalSelecionados)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>Desconto adicional global %:</span>
                      <div className="flex items-center gap-2">
                        <Input 
                          type="number" 
                          value={descontoGlobal} 
                          onChange={e => setDescontoGlobal(Number(e.target.value))}
                          className="h-8 w-16"
                        />
                      </div>
                    </div>
                    <div className="pt-2 flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-900 uppercase">Total Geral:</span>
                      <span className="text-2xl font-black text-slate-900 tabular-nums">
                        {formatBRL(totalsOrcamento.baseNegociacao)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* COLUNA DIREITA — Negociação */}
            <div className="space-y-6">
              <h3 className="font-bold text-slate-700 uppercase text-xs tracking-wider">Negociação</h3>
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Condição de Pagamento</Label>
                      <Select value={condicaoId} onValueChange={setCondicaoId}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>{condicoes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-slate-500">Taxa financeira</p>
                      <p className="text-sm font-bold pt-2">
                        {formatBRL(totalsOrcamento.valorComTaxa - totalsOrcamento.baseNegociacao)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tipo de Venda</Label>
                      <Select value={tipoVenda} onValueChange={setTipoVenda}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Normal">Normal</SelectItem>
                          <SelectItem value="Assistencia">Assistência</SelectItem>
                          <SelectItem value="Outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 print:hidden">
                        <Label className="text-[10px] text-slate-400">Per.%</Label>
                        <button type="button" onClick={() => setShowPercParceiro(!showPercParceiro)}>
                          {showPercParceiro ? <Eye className="h-3 w-3 text-slate-400" /> : <EyeOff className="h-3 w-3 text-slate-400" />}
                        </button>
                      </div>
                      {showPercParceiro && (
                        <div className="flex items-center gap-1">
                           <Input 
                            type="number" 
                            className="h-8 w-16 text-xs" 
                            value={percParceiro} 
                            onChange={e => setPercParceiro(Number(e.target.value))} 
                          />
                          <span className="text-xs text-slate-400">%</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 space-y-1">
                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Valor Final Total</p>
                    <p className="text-4xl font-black text-emerald-600 tabular-nums">
                      {formatBRL(totalsOrcamento.valorFinalTotal)}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-700">Tabela de parcelas</h4>
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="h-9 text-[11px] font-bold">Parcela</TableHead>
                            <TableHead className="h-9 text-[11px] font-bold">Vencimento</TableHead>
                            <TableHead className="h-9 text-[11px] font-bold text-right">Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parcelas.map((p, idx) => (
                            <TableRow key={idx} className="h-10">
                              <TableCell className="text-xs font-medium">{p.label}</TableCell>
                              <TableCell className="text-xs">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs hover:bg-slate-100">
                                      {format(new Date(p.data), "dd/MM/yyyy")}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar 
                                      mode="single" 
                                      selected={new Date(p.data)} 
                                      onSelect={(d) => {
                                        if (d) {
                                          const newDatas = [...datasParcelas];
                                          newDatas[idx] = toISO(d);
                                          setDatasParcelas(newDatas);
                                        }
                                      }}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </TableCell>
                              <TableCell className="text-xs text-right font-bold tabular-nums">
                                {formatBRL(p.valor)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex justify-between items-center border-t pt-8">
            <Button variant="ghost" onClick={() => setStep(1)} disabled={isSubmitting}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => handleFinalize(true)} disabled={isSubmitting || ambientes.length === 0}>
                {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                Liberar desconto
              </Button>
              <Button onClick={() => handleFinalize(false)} disabled={isSubmitting || !condicaoSel} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Aprovar e gerar contrato
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
