import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Check, Edit2, Search, Calendar, Download, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { canPerform } from "@/lib/permissions";

interface Boleto {
  id: string;
  descricao: string;
  valor: number;
  vencimento: string;
  data_pagamento: string | null;
  status: string;
  contrato_id: string | null;
  forma_pagamento: string | null;
  asaas_payment_id: string | null;
  tipo: "receber" | "pagar";
  contratos?: { id: string; cliente_nome: string } | null;
}

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtData(s: string | null) {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

type FiltroStatus = "todos" | "pendente" | "atrasado" | "pago";
type FiltroTipo = "todos" | "receber" | "pagar";

export function BoletoConciliacao() {
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todos");
  const [busca, setBusca] = useState("");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [showEditVenc, setShowEditVenc] = useState<Boleto | null>(null);
  const [novoVencimento, setNovoVencimento] = useState("");
  const [showBaixaLote, setShowBaixaLote] = useState(false);
  const [dataBaixa, setDataBaixa] = useState(new Date().toISOString().slice(0, 10));
  const { roles } = useAuth();
  const podeGerenciar = canPerform(roles, "financeiro.manage");

  const hojeStr = new Date().toISOString().slice(0, 10);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const [receber, pagar] = await Promise.all([
      supabase
        .from("financeiro_contas_receber")
        .select("id, descricao, valor, vencimento, data_pagamento, status, contrato_id, forma_pagamento, asaas_payment_id, contratos(id, cliente_nome)")
        .or("forma_pagamento.eq.boleto,asaas_payment_id.not.is.null")
        .order("vencimento", { ascending: true }),
      supabase
        .from("financeiro_contas_pagar")
        .select("id, descricao, valor, vencimento, data_pagamento, status, contrato_id, forma_pagamento, contratos(id, cliente_nome)")
        .eq("forma_pagamento", "boleto")
        .order("vencimento", { ascending: true }),
    ]);

    const r = (receber.data ?? []).map((b: any) => ({ ...b, tipo: "receber" as const }));
    const p = (pagar.data ?? []).map((b: any) => ({ ...b, tipo: "pagar" as const, asaas_payment_id: null }));
    setBoletos([...r, ...p].sort((a, b) => a.vencimento.localeCompare(b.vencimento)));
    setLoading(false);
  }

  function getStatusReal(b: Boleto): string {
    if (b.status === "pago") return "pago";
    if (b.status === "cancelado") return "cancelado";
    if (b.vencimento < hojeStr) return "atrasado";
    return "pendente";
  }

  const filtrados = useMemo(() => {
    let list = boletos;
    if (filtroStatus !== "todos") list = list.filter(b => getStatusReal(b) === filtroStatus);
    if (filtroTipo !== "todos") list = list.filter(b => b.tipo === filtroTipo);
    if (busca.trim()) {
      const q = busca.toLowerCase();
      list = list.filter(b =>
        b.descricao.toLowerCase().includes(q) ||
        (b.contratos?.cliente_nome ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [boletos, filtroStatus, filtroTipo, busca]);

  // Totais
  const totalPendente = filtrados.filter(b => getStatusReal(b) === "pendente").reduce((s, b) => s + Number(b.valor), 0);
  const totalAtrasado = filtrados.filter(b => getStatusReal(b) === "atrasado").reduce((s, b) => s + Number(b.valor), 0);
  const totalPago = filtrados.filter(b => getStatusReal(b) === "pago").reduce((s, b) => s + Number(b.valor), 0);

  function toggleSelecionado(id: string) {
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleTodos() {
    if (selecionados.size === filtrados.filter(b => getStatusReal(b) !== "pago").length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(filtrados.filter(b => getStatusReal(b) !== "pago").map(b => b.id)));
    }
  }

  async function handleEditarVencimento() {
    if (!showEditVenc || !novoVencimento) return;
    const table = showEditVenc.tipo === "receber" ? "financeiro_contas_receber" : "financeiro_contas_pagar";
    const { error } = await supabase.from(table).update({ vencimento: novoVencimento }).eq("id", showEditVenc.id);
    if (error) toast.error(error.message);
    else { toast.success("Vencimento atualizado"); setShowEditVenc(null); carregar(); }
  }

  async function handleBaixaIndividual(b: Boleto) {
    const data = window.prompt("Data do pagamento (AAAA-MM-DD):", hojeStr);
    if (!data) return;
    const table = b.tipo === "receber" ? "financeiro_contas_receber" : "financeiro_contas_pagar";
    const { error } = await supabase.from(table).update({ status: "pago", data_pagamento: data }).eq("id", b.id);
    if (error) toast.error(error.message);
    else { toast.success("Baixa registrada"); carregar(); }
  }

  async function handleBaixaEmLote() {
    if (selecionados.size === 0) { toast.error("Selecione ao menos um boleto"); return; }

    const boletosParaBaixa = boletos.filter(b => selecionados.has(b.id));
    const receberIds = boletosParaBaixa.filter(b => b.tipo === "receber").map(b => b.id);
    const pagarIds = boletosParaBaixa.filter(b => b.tipo === "pagar").map(b => b.id);

    const promises = [];
    if (receberIds.length > 0) {
      promises.push(
        supabase.from("financeiro_contas_receber")
          .update({ status: "pago", data_pagamento: dataBaixa })
          .in("id", receberIds)
      );
    }
    if (pagarIds.length > 0) {
      promises.push(
        supabase.from("financeiro_contas_pagar")
          .update({ status: "pago", data_pagamento: dataBaixa })
          .in("id", pagarIds)
      );
    }

    const results = await Promise.all(promises);
    const erros = results.filter(r => r.error);
    if (erros.length > 0) toast.error("Erro em algumas baixas");
    else toast.success(`${selecionados.size} boleto(s) baixados`);

    setSelecionados(new Set());
    setShowBaixaLote(false);
    carregar();
  }

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-none shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-100 p-2"><Clock className="h-4 w-4 text-amber-600" /></div>
              <div><p className="text-xs text-slate-500">Pendentes</p><p className="text-lg font-bold text-amber-600">{fmtBRL(totalPendente)}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-2"><AlertTriangle className="h-4 w-4 text-red-600" /></div>
              <div><p className="text-xs text-slate-500">Atrasados</p><p className="text-lg font-bold text-red-600">{fmtBRL(totalAtrasado)}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2"><CheckCircle2 className="h-4 w-4 text-green-600" /></div>
              <div><p className="text-xs text-slate-500">Pagos</p><p className="text-lg font-bold text-green-600">{fmtBRL(totalPago)}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 max-w-xs">
          <Input placeholder="Buscar por descrição ou cliente..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <Select value={filtroStatus} onValueChange={v => setFiltroStatus(v as FiltroStatus)}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroTipo} onValueChange={v => setFiltroTipo(v as FiltroTipo)}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="receber">A Receber</SelectItem>
            <SelectItem value="pagar">A Pagar</SelectItem>
          </SelectContent>
        </Select>
        {podeGerenciar && selecionados.size > 0 && (
          <Button onClick={() => setShowBaixaLote(true)} className="bg-green-600 hover:bg-green-700 text-white">
            <Check className="h-4 w-4 mr-1" /> Baixa em Lote ({selecionados.size})
          </Button>
        )}
      </div>

      {/* Tabela */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <p className="py-8 text-center text-slate-400">Carregando...</p>
          ) : filtrados.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">Nenhum boleto encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F8FAFC] text-[#64748B]">
                  <tr>
                    {podeGerenciar && (
                      <th className="px-3 py-2.5 w-8">
                        <Checkbox
                          checked={selecionados.size > 0 && selecionados.size === filtrados.filter(b => getStatusReal(b) !== "pago").length}
                          onCheckedChange={toggleTodos}
                        />
                      </th>
                    )}
                    <th className="px-3 py-2.5 text-left font-medium">Descrição</th>
                    <th className="px-3 py-2.5 text-left font-medium">Tipo</th>
                    <th className="px-3 py-2.5 text-right font-medium">Valor</th>
                    <th className="px-3 py-2.5 text-left font-medium">Vencimento</th>
                    <th className="px-3 py-2.5 text-left font-medium">Pagamento</th>
                    <th className="px-3 py-2.5 text-left font-medium">Status</th>
                    {podeGerenciar && <th className="px-3 py-2.5 text-right font-medium">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8ECF2]">
                  {filtrados.map(b => {
                    const statusReal = getStatusReal(b);
                    const statusStyle = statusReal === "pago"
                      ? { bg: "#D1FAE5", fg: "#059669", label: "Pago" }
                      : statusReal === "atrasado"
                      ? { bg: "#FEE2E2", fg: "#DC2626", label: "Atrasado" }
                      : { bg: "#FEF3C7", fg: "#D97706", label: "Pendente" };

                    return (
                      <tr key={`${b.tipo}-${b.id}`} className="hover:bg-slate-50/50">
                        {podeGerenciar && (
                          <td className="px-3 py-3">
                            {statusReal !== "pago" && (
                              <Checkbox
                                checked={selecionados.has(b.id)}
                                onCheckedChange={() => toggleSelecionado(b.id)}
                              />
                            )}
                          </td>
                        )}
                        <td className="px-3 py-3">
                          <p className="font-medium text-xs">{b.descricao}</p>
                          {b.contratos && <p className="text-[10px] text-slate-500">{b.contratos.cliente_nome}</p>}
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant="outline" className="text-[10px]" style={{ color: b.tipo === "receber" ? "#10B981" : "#EF4444" }}>
                            {b.tipo === "receber" ? "Receber" : "Pagar"}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-xs" style={{ color: b.tipo === "receber" ? "#10B981" : "#EF4444" }}>
                          {fmtBRL(Number(b.valor))}
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-500">{fmtData(b.vencimento)}</td>
                        <td className="px-3 py-3 text-xs text-slate-500">{fmtData(b.data_pagamento)}</td>
                        <td className="px-3 py-3">
                          <Badge className="text-[10px]" style={{ background: statusStyle.bg, color: statusStyle.fg }}>{statusStyle.label}</Badge>
                        </td>
                        {podeGerenciar && (
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-end gap-1">
                              {statusReal !== "pago" && (
                                <>
                                  <Button size="icon" variant="ghost" className="h-6 w-6" title="Editar vencimento" onClick={() => { setShowEditVenc(b); setNovoVencimento(b.vencimento); }}>
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-green-600" title="Dar baixa" onClick={() => handleBaixaIndividual(b)}>
                                    <Check className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Editar Vencimento */}
      <Dialog open={!!showEditVenc} onOpenChange={v => !v && setShowEditVenc(null)}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader><DialogTitle>Editar Vencimento</DialogTitle></DialogHeader>
          {showEditVenc && (
            <div className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="font-medium text-sm">{showEditVenc.descricao}</p>
                <p className="text-xs text-slate-500">Valor: {fmtBRL(Number(showEditVenc.valor))}</p>
                <p className="text-xs text-slate-500">Vencimento atual: {fmtData(showEditVenc.vencimento)}</p>
              </div>
              <div className="space-y-1.5">
                <Label>Novo vencimento</Label>
                <Input type="date" value={novoVencimento} onChange={e => setNovoVencimento(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditVenc(null)}>Cancelar</Button>
            <Button className="bg-[#1E6FBF] hover:bg-[#1E6FBF]/90 text-white" onClick={handleEditarVencimento}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Baixa em Lote */}
      <Dialog open={showBaixaLote} onOpenChange={setShowBaixaLote}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Baixa em Lote</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center">
              <p className="text-sm text-green-800">Marcar <strong>{selecionados.size}</strong> boleto(s) como pago(s)</p>
              <p className="text-2xl font-bold text-green-700 mt-1">
                {fmtBRL(boletos.filter(b => selecionados.has(b.id)).reduce((s, b) => s + Number(b.valor), 0))}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Data do pagamento</Label>
              <Input type="date" value={dataBaixa} onChange={e => setDataBaixa(e.target.value)} />
              <p className="text-[10px] text-slate-400">Pode ser retroativa (ex: paguei ontem)</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBaixaLote(false)}>Cancelar</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleBaixaEmLote}>Confirmar Baixa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}