import { useState, useMemo, useEffect } from "react";
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
  Loader2
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

// --- Types ---

type Step = 1 | 2 | 3;

type Lead = {
  id: string;
  nome: string;
  contato: string | null;
  email: string | null;
  vendedor_id: string | null;
};

type Usuario = {
  id: string;
  nome: string;
};

type Condicao = {
  id: string;
  nome: string;
  parcelas: number;
  taxa: number;
};

type Parcela = { label: string; data: string; valor: number };

// --- Helpers ---

const formatBRL = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const toISO = (d: Date) => format(d, "yyyy-MM-dd");

export default function NewContract() {
  const navigate = useNavigate();
  const { perfil, user } = useAuth();
  const queryClient = useQueryClient();

  // --- State ---
  const [step, setStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // STEP 1: Cliente
  const [clientOption, setClientOption] = useState<"lead" | "new">("lead");
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [clientData, setClientData] = useState({
    nome: "",
    telefone: "",
    email: "",
    vendedor_id: ""
  });

  // STEP 2: Orçamento XML
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [parsedXml, setParsedXml] = useState<PromobParsed | null>(null);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [parsing, setParsing] = useState(false);

  // STEP 3: Negociação
  const [condicaoId, setCondicaoId] = useState<string>("");
  const [tipoVenda, setTipoVenda] = useState("Normal");
  const [percParceiro, setPercParceiro] = useState(0);
  const [ocultarParceiro, setOcultarParceiro] = useState(false);
  const [datasParcelas, setDatasParcelas] = useState<string[]>([]);

  // --- Queries ---
  const { data: leads = [] } = useQuery({
    queryKey: ["leads-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, nome, contato, email, vendedor_id")
        .order("nome");
      if (error) throw error;
      return data as Lead[];
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
      return data as Usuario[];
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
      return data as Condicao[];
    }
  });

  // --- Effects ---
  useEffect(() => {
    if (clientOption === "lead" && selectedLeadId) {
      const lead = leads.find(l => l.id === selectedLeadId);
      if (lead) {
        setClientData({
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
    if (!clientData.nome || !clientData.vendedor_id) {
      toast.error("Preencha o nome e o vendedor responsável");
      return;
    }
    setStep(2);
  };

  // --- Handlers STEP 2 ---
  const handleXmlUpload = async (f: File | null) => {
    if (!f) return;
    setParsing(true);
    try {
      const text = await f.text();
      const data = parsePromobXml(text);
      setParsedXml(data);
      setXmlFile(f);
      setGlobalDiscount(0); // Reset discount on new file
    } catch (e) {
      toast.error("Falha ao ler XML: " + (e instanceof Error ? e.message : "Arquivo inválido"));
    } finally {
      setParsing(false);
    }
  };

  const calcStep2 = useMemo(() => {
    if (!parsedXml) return null;
    const subtotal = parsedXml.total_tabela * (1 - globalDiscount / 100);
    const totalVenda = subtotal + (parsedXml.frete || 0) + (parsedXml.montagem || 0);
    return { subtotal, totalVenda };
  }, [parsedXml, globalDiscount]);

  const handleNextStep2 = () => {
    if (!parsedXml) {
      toast.error("Importe o XML do Promob");
      return;
    }
    setStep(3);
  };

  // --- Handlers STEP 3 ---
  const condicaoSel = useMemo(
    () => condicoes.find((c) => c.id === condicaoId) || null,
    [condicoes, condicaoId],
  );

  const valorBase = calcStep2?.totalVenda || 0;

  const calcStep3 = useMemo(() => {
    const taxa = Number(condicaoSel?.taxa || 0);
    const numParcelas = Math.max(1, Number(condicaoSel?.parcelas || 1));
    const comTaxa = valorBase * (1 + taxa / 100);
    const comParceiro = comTaxa * (1 + percParceiro / 100);
    const valorParcela = comParceiro / numParcelas;
    return { taxa, numParcelas, comTaxa, comParceiro, valorParcela };
  }, [valorBase, condicaoSel, percParceiro]);

  // gerar datas quando condição muda
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
      valor: calcStep3.valorParcela,
    });
    for (let i = 1; i <= condicaoSel.parcelas; i++) {
      out.push({
        label: String(i),
        data: datasParcelas[i] || toISO(addDays(new Date(), i * 30)),
        valor: calcStep3.valorParcela,
      });
    }
    return out;
  }, [condicaoSel, datasParcelas, calcStep3.valorParcela]);

  const handleDataChange = (idx: number, data: Date | undefined) => {
    if (!data) return;
    setDatasParcelas((prev) => {
      const arr = [...prev];
      arr[idx] = toISO(data);
      return arr;
    });
  };

  // --- Final Approval ---
  const handleFinalize = async (isDraft = false) => {
    if (!perfil?.loja_id) return;
    if (!isDraft && !condicaoSel) {
      toast.error("Selecione uma condição de pagamento");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1) Criar Cliente se for novo ou não existir
      let clienteId = "";
      if (clientOption === "lead" && selectedLeadId) {
        // Se for lead, podemos querer converter em cliente
        // Primeiro verificamos se já tem cliente com esse nome/email
        const { data: existing } = await supabase
          .from("clientes")
          .select("id")
          .eq("loja_id", perfil.loja_id)
          .eq("nome", clientData.nome)
          .maybeSingle();
        
        if (existing) {
          clienteId = existing.id;
        } else {
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
          clienteId = newCli.id;
        }
      } else {
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
        clienteId = newCli.id;
      }

      // 2) Criar Orçamento
      const parcelasJson = parcelas.map((p) => ({
        label: p.label,
        data: p.data,
        valor: Number(p.valor.toFixed(2)),
      }));

      const { data: orcamento, error: orcErr } = await supabase
        .from("orcamentos")
        .insert({
          loja_id: perfil.loja_id,
          cliente_id: clienteId,
          vendedor_id: clientData.vendedor_id || user?.id,
          nome: parsedXml?.ordem_compra || xmlFile?.name?.replace(".xml", "") || "Novo Contrato",
          valor_negociado: calcStep2?.totalVenda || 0,
          total_pedido: parsedXml?.total_pedido || 0,
          total_tabela: parsedXml?.total_tabela || 0,
          desconto_global: globalDiscount,
          frete_loja: parsedXml?.frete || 0,
          montagem_loja: parsedXml?.montagem || 0,
          status: isDraft ? "rascunho" : "aprovado",
          condicao_pagamento_id: condicaoSel?.id || null,
          taxa_financeira: condicaoSel?.taxa || 0,
          parcelas: condicaoSel?.parcelas || null,
          valor_parcela: isDraft ? null : Number(calcStep3.valorParcela.toFixed(2)),
          percentual_parceiro: percParceiro,
          ocultar_parceiro: ocultarParceiro,
          tipo_venda: tipoVenda,
          parcelas_datas: isDraft ? null : parcelasJson as unknown as never,
          itens: parsedXml?.itens as unknown as never,
          categorias: parsedXml?.categorias as unknown as never,
        })
        .select("id")
        .single();
      if (orcErr) throw orcErr;

      // 3) Criar Contrato se aprovado
      if (!isDraft) {
        const { data: contrato, error: contErr } = await supabase
          .from("contratos")
          .insert({
            loja_id: perfil.loja_id,
            cliente_id: clienteId,
            cliente_nome: clientData.nome,
            valor_venda: Number(calcStep3.comParceiro.toFixed(2)),
            vendedor_id: clientData.vendedor_id || user?.id,
            status: "comercial",
          })
          .select("id")
          .single();
        if (contErr) throw contErr;

        // Atualizar orçamento com o contrato_id
        await supabase
          .from("orcamentos")
          .update({ contrato_id: contrato.id })
          .eq("id", orcamento.id);

        // Atualizar lead se existir
        if (selectedLeadId) {
          await supabase
            .from("leads")
            .update({ status: "convertido" })
            .eq("id", selectedLeadId);
        }

        toast.success("Contrato gerado com sucesso!");
        navigate(`/contratos/${contrato.id}`);
      } else {
        toast.success("Rascunho salvo!");
        navigate("/comercial");
      }

    } catch (e) {
      toast.error("Erro ao salvar: " + (e instanceof Error ? e.message : "Desconhecido"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Render ---

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 md:p-8">
      {/* Header & Stepper */}
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Novo Contrato</h1>
          <p className="text-slate-500">Siga os passos para gerar um novo contrato e orçamento</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center">
          {[
            { n: 1, label: "Cliente" },
            { n: 2, label: "Orçamento XML" },
            { n: 3, label: "Negociação" }
          ].map((s, idx) => (
            <div key={s.n} className="flex items-center">
              <div className="flex flex-col items-center gap-2">
                <div 
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                    step === s.n 
                      ? "border-blue-600 bg-blue-50 text-blue-600" 
                      : step > s.n 
                        ? "border-green-500 bg-green-50 text-green-500"
                        : "border-slate-200 bg-white text-slate-400"
                  )}
                >
                  {step > s.n ? <CheckCircle className="h-5 w-5" /> : s.n}
                </div>
                <span className={cn(
                  "text-xs font-medium uppercase tracking-wider",
                  step === s.n ? "text-blue-600" : "text-slate-400"
                )}>
                  {s.label}
                </span>
              </div>
              {idx < 2 && (
                <div className={cn(
                  "mx-4 h-0.5 w-16 md:w-32",
                  step > s.n ? "bg-green-500" : "bg-slate-200"
                )} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="min-h-[400px]">
        {/* STEP 1: CLIENTE */}
        {step === 1 && (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <Card 
              className={cn(
                "cursor-pointer transition-all hover:border-blue-300",
                clientOption === "lead" && "border-blue-500 bg-blue-50/30"
              )}
              onClick={() => setClientOption("lead")}
            >
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-blue-100 p-2 text-blue-600">
                    <Search className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-slate-900">Importar de lead existente</h3>
                </div>
                <p className="text-sm text-slate-500">Selecione um lead já cadastrado no funil de vendas.</p>
                
                <div className="space-y-2" onClick={e => e.stopPropagation()}>
                  <Label>Buscar Lead</Label>
                  <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Selecione um lead..." />
                    </SelectTrigger>
                    <SelectContent>
                      {leads.map(l => (
                        <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={cn(
                "cursor-pointer transition-all hover:border-blue-300",
                clientOption === "new" && "border-blue-500 bg-blue-50/30"
              )}
              onClick={() => setClientOption("new")}
            >
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-slate-100 p-2 text-slate-600">
                    <Plus className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-slate-900">Novo Cliente</h3>
                </div>
                <p className="text-sm text-slate-500">Cadastre um novo cliente diretamente aqui.</p>
                
                <div className="space-y-3" onClick={e => e.stopPropagation()}>
                  <div className="space-y-1">
                    <Label>Nome Completo *</Label>
                    <Input 
                      value={clientData.nome} 
                      onChange={e => setClientData({...clientData, nome: e.target.value})}
                      placeholder="Ex: João Silva"
                      className="bg-white"
                      disabled={clientOption === "lead"}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Telefone</Label>
                      <Input 
                        value={clientData.telefone} 
                        onChange={e => setClientData({...clientData, telefone: e.target.value})}
                        placeholder="(00) 00000-0000"
                        className="bg-white"
                        disabled={clientOption === "lead"}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>E-mail</Label>
                      <Input 
                        value={clientData.email} 
                        onChange={e => setClientData({...clientData, email: e.target.value})}
                        placeholder="email@exemplo.com"
                        className="bg-white"
                        disabled={clientOption === "lead"}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="md:col-span-2">
              <div className="mx-auto max-w-md space-y-2">
                <Label>Vendedor Responsável *</Label>
                <Select value={clientData.vendedor_id} onValueChange={val => setClientData({...clientData, vendedor_id: val})}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecione o vendedor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vendedores.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: ORÇAMENTO XML */}
        {step === 2 && (
          <div className="space-y-8">
            <div className="mx-auto max-w-xl">
              {!parsedXml ? (
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 transition-all hover:border-blue-400 hover:bg-blue-50">
                  <input 
                    type="file" 
                    accept=".xml" 
                    className="hidden" 
                    onChange={e => handleXmlUpload(e.target.files?.[0] || null)}
                  />
                  {parsing ? (
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                  ) : (
                    <Upload className="h-12 w-12 text-slate-400" />
                  )}
                  <p className="mt-4 text-lg font-medium text-slate-900">Importar XML do Promob</p>
                  <p className="text-sm text-slate-500">Clique ou arraste o arquivo aqui</p>
                </label>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-green-100 p-2 text-green-600">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-800">XML Importado com sucesso</p>
                        <p className="text-xs text-green-600">{xmlFile?.name}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setParsedXml(null)} className="text-green-800 hover:bg-green-100">
                      Trocar arquivo
                    </Button>
                  </div>

                  <Card className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="bg-slate-50 p-6 space-y-4">
                        <div className="space-y-1">
                          <Label className="text-xs uppercase text-slate-400 font-bold">Nome do Ambiente</Label>
                          <p className="text-xl font-semibold text-slate-900">{parsedXml.ordem_compra || xmlFile?.name?.replace(".xml", "")}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label className="text-xs uppercase text-slate-400 font-bold">Valor de Venda (Base)</Label>
                            <p className="text-2xl font-bold text-slate-900">{formatBRL(parsedXml.total_tabela)}</p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs uppercase text-slate-400 font-bold">Desconto Global %</Label>
                            <div className="flex items-center gap-2">
                              <Input 
                                type="number" 
                                value={globalDiscount} 
                                onChange={e => setGlobalDiscount(Number(e.target.value))}
                                className="h-10 text-right font-medium"
                                step="0.5"
                              />
                              <span className="text-slate-500 font-medium">%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-900 p-8 text-center text-white">
                        <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-2">Valor após desconto</p>
                        <p className="text-5xl font-bold">{formatBRL(calcStep2?.totalVenda || 0)}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: NEGOCIAÇÃO */}
        {step === 3 && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Condição de Pagamento</Label>
                      <Select value={condicaoId} onValueChange={setCondicaoId}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {condicoes.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {condicaoSel && (
                        <p className="text-xs text-blue-600 font-medium">
                          Taxa financeira: {condicaoSel.taxa}% | {condicaoSel.parcelas} parcelas
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tipo de Venda</Label>
                        <Select value={tipoVenda} onValueChange={setTipoVenda}>
                          <SelectTrigger className="h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Normal">Normal</SelectItem>
                            <SelectItem value="Assistencia">Assistência</SelectItem>
                            <SelectItem value="Outros">Outros</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          Per. % Parceiro
                          <button onClick={() => setOcultarParceiro(!ocultarParceiro)} className="text-slate-400">
                            {ocultarParceiro ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                          </button>
                        </Label>
                        <div className="relative">
                          <Input 
                            type="number" 
                            value={percParceiro} 
                            onChange={e => setPercParceiro(Number(e.target.value))}
                            className="h-11 pr-8"
                          />
                          <span className="absolute right-3 top-3 text-sm text-slate-400">%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-6 space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Valor Total Final</p>
                    <p className="text-4xl font-bold text-emerald-700">{formatBRL(calcStep3.comParceiro)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-slate-400" />
                Tabela de Parcelas
              </h3>
              <Card>
                <div className="rounded-md border border-slate-100">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Parcela</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parcelas.map((p, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium text-slate-700">{p.label}</TableCell>
                          <TableCell>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 font-normal">
                                  {format(new Date(p.data), "dd/MM/yyyy")}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={new Date(p.data)}
                                  onSelect={(d) => handleDataChange(idx, d)}
                                  initialFocus
                                  locale={ptBR}
                                />
                              </PopoverContent>
                            </Popover>
                          </TableCell>
                          <TableCell className="text-right font-medium text-slate-900">
                            {formatBRL(p.valor)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {parcelas.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="h-32 text-center text-slate-400">
                            Selecione uma condição de pagamento para gerar as parcelas
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Footer Buttons */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-8">
        <Button 
          variant="outline" 
          onClick={() => step === 1 ? navigate("/comercial") : setStep((step - 1) as Step)}
          className="h-11 px-6"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          {step === 1 ? "Cancelar" : "Voltar"}
        </Button>

        <div className="flex items-center gap-3">
          {step === 3 && (
            <Button 
              variant="secondary" 
              onClick={() => handleFinalize(true)}
              disabled={isSubmitting}
              className="h-11 px-6"
            >
              <Save className="mr-2 h-4 w-4" />
              Salvar rascunho
            </Button>
          )}

          {step < 3 ? (
            <Button 
              onClick={step === 1 ? handleNextStep1 : handleNextStep2} 
              className="h-11 bg-blue-600 px-8 hover:bg-blue-700"
            >
              Próximo
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button 
              onClick={() => handleFinalize(false)}
              disabled={isSubmitting}
              className="h-11 bg-green-600 px-8 hover:bg-green-700"
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Aprovar e gerar contrato
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
