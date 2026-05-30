import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Landmark, ArrowRight, Factory, Store, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Financiamento {
  id: string;
  contrato_id: string;
  financeira_nome: string;
  valor_total_financiado: number;
  perc_direto_fabrica: number;
  valor_direto_fabrica: number;
  perc_entrada_loja: number;
  valor_entrada_loja: number;
  valor_intera: number;
  intera_paga: boolean;
  intera_data_pagamento: string | null;
  fornecedor_nome: string | null;
  valor_compra_material: number;
  taxa_financeira: number;
  valor_taxa: number;
  status: string;
  data_aprovacao: string | null;
  data_liberacao: string | null;
  numero_contrato_financeira: string | null;
  observacoes: string | null;
  created_at: string;
  contrato?: { id: string; cliente_nome: string; valor_venda: number } | null;
}

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtData(s: string | null) {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

const STATUS_MAP: Record<string, { bg: string; fg: string; label: string }> = {
  pendente: { bg: "#FEF3C7", fg: "#D97706", label: "Pendente" },
  aprovado: { bg: "#DBEAFE", fg: "#2563EB", label: "Aprovado" },
  liberado: { bg: "#D1FAE5", fg: "#059669", label: "Liberado" },
  pago_parcial: { bg: "#FEF3C7", fg: "#D97706", label: "Pago Parcial" },
  pago_total: { bg: "#D1FAE5", fg: "#059669", label: "Pago Total" },
  cancelado: { bg: "#F1F5F9", fg: "#64748B", label: "Cancelado" },
};

const FINANCEIRAS = ["BV Financeira", "Losango", "Cetelem", "Santander", "Bradesco", "Itaú", "Caixa", "Outro"];

export function FinanciamentoContrato() {
  const [items, setItems] = useState<Financiamento[]>([]);
  const [contratos, setContratos] = useState<{ id: string; cliente_nome: string; valor_venda: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetalhe, setShowDetalhe] = useState<Financiamento | null>(null);
  const { user, perfil } = useAuth();

  const [form, setForm] = useState({
    contrato_id: "",
    financeira_nome: "",
    valor_total_financiado: "",
    perc_direto_fabrica: "40",
    perc_entrada_loja: "40",
    valor_intera: "",
    fornecedor_nome: "",
    valor_compra_material: "",
    taxa_financeira: "",
    numero_contrato_financeira: "",
    observacoes: "",
  });

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const [f, c] = await Promise.all([
      supabase.from("financiamentos")
        .select("*, contrato:contratos(id, cliente_nome, valor_venda)")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("contratos")
        .select("id, cliente_nome, valor_venda")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    if (f.error) toast.error(f.error.message); else setItems(f.data as any ?? []);
    if (c.error) toast.error(c.error.message); else setContratos(c.data ?? []);
    setLoading(false);
  }

  // Calcula valores automaticamente
  const valorFinanciado = Number(form.valor_total_financiado.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
  const percFabrica = Number(form.perc_direto_fabrica) || 0;
  const percLoja = Number(form.perc_entrada_loja) || 0;
  const valorFabrica = valorFinanciado * (percFabrica / 100);
  const valorLoja = valorFinanciado * (percLoja / 100);
  const valorIntera = Number(form.valor_intera.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
  const taxaPerc = Number(form.taxa_financeira) || 0;
  const valorTaxa = valorFinanciado * (taxaPerc / 100);
  const valorCompraMaterial = Number(form.valor_compra_material.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;

  async function handleCriar() {
    if (!form.contrato_id || !form.financeira_nome || !form.valor_total_financiado) {
      toast.error("Informe contrato, financeira e valor");
      return;
    }
    const { error } = await supabase.from("financiamentos").insert({
      loja_id: perfil?.loja_id,
      contrato_id: form.contrato_id,
      financeira_nome: form.financeira_nome,
      valor_total_financiado: valorFinanciado,
      perc_direto_fabrica: percFabrica,
      valor_direto_fabrica: valorFabrica,
      perc_entrada_loja: percLoja,
      valor_entrada_loja: valorLoja,
      valor_intera: valorIntera,
      fornecedor_nome: form.fornecedor_nome || null,
      valor_compra_material: valorCompraMaterial,
      taxa_financeira: taxaPerc,
      valor_taxa: valorTaxa,
      numero_contrato_financeira: form.numero_contrato_financeira || null,
      observacoes: form.observacoes || null,
      status: "pendente",
      created_by: user?.id,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Financiamento vinculado ao contrato");
      setShowForm(false);
      setForm({ contrato_id: "", financeira_nome: "", valor_total_financiado: "", perc_direto_fabrica: "40", perc_entrada_loja: "40", valor_intera: "", fornecedor_nome: "", valor_compra_material: "", taxa_financeira: "", numero_contrato_financeira: "", observacoes: "" });
      carregar();
    }
  }

  async function handleMarcarIntera(f: Financiamento) {
    const { error } = await supabase.from("financiamentos").update({
      intera_paga: true,
      intera_data_pagamento: new Date().toISOString().slice(0, 10),
    }).eq("id", f.id);
    if (error) toast.error(error.message);
    else { toast.success("Intera marcada como paga"); carregar(); setShowDetalhe(null); }
  }

  async function handleAtualizarStatus(f: Financiamento, novoStatus: string) {
    const updates: any = { status: novoStatus };
    if (novoStatus === "aprovado") updates.data_aprovacao = new Date().toISOString().slice(0, 10);
    if (novoStatus === "liberado") updates.data_liberacao = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("financiamentos").update(updates).eq("id", f.id);
    if (error) toast.error(error.message);
    else { toast.success(`Status atualizado para ${STATUS_MAP[novoStatus]?.label}`); carregar(); setShowDetalhe(null); }
  }

  // Totais
  const totalFinanciado = items.reduce((s, i) => s + Number(i.valor_total_financiado), 0);
  const totalFabrica = items.reduce((s, i) => s + Number(i.valor_direto_fabrica), 0);
  const totalLoja = items.reduce((s, i) => s + Number(i.valor_entrada_loja), 0);
  const totalIntera = items.filter(i => !i.intera_paga && Number(i.valor_intera) > 0).reduce((s, i) => s + Number(i.valor_intera), 0);

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="border-none shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2"><Landmark className="h-4 w-4 text-blue-600" /></div>
              <div><p className="text-xs text-slate-500">Total Financiado</p><p className="text-lg font-bold">{fmtBRL(totalFinanciado)}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-100 p-2"><Factory className="h-4 w-4 text-purple-600" /></div>
              <div><p className="text-xs text-slate-500">Direto p/ Fábrica</p><p className="text-lg font-bold text-purple-600">{fmtBRL(totalFabrica)}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2"><Store className="h-4 w-4 text-green-600" /></div>
              <div><p className="text-xs text-slate-500">Entrada na Loja</p><p className="text-lg font-bold text-green-600">{fmtBRL(totalLoja)}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-100 p-2"><AlertCircle className="h-4 w-4 text-amber-600" /></div>
              <div><p className="text-xs text-slate-500">Interas Pendentes</p><p className="text-lg font-bold text-amber-600">{fmtBRL(totalIntera)}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Financiamentos Vinculados</h3>
        <Button onClick={() => setShowForm(true)} className="bg-[#1E6FBF] hover:bg-[#1E6FBF]/90 text-white">
          <Plus className="h-4 w-4 mr-1" /> Novo Financiamento
        </Button>
      </div>

      {/* Lista */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <p className="py-8 text-center text-slate-400">Carregando...</p>
          ) : items.length === 0 ? (
            <div className="py-12 text-center">
              <Landmark className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">Nenhum financiamento registrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F8FAFC] text-[#64748B]">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-medium">Cliente / Contrato</th>
                    <th className="px-3 py-2.5 text-left font-medium">Financeira</th>
                    <th className="px-3 py-2.5 text-right font-medium">Valor</th>
                    <th className="px-3 py-2.5 text-center font-medium">Split</th>
                    <th className="px-3 py-2.5 text-right font-medium">Intera</th>
                    <th className="px-3 py-2.5 text-left font-medium">Status</th>
                    <th className="px-3 py-2.5 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8ECF2]">
                  {items.map(f => {
                    const st = STATUS_MAP[f.status] || STATUS_MAP.pendente;
                    return (
                      <tr key={f.id} className="hover:bg-slate-50/50">
                        <td className="px-3 py-3">
                          <p className="font-medium">{f.contrato?.cliente_nome || "—"}</p>
                          <p className="text-xs text-slate-500">{f.fornecedor_nome || "Sem fábrica"}</p>
                        </td>
                        <td className="px-3 py-3 text-xs">{f.financeira_nome}</td>
                        <td className="px-3 py-3 text-right font-bold">{fmtBRL(Number(f.valor_total_financiado))}</td>
                        <td className="px-3 py-3 text-center text-xs">
                          <span className="text-purple-600">{f.perc_direto_fabrica}% fáb</span>
                          {" / "}
                          <span className="text-green-600">{f.perc_entrada_loja}% loja</span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          {Number(f.valor_intera) > 0 ? (
                            <span className={f.intera_paga ? "text-green-600 text-xs" : "text-amber-600 font-semibold text-xs"}>
                              {f.intera_paga ? "✓ " : ""}{fmtBRL(Number(f.valor_intera))}
                            </span>
                          ) : <span className="text-xs text-slate-400">—</span>}
                        </td>
                        <td className="px-3 py-3">
                          <Badge style={{ background: st.bg, color: st.fg }} className="text-[10px]">{st.label}</Badge>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowDetalhe(f)}>Detalhes</Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Novo Financiamento */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader><DialogTitle>Vincular Financiamento ao Contrato</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Contrato *</Label>
                <Select value={form.contrato_id} onValueChange={v => setForm(f => ({ ...f, contrato_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{contratos.map(c => <SelectItem key={c.id} value={c.id}>{c.cliente_nome} ({fmtBRL(Number(c.valor_venda))})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Financeira *</Label>
                <Select value={form.financeira_nome} onValueChange={v => setForm(f => ({ ...f, financeira_nome: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{FINANCEIRAS.map(fn => <SelectItem key={fn} value={fn}>{fn}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Valor Financiado *</Label>
                <Input inputMode="decimal" placeholder="R$ 0,00" value={form.valor_total_financiado} onChange={e => setForm(f => ({ ...f, valor_total_financiado: e.target.value.replace(/[^\d.,]/g, "") }))} />
              </div>
              <div className="space-y-1.5">
                <Label>% Direto Fábrica</Label>
                <Input type="number" min={0} max={100} value={form.perc_direto_fabrica} onChange={e => setForm(f => ({ ...f, perc_direto_fabrica: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>% Entrada Loja</Label>
                <Input type="number" min={0} max={100} value={form.perc_entrada_loja} onChange={e => setForm(f => ({ ...f, perc_entrada_loja: e.target.value }))} />
              </div>
            </div>

            {/* Preview do split */}
            {valorFinanciado > 0 && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-xs font-semibold text-blue-800 mb-2">Simulação do Split:</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center">
                    <p className="text-slate-500">Fábrica recebe</p>
                    <p className="font-bold text-purple-700">{fmtBRL(valorFabrica)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-500">Loja recebe</p>
                    <p className="font-bold text-green-700">{fmtBRL(valorLoja)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-500">Restante (taxa/retenção)</p>
                    <p className="font-bold text-red-600">{fmtBRL(valorFinanciado - valorFabrica - valorLoja)}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor Intera (complemento)</Label>
                <Input inputMode="decimal" placeholder="R$ 0,00" value={form.valor_intera} onChange={e => setForm(f => ({ ...f, valor_intera: e.target.value.replace(/[^\d.,]/g, "") }))} />
                <p className="text-[10px] text-slate-400">Valor extra que a loja paga à fábrica</p>
              </div>
              <div className="space-y-1.5">
                <Label>Valor Compra Material</Label>
                <Input inputMode="decimal" placeholder="R$ 0,00" value={form.valor_compra_material} onChange={e => setForm(f => ({ ...f, valor_compra_material: e.target.value.replace(/[^\d.,]/g, "") }))} />
                <p className="text-[10px] text-slate-400">Total de material a comprar</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fábrica / Fornecedor</Label>
                <Input value={form.fornecedor_nome} onChange={e => setForm(f => ({ ...f, fornecedor_nome: e.target.value }))} placeholder="Nome da fábrica" />
              </div>
              <div className="space-y-1.5">
                <Label>Nº Contrato Financeira</Label>
                <Input value={form.numero_contrato_financeira} onChange={e => setForm(f => ({ ...f, numero_contrato_financeira: e.target.value }))} placeholder="Opcional" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Input value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Notas adicionais..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button className="bg-[#1E6FBF] hover:bg-[#1E6FBF]/90 text-white" onClick={handleCriar}>Vincular Financiamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Detalhe */}
      <Dialog open={!!showDetalhe} onOpenChange={v => !v && setShowDetalhe(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>Detalhe do Financiamento</DialogTitle></DialogHeader>
          {showDetalhe && (
            <div className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{showDetalhe.contrato?.cliente_nome}</p>
                    <p className="text-xs text-slate-500">{showDetalhe.financeira_nome} • {showDetalhe.numero_contrato_financeira || "Sem nº"}</p>
                  </div>
                  <Badge style={{ background: STATUS_MAP[showDetalhe.status]?.bg, color: STATUS_MAP[showDetalhe.status]?.fg }}>
                    {STATUS_MAP[showDetalhe.status]?.label}
                  </Badge>
                </div>
                <p className="text-2xl font-bold mt-2">{fmtBRL(Number(showDetalhe.valor_total_financiado))}</p>
              </div>

              {/* Split visual */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-purple-50 p-3">
                  <Factory className="mx-auto h-4 w-4 text-purple-600 mb-1" />
                  <p className="text-xs text-slate-500">Fábrica ({showDetalhe.perc_direto_fabrica}%)</p>
                  <p className="font-bold text-purple-700">{fmtBRL(Number(showDetalhe.valor_direto_fabrica))}</p>
                </div>
                <div className="rounded-lg bg-green-50 p-3">
                  <Store className="mx-auto h-4 w-4 text-green-600 mb-1" />
                  <p className="text-xs text-slate-500">Loja ({showDetalhe.perc_entrada_loja}%)</p>
                  <p className="font-bold text-green-700">{fmtBRL(Number(showDetalhe.valor_entrada_loja))}</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3">
                  <AlertCircle className="mx-auto h-4 w-4 text-amber-600 mb-1" />
                  <p className="text-xs text-slate-500">Intera</p>
                  <p className="font-bold text-amber-700">{fmtBRL(Number(showDetalhe.valor_intera))}</p>
                  {showDetalhe.intera_paga && <p className="text-[10px] text-green-600 mt-0.5">✓ Paga</p>}
                </div>
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Fábrica/Fornecedor</span><span>{showDetalhe.fornecedor_nome || "—"}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Material a comprar</span><span className="font-semibold">{fmtBRL(Number(showDetalhe.valor_compra_material))}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Taxa financeira</span><span>{showDetalhe.taxa_financeira}% ({fmtBRL(Number(showDetalhe.valor_taxa))})</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Aprovação</span><span>{fmtData(showDetalhe.data_aprovacao)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Liberação</span><span>{fmtData(showDetalhe.data_liberacao)}</span></div>
              </div>

              {showDetalhe.observacoes && (
                <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{showDetalhe.observacoes}</div>
              )}

              {/* Ações */}
              <div className="flex flex-wrap gap-2">
                {showDetalhe.status === "pendente" && (
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleAtualizarStatus(showDetalhe, "aprovado")}>Aprovar</Button>
                )}
                {showDetalhe.status === "aprovado" && (
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleAtualizarStatus(showDetalhe, "liberado")}>Marcar Liberado</Button>
                )}
                {showDetalhe.status === "liberado" && (
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleAtualizarStatus(showDetalhe, "pago_total")}>Marcar Pago Total</Button>
                )}
                {Number(showDetalhe.valor_intera) > 0 && !showDetalhe.intera_paga && (
                  <Button size="sm" variant="outline" className="border-amber-300 text-amber-700" onClick={() => handleMarcarIntera(showDetalhe)}>Pagar Intera ({fmtBRL(Number(showDetalhe.valor_intera))})</Button>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetalhe(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}