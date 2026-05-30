import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Plus, Trash2, Eye, Edit2, TrendingUp, TrendingDown, Calendar, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { canPerform } from "@/lib/permissions";

interface Cartao {
  id: string;
  nome_titular: string;
  numero_final: string;
  bandeira?: string;
  banco?: string;
  limite: number;
  limite_utilizado: number;
  data_vencimento_fatura: number;
  status: string;
  cor_tag: string;
  created_at: string;
}

interface Fatura {
  id: string;
  cartao_id: string;
  mes_referencia: string;
  valor_total: number;
  valor_aberto: number;
  valor_pago: number;
  data_vencimento: string | null;
  data_pagamento: string | null;
  status: string;
  cartao?: Cartao;
}

interface Compra {
  id: string;
  cartao_id: string;
  descricao: string;
  valor: number;
  data_compra: string;
  data_vencimento_parcela: string | null;
  numero_parcelas: number;
  parcela_atual: number;
  fornecedor_id?: string;
  fornecedor?: { nome?: string } | null;
  observacoes?: string;
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function fmtData(s: string | null) {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}
function fmtMes(s: string) {
  const [y, m] = s.split('-');
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${meses[parseInt(m) - 1]}/${y}`;
}

export function CartaoCreditoManager() {
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'cartoes' | 'compras' | 'faturas'>('cartoes');
  const [showCartaoForm, setShowCartaoForm] = useState(false);
  const [showCompraForm, setShowCompraForm] = useState(false);
  const [showFaturaDetail, setShowFaturaDetail] = useState<Fatura | null>(null);
  const { roles, perfil } = useAuth();
  const podeGerenciar = canPerform(roles, "financeiro.manage");

  const [formCartao, setFormCartao] = useState({
    nome_titular: '', numero_final: '', bandeira: '', banco: '', limite: '', dia_venc: '1',
  });
  const [formCompra, setFormCompra] = useState({
    cartao_id: '', descricao: '', valor: '', data_compra: new Date().toISOString().slice(0, 10),
    parcelas: '1', fornecedor_id: '', observacoes: '',
  });

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const [c, f, cp] = await Promise.all([
      supabase.from('cartoes_credito').select('*').order('created_at', { ascending: false }),
      supabase.from('faturas_cartao').select('*, cartao:cartoes_credito(*)').order('mes_referencia', { ascending: false }).limit(24),
      supabase.from('financeiro_contas_pagar').select('*, fornecedor:fornecedores(id, nome)').eq('cartao_id', '!null').order('data_compra', { ascending: false }).limit(100),
    ]);
    if (c.error) toast.error(c.error.message); else setCartoes(c.data ?? []);
    if (f.error) toast.error(f.error.message); else setFaturas(f.data as any ?? []);
    if (cp.error) toast.error(cp.error.message); else setCompras(cp.data as any ?? []);
    setLoading(false);
  }

  async function handleCriarCartao() {
    if (!formCartao.nome_titular || !formCartao.numero_final) { toast.error('Informe nome e últimos 4 dígitos'); return; }
    const { error } = await supabase.from('cartoes_credito').insert({
      nome_titular: formCartao.nome_titular,
      numero_final: formCartao.numero_final,
      bandeira: formCartao.bandeira || null,
      banco: formCartao.banco || null,
      limite: Number(formCartao.limite.replace(/[^\d.]/g, '')) || 0,
      data_vencimento_fatura: Number(formCartao.dia_venc) || 1,
      status: 'ativo',
      cor_tag: '#10B981',
    });
    if (error) toast.error(error.message);
    else { toast.success('Cartão adicionado'); setShowCartaoForm(false); setFormCartao({ nome_titular: '', numero_final: '', bandeira: '', banco: '', limite: '', dia_venc: '1' }); carregar(); }
  }

  async function handleCriarCompra() {
    if (!formCompra.cartao_id || !formCompra.descricao || !formCompra.valor) { toast.error('Informe cartão, descrição e valor'); return; }
    const valor = Number(formCompra.valor.replace(/[^\d.,]/g, '').replace(',', '.'));
    const parcelas = Number(formCompra.parcelas) || 1;
    const valorParcela = valor / parcelas;

    // Criar lançamentos de parcelas
    const entradas = [];
    const dataBase = new Date(formCompra.data_compra);
    for (let i = 1; i <= parcelas; i++) {
      const d = new Date(dataBase);
      d.setMonth(d.getMonth() + i);
      entradas.push({
        cartao_id: formCompra.cartao_id,
        descricao: `${formCompra.descricao} (${i}/${parcelas})`,
        valor: valorParcela,
        data_compra: formCompra.data_compra,
        data_vencimento_parcela: d.toISOString().slice(0, 10),
        numero_parcelas: parcelas,
        parcela_atual: i,
        fornecedor_id: formCompra.fornecedor_id || null,
        observacoes: formCompra.observacoes || null,
      });
    }

    const { error } = await supabase.from('financeiro_contas_pagar').insert(entradas);
    if (error) toast.error(error.message);
    else {
      toast.success(`${parcelas} parcela(s) adicionada(s)`);
      setShowCompraForm(false);
      setFormCompra({ cartao_id: '', descricao: '', valor: '', data_compra: new Date().toISOString().slice(0, 10), parcelas: '1', fornecedor_id: '', observacoes: '' });
      carregar();
    }
  }

  const totalUtilizado = cartoes.reduce((s, c) => s + Number(c.limite_utilizado), 0);
  const totalLimite = cartoes.reduce((s, c) => s + Number(c.limite), 0);
  const comprasMes = compras.filter(c => c.data_compra?.startsWith(new Date().toISOString().slice(0, 7)));
  const totalComprasMes = comprasMes.reduce((s, c) => s + Number(c.valor), 0);

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="border-none shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2"><CreditCard className="h-4 w-4 text-blue-600" /></div>
              <div><p className="text-xs text-slate-500">Total Limite</p><p className="text-lg font-bold">{fmtBRL(totalLimite)}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-2"><TrendingDown className="h-4 w-4 text-red-600" /></div>
              <div><p className="text-xs text-slate-500">Utilizado</p><p className="text-lg font-bold text-red-600">{fmtBRL(totalUtilizado)}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2"><TrendingUp className="h-4 w-4 text-green-600" /></div>
              <div><p className="text-xs text-slate-500">Disponível</p><p className="text-lg font-bold text-green-600">{fmtBRL(totalLimite - totalUtilizado)}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-100 p-2"><DollarSign className="h-4 w-4 text-amber-600" /></div>
              <div><p className="text-xs text-slate-500">Compras este mês</p><p className="text-lg font-bold">{fmtBRL(totalComprasMes)}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b" style={{ borderColor: '#E8ECF2' }}>
        <button onClick={() => setTab('cartoes')} className={`px-4 py-2 text-sm font-medium ${tab === 'cartoes' ? 'border-b-2 border-[#1E6FBF] text-[#1E6FBF]' : 'text-[#6B7A90]'}`}>Cartões ({cartoes.length})</button>
        <button onClick={() => setTab('compras')} className={`px-4 py-2 text-sm font-medium ${tab === 'compras' ? 'border-b-2 border-[#1E6FBF] text-[#1E6FBF]' : 'text-[#6B7A90]'}`}>Compras ({compras.length})</button>
        <button onClick={() => setTab('faturas')} className={`px-4 py-2 text-sm font-medium ${tab === 'faturas' ? 'border-b-2 border-[#1E6FBF] text-[#1E6FBF]' : 'text-[#6B7A90]'}`}>Faturas ({faturas.length})</button>
        <div className="flex-1" />
        {podeGerenciar && tab === 'cartoes' && <Button size="sm" onClick={() => setShowCartaoForm(true)} className="bg-[#1E6FBF] hover:bg-[#1E6FBF]/90 text-white"><Plus className="h-4 w-4 mr-1" /> Novo Cartão</Button>}
        {podeGerenciar && tab === 'compras' && <Button size="sm" onClick={() => setShowCompraForm(true)} className="bg-[#1E6FBF] hover:bg-[#1E6FBF]/90 text-white"><Plus className="h-4 w-4 mr-1" /> Nova Compra</Button>}
      </div>

      {/* Cartões */}
      {tab === 'cartoes' && (
        <div className="grid gap-4 lg:grid-cols-2">
          {cartoes.length === 0 ? (
            <div className="col-span-2 py-12 text-center">
              <CreditCard className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">Nenhum cartão cadastrado</p>
            </div>
          ) : cartoes.map(c => {
            const disp = Number(c.limite) - Number(c.limite_utilizado);
            const pct = Number(c.limite) > 0 ? (Number(c.limite_utilizado) / Number(c.limite)) * 100 : 0;
            return (
              <Card key={c.id} className="border-none shadow-sm">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="rounded-full p-1.5" style={{ background: c.cor_tag + '20' }}><CreditCard className="h-4 w-4" style={{ color: c.cor_tag }} /></div>
                      <div>
                        <p className="font-semibold text-sm">{c.nome_titular}</p>
                        <p className="text-xs text-slate-500">•••• {c.numero_final} {c.bandeira ? `• ${c.bandeira}` : ''}</p>
                      </div>
                    </div>
                    <Badge style={{ background: c.status === 'ativo' ? '#D1FAE5' : '#FEE2E2', color: c.status === 'ativo' ? '#059669' : '#DC2626' }}>{c.status}</Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs"><span className="text-slate-500">Utilizado</span><span className="font-semibold text-red-600">{fmtBRL(Number(c.limite_utilizado))}</span></div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5"><div className="h-1.5 rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: pct > 80 ? '#EF4444' : pct > 50 ? '#F59E0B' : '#10B981' }} /></div>
                    <div className="flex justify-between text-xs"><span className="text-slate-500">Disponível</span><span className="font-semibold text-green-600">{fmtBRL(disp)}</span></div>
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-slate-500">
                    <span>Limite: {fmtBRL(Number(c.limite))}</span>
                    <span>Venc. fatura: dia {c.data_vencimento_fatura}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Compras */}
      {tab === 'compras' && (
        <Card className="border-none shadow-sm">
          <CardContent className="p-0">
            {compras.length === 0 ? (
              <div className="py-12 text-center"><p className="text-sm text-slate-500">Nenhuma compra registrada</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#F8FAFC] text-[#64748B]">
                    <tr>
                      <th className="px-3 py-2.5 text-left">Descrição</th>
                      <th className="px-3 py-2.5 text-left">Cartão</th>
                      <th className="px-3 py-2.5 text-right">Valor</th>
                      <th className="px-3 py-2.5 text-left">Parcela</th>
                      <th className="px-3 py-2.5 text-left">Vencimento</th>
                      <th className="px-3 py-2.5 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8ECF2]">
                    {compras.map(c => {
                      const cartao = cartoes.find(ct => ct.id === c.cartao_id);
                      return (
                        <tr key={c.id} className="hover:bg-slate-50/50">
                          <td className="px-3 py-3"><p className="font-medium">{c.descricao}</p><p className="text-xs text-slate-500">{c.fornecedor?.nome || ''}</p></td>
                          <td className="px-3 py-3 text-xs">{cartao ? `${cartao.nome_titular} ••${cartao.numero_final}` : '—'}</td>
                          <td className="px-3 py-3 text-right font-bold text-red-600">{fmtBRL(Number(c.valor))}</td>
                          <td className="px-3 py-3 text-xs">{c.numero_parcelas > 1 ? `${c.parcela_atual}/${c.numero_parcelas}` : 'À vista'}</td>
                          <td className="px-3 py-3 text-xs text-slate-500">{fmtData(c.data_vencimento_parcela)}</td>
                          <td className="px-3 py-3">
                            <Badge className="text-[10px]" style={{ background: c.valor > 0 ? '#D1FAE5' : '#F1F5F9', color: c.valor > 0 ? '#059669' : '#64748B' }}>Ativo</Badge>
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
      )}

      {/* Faturas */}
      {tab === 'faturas' && (
        <div className="grid gap-4 lg:grid-cols-3">
          {faturas.length === 0 ? (
            <div className="col-span-3 py-12 text-center"><p className="text-sm text-slate-500">Nenhuma fatura encontrada</p></div>
          ) : faturas.map(f => {
            const statusCor = f.status === 'paga' ? '#D1FAE5' : f.status === 'fechada' ? '#FEE2E2' : '#FEF3C7';
            const statusTxt = f.status === 'paga' ? '#059669' : f.status === 'fechada' ? '#DC2626' : '#D97706';
            return (
              <Card key={f.id} className="border-none shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowFaturaDetail(f)}>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-sm">{f.cartao?.nome_titular || 'Cartão'}</p>
                      <p className="text-xs text-slate-500">{f.cartao ? `••${f.cartao.numero_final}` : ''}</p>
                    </div>
                    <Badge style={{ background: statusCor, color: statusTxt }}>{f.status}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mb-1">{fmtMes(f.mes_referencia)}</p>
                  <p className="text-2xl font-bold">{fmtBRL(Number(f.valor_total))}</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-xs"><span>Pago</span><span className="text-green-600 font-medium">{fmtBRL(Number(f.valor_pago))}</span></div>
                    <div className="flex justify-between text-xs"><span>Aberto</span><span className="text-red-600 font-medium">{fmtBRL(Number(f.valor_aberto))}</span></div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog Novo Cartão */}
      <Dialog open={showCartaoForm} onOpenChange={setShowCartaoForm}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>Novo Cartão de Crédito</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Nome do Titular *</Label><Input value={formCartao.nome_titular} onChange={e => setFormCartao(f => ({ ...f, nome_titular: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Últimos 4 dígitos *</Label><Input maxLength={4} value={formCartao.numero_final} onChange={e => setFormCartao(f => ({ ...f, numero_final: e.target.value }))} placeholder="1234" /></div>
              <div className="space-y-1.5"><Label>Bandeira</Label><Input value={formCartao.bandeira} onChange={e => setFormCartao(f => ({ ...f, bandeira: e.target.value }))} placeholder="Visa, Master..." /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Banco</Label><Input value={formCartao.banco} onChange={e => setFormCartao(f => ({ ...f, banco: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Limite</Label><Input inputMode="decimal" placeholder="R$ 0,00" value={formCartao.limite} onChange={e => setFormCartao(f => ({ ...f, limite: e.target.value.replace(/[^\d.,]/g, '') }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Dia vencimento fatura</Label><Input type="number" min={1} max={31} value={formCartao.dia_venc} onChange={e => setFormCartao(f => ({ ...f, dia_venc: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCartaoForm(false)}>Cancelar</Button>
            <Button className="bg-[#1E6FBF] hover:bg-[#1E6FBF]/90 text-white" onClick={handleCriarCartao}>Adicionar Cartão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Nova Compra */}
      <Dialog open={showCompraForm} onOpenChange={setShowCompraForm}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>Nova Compra no Cartão</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Cartão *</Label>
              <Select value={formCompra.cartao_id} onValueChange={v => setFormCompra(f => ({ ...f, cartao_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{cartoes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome_titular} ••{c.numero_final}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Descrição *</Label><Input value={formCompra.descricao} onChange={e => setFormCompra(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: MDF MDP para cozinha" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Valor *</Label><Input inputMode="decimal" placeholder="R$" value={formCompra.valor} onChange={e => setFormCompra(f => ({ ...f, valor: e.target.value.replace(/[^\d.,]/g, '') }))} /></div>
              <div className="space-y-1.5"><Label>Parcelas</Label><Input type="number" min={1} max={24} value={formCompra.parcelas} onChange={e => setFormCompra(f => ({ ...f, parcelas: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Data compra</Label><Input type="date" value={formCompra.data_compra} onChange={e => setFormCompra(f => ({ ...f, data_compra: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Observações</Label><Input value={formCompra.observacoes} onChange={e => setFormCompra(f => ({ ...f, observacoes: e.target.value }))} placeholder="Fornecedor, nota fiscal..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompraForm(false)}>Cancelar</Button>
            <Button className="bg-[#1E6FBF] hover:bg-[#1E6FBF]/90 text-white" onClick={handleCriarCompra}>Registrar Compra</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Detalhe Fatura */}
      <Dialog open={!!showFaturaDetail} onOpenChange={v => !v && setShowFaturaDetail(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>Fatura {showFaturaDetail ? fmtMes(showFaturaDetail.mes_referencia) : ''}</DialogTitle></DialogHeader>
          {showFaturaDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Total</p><p className="text-xl font-bold">{fmtBRL(Number(showFaturaDetail.valor_total))}</p></div>
                <div className="rounded-lg bg-red-50 p-3"><p className="text-xs text-slate-500">Aberto</p><p className="text-xl font-bold text-red-600">{fmtBRL(Number(showFaturaDetail.valor_aberto))}</p></div>
                <div className="rounded-lg bg-green-50 p-3"><p className="text-xs text-slate-500">Pago</p><p className="text-xl font-bold text-green-600">{fmtBRL(Number(showFaturaDetail.valor_pago))}</p></div>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Vencimento</span><span>{fmtData(showFaturaDetail.data_vencimento)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Pagamento</span><span>{fmtData(showFaturaDetail.data_pagamento)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Status</span><Badge style={{ background: showFaturaDetail.status === 'paga' ? '#D1FAE5' : '#FEF3C7', color: showFaturaDetail.status === 'paga' ? '#059669' : '#D97706' }}>{showFaturaDetail.status}</Badge></div>
              </div>
              <p className="text-xs text-slate-400 text-center">Clique em uma fatura para ver os lançamentos detalhados</p>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setShowFaturaDetail(null)}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}