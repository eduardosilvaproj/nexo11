import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Percent, Trash2, Edit2, Calculator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { canPerform } from "@/lib/permissions";

interface Taxa {
  id: string;
  tipo_taxa: string;
  nome: string;
  descricao: string | null;
  tipo_aplicacao: string;
  valor_fixo: number;
  percentual: number;
  valor_minimo: number;
  valor_maximo: number | null;
  prazo_vencimento_dias: number;
  ativo: boolean;
  observacoes: string | null;
}

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const TIPOS_TAXA = [
  { value: "tarifa_bancaria", label: "Tarifa Bancária" },
  { value: "taxa_maquineta", label: "Taxa Maquineta" },
  { value: "taxa_pix", label: "Taxa PIX" },
  { value: "taxa_boleto", label: "Taxa Boleto" },
  { value: "iof", label: "IOF" },
  { value: "juros_capital", label: "Juros Capital" },
  { value: "multa", label: "Multa" },
  { value: "outro", label: "Outro" },
];

const TIPOS_APLICACAO = [
  { value: "fixo", label: "Valor Fixo" },
  { value: "percentual", label: "Percentual" },
  { value: "mixto", label: "Fixo + Percentual" },
];

export function TaxasFinanceirasCard() {
  const [taxas, setTaxas] = useState<Taxa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Taxa | null>(null);
  const [simuladorValor, setSimuladorValor] = useState("");
  const { roles } = useAuth();
  const podeGerenciar = canPerform(roles, "financeiro.manage");

  const [form, setForm] = useState({
    tipo_taxa: "taxa_maquineta",
    nome: "",
    descricao: "",
    tipo_aplicacao: "percentual",
    valor_fixo: "",
    percentual: "",
    valor_minimo: "",
    valor_maximo: "",
    prazo_vencimento_dias: "0",
    observacoes: "",
  });

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const { data, error } = await supabase
      .from("taxas_financeiras")
      .select("*")
      .order("tipo_taxa", { ascending: true });
    if (error) toast.error(error.message);
    else setTaxas(data ?? []);
    setLoading(false);
  }

  function abrirEditar(t: Taxa) {
    setEditando(t);
    setForm({
      tipo_taxa: t.tipo_taxa,
      nome: t.nome,
      descricao: t.descricao || "",
      tipo_aplicacao: t.tipo_aplicacao,
      valor_fixo: String(t.valor_fixo || ""),
      percentual: String(t.percentual || ""),
      valor_minimo: String(t.valor_minimo || ""),
      valor_maximo: t.valor_maximo ? String(t.valor_maximo) : "",
      prazo_vencimento_dias: String(t.prazo_vencimento_dias || 0),
      observacoes: t.observacoes || "",
    });
    setShowForm(true);
  }

  async function handleSalvar() {
    if (!form.nome || !form.tipo_taxa) { toast.error("Informe nome e tipo"); return; }
    const payload = {
      tipo_taxa: form.tipo_taxa,
      nome: form.nome,
      descricao: form.descricao || null,
      tipo_aplicacao: form.tipo_aplicacao,
      valor_fixo: Number(form.valor_fixo) || 0,
      percentual: Number(form.percentual) || 0,
      valor_minimo: Number(form.valor_minimo) || 0,
      valor_maximo: form.valor_maximo ? Number(form.valor_maximo) : null,
      prazo_vencimento_dias: Number(form.prazo_vencimento_dias) || 0,
      observacoes: form.observacoes || null,
      ativo: true,
    };

    if (editando) {
      const { error } = await supabase.from("taxas_financeiras").update(payload).eq("id", editando.id);
      if (error) toast.error(error.message);
      else { toast.success("Taxa atualizada"); setShowForm(false); setEditando(null); carregar(); }
    } else {
      const { error } = await supabase.from("taxas_financeiras").insert(payload);
      if (error) toast.error(error.message);
      else { toast.success("Taxa criada"); setShowForm(false); carregar(); }
    }
    setForm({ tipo_taxa: "taxa_maquineta", nome: "", descricao: "", tipo_aplicacao: "percentual", valor_fixo: "", percentual: "", valor_minimo: "", valor_maximo: "", prazo_vencimento_dias: "0", observacoes: "" });
  }

  async function handleExcluir(id: string) {
    if (!window.confirm("Excluir esta taxa?")) return;
    const { error } = await supabase.from("taxas_financeiras").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Taxa excluída"); carregar(); }
  }

  // Simulador: calcula valor líquido após taxas
  function calcularLiquido(valorBruto: number): { liquido: number; totalTaxas: number; detalhes: { nome: string; valor: number }[] } {
    let totalTaxas = 0;
    const detalhes: { nome: string; valor: number }[] = [];
    for (const t of taxas.filter(tx => tx.ativo)) {
      let taxaValor = 0;
      if (t.tipo_aplicacao === "fixo") taxaValor = t.valor_fixo;
      else if (t.tipo_aplicacao === "percentual") taxaValor = valorBruto * (t.percentual / 100);
      else taxaValor = t.valor_fixo + valorBruto * (t.percentual / 100);
      if (t.valor_minimo && taxaValor < t.valor_minimo) taxaValor = t.valor_minimo;
      if (t.valor_maximo && taxaValor > t.valor_maximo) taxaValor = t.valor_maximo;
      totalTaxas += taxaValor;
      detalhes.push({ nome: t.nome, valor: taxaValor });
    }
    return { liquido: valorBruto - totalTaxas, totalTaxas, detalhes };
  }

  const simValor = Number(simuladorValor.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
  const simResult = simValor > 0 ? calcularLiquido(simValor) : null;

  return (
    <div className="space-y-6">
      {/* Simulador */}
      <Card className="border-none shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Calculator className="h-4 w-4 text-blue-600" /> Simulador de Recebimento Líquido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="space-y-1.5 flex-1 max-w-xs">
              <Label className="text-xs text-slate-600">Valor bruto da venda</Label>
              <Input
                inputMode="decimal"
                placeholder="R$ 10.000,00"
                value={simuladorValor}
                onChange={e => setSimuladorValor(e.target.value)}
                className="bg-white"
              />
            </div>
            {simResult && (
              <div className="flex gap-6">
                <div>
                  <p className="text-xs text-slate-500">Total Taxas</p>
                  <p className="text-lg font-bold text-red-600">- {fmtBRL(simResult.totalTaxas)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Valor Líquido</p>
                  <p className="text-lg font-bold text-green-600">{fmtBRL(simResult.liquido)}</p>
                </div>
              </div>
            )}
          </div>
          {simResult && simResult.detalhes.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {simResult.detalhes.map((d, i) => (
                <Badge key={i} variant="outline" className="text-[10px]">
                  {d.nome}: -{fmtBRL(d.valor)}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Tabela de Taxas e Tarifas</h3>
        {podeGerenciar && (
          <Button onClick={() => { setEditando(null); setShowForm(true); }} className="bg-[#1E6FBF] hover:bg-[#1E6FBF]/90 text-white">
            <Plus className="h-4 w-4 mr-1" /> Nova Taxa
          </Button>
        )}
      </div>

      {/* Tabela */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <p className="py-8 text-center text-slate-400">Carregando...</p>
          ) : taxas.length === 0 ? (
            <div className="py-12 text-center">
              <Percent className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">Nenhuma taxa cadastrada</p>
              <p className="text-xs text-slate-400 mt-1">Adicione taxas de maquineta, boleto, PIX, etc.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F8FAFC] text-[#64748B]">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-medium">Nome</th>
                    <th className="px-3 py-2.5 text-left font-medium">Tipo</th>
                    <th className="px-3 py-2.5 text-left font-medium">Aplicação</th>
                    <th className="px-3 py-2.5 text-right font-medium">Valor Fixo</th>
                    <th className="px-3 py-2.5 text-right font-medium">%</th>
                    <th className="px-3 py-2.5 text-left font-medium">Status</th>
                    {podeGerenciar && <th className="px-3 py-2.5 text-right font-medium">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8ECF2]">
                  {taxas.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-3">
                        <p className="font-medium">{t.nome}</p>
                        {t.descricao && <p className="text-xs text-slate-500">{t.descricao}</p>}
                      </td>
                      <td className="px-3 py-3"><Badge variant="outline" className="text-[10px]">{TIPOS_TAXA.find(x => x.value === t.tipo_taxa)?.label || t.tipo_taxa}</Badge></td>
                      <td className="px-3 py-3 text-xs">{TIPOS_APLICACAO.find(x => x.value === t.tipo_aplicacao)?.label || t.tipo_aplicacao}</td>
                      <td className="px-3 py-3 text-right text-xs">{t.valor_fixo > 0 ? fmtBRL(t.valor_fixo) : "—"}</td>
                      <td className="px-3 py-3 text-right text-xs font-semibold">{t.percentual > 0 ? `${t.percentual}%` : "—"}</td>
                      <td className="px-3 py-3"><Badge style={{ background: t.ativo ? "#D1FAE5" : "#F1F5F9", color: t.ativo ? "#059669" : "#64748B" }}>{t.ativo ? "Ativo" : "Inativo"}</Badge></td>
                      {podeGerenciar && (
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => abrirEditar(t)}><Edit2 className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => handleExcluir(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Form */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditando(null); } }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>{editando ? "Editar Taxa" : "Nova Taxa Financeira"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select value={form.tipo_taxa} onValueChange={v => setForm(f => ({ ...f, tipo_taxa: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS_TAXA.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Visa Crédito 2x-6x" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Detalhes opcionais" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Aplicação</Label>
                <Select value={form.tipo_aplicacao} onValueChange={v => setForm(f => ({ ...f, tipo_aplicacao: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS_APLICACAO.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor Fixo (R$)</Label>
                <Input inputMode="decimal" value={form.valor_fixo} onChange={e => setForm(f => ({ ...f, valor_fixo: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Percentual (%)</Label>
                <Input inputMode="decimal" value={form.percentual} onChange={e => setForm(f => ({ ...f, percentual: e.target.value }))} placeholder="2.5" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Mínimo (R$)</Label>
                <Input inputMode="decimal" value={form.valor_minimo} onChange={e => setForm(f => ({ ...f, valor_minimo: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Máximo (R$)</Label>
                <Input inputMode="decimal" value={form.valor_maximo} onChange={e => setForm(f => ({ ...f, valor_maximo: e.target.value }))} placeholder="Sem limite" />
              </div>
              <div className="space-y-1.5">
                <Label>Prazo (dias)</Label>
                <Input type="number" value={form.prazo_vencimento_dias} onChange={e => setForm(f => ({ ...f, prazo_vencimento_dias: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditando(null); }}>Cancelar</Button>
            <Button className="bg-[#1E6FBF] hover:bg-[#1E6FBF]/90 text-white" onClick={handleSalvar}>{editando ? "Salvar" : "Criar Taxa"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}