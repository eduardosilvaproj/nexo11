import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertTriangle, XCircle, Plus, Search, Eye, ThumbsUp, X, ChevronDown, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { canPerform } from "@/lib/permissions";

type Status = 'rascunho' | 'pendente' | 'aprovado_nivel1' | 'aprovado_nivel2' | 'rejeitado' | 'cancelado' | 'pago' | 'estornado';
type Urgencia = 'normal' | 'urgente' | 'critico';

interface Solicitacao {
  id: string;
  titulo: string;
  descricao?: string;
  valor: number;
  beneficiario_nome?: string;
  beneficiario_pix?: string;
  data_necessidade: string | null;
  data_vencimento: string | null;
  status: Status;
  nivel_aprovacao: number;
  criado_em?: string;
  created_by?: { nome?: string; email?: string };
  categoria?: string;
  fornecedor?: { nome?: string } | null;
  loja_id: string;
}

const STATUS_CONFIG: Record<Status, { bg: string; fg: string; label: string; icon: React.ReactNode }> = {
  rascunho: { bg: '#F1F5F9', fg: '#64748B', label: 'Rascunho', icon: <Clock className="h-3 w-3" /> },
  pendente: { bg: '#FEF3C7', fg: '#D97706', label: 'Pendente', icon: <Clock className="h-3 w-3" /> },
  aprovado_nivel1: { bg: '#DBEAFE', fg: '#2563EB', label: 'Aprovado N1', icon: <ThumbsUp className="h-3 w-3" /> },
  aprovado_nivel2: { bg: '#D1FAE5', fg: '#059669', label: 'Aprovado', icon: <CheckCircle className="h-3 w-3" /> },
  rejeitado: { bg: '#FEE2E2', fg: '#DC2626', label: 'Rejeitado', icon: <XCircle className="h-3 w-3" /> },
  cancelado: { bg: '#F1F5F9', fg: '#94A3B8', label: 'Cancelado', icon: <X className="h-3 w-3" /> },
  pago: { bg: '#D1FAE5', fg: '#059669', label: 'Pago', icon: <CheckCircle className="h-3 w-3" /> },
  estornado: { bg: '#FEE2E2', fg: '#DC2626', label: 'Estornado', icon: <AlertTriangle className="h-3 w-3" /> },
};

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function fmtData(s: string | null | undefined) {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}
function isAtrasado(s: string | null) {
  if (!s) return false;
  return s < new Date().toISOString().slice(0, 10);
}

export function PagamentosImediatos() {
  const [items, setItems] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>('todas');
  const [busca, setBusca] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDetalhe, setShowDetalhe] = useState<Solicitacao | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { roles, user, perfil } = useAuth();
  const podeGerenciar = canPerform(roles, "financeiro.manage");

  // Form state
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    valor: '',
    beneficiario_nome: '',
    beneficiario_pix: '',
    data_necessidade: '',
    categoria: '',
    urgencia: 'normal' as Urgencia,
  });

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const { data, error } = await supabase
      .from('solicitacoes_pagamento')
      .select(`
        id, titulo, descricao, valor, beneficiario_nome, data_necessidade, data_vencimento,
        status, nivel_aprovacao, created_at, urgencia,
        created_by:auth.users(id, email),
        fornecedor:fornecedores(id, nome),
        categoria:categorias_despesas(nome)
      `)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) { toast.error(error.message); }
    else { setItems((data ?? []) as any); }
    setLoading(false);
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const urgentes = items.filter(i =>
    (i.status === 'aprovado_nivel2' || i.status === 'aprovado_nivel1') &&
    i.data_necessidade && i.data_necessidade <= hoje &&
    i.status !== 'pago' && i.status !== 'cancelado'
  );

  const filtrados = useMemo(() => {
    let list = items;
    if (filtroStatus !== 'todas') list = list.filter(i => i.status === filtroStatus);
    if (busca.trim()) {
      const b = busca.toLowerCase();
      list = list.filter(i =>
        (i.titulo ?? '').toLowerCase().includes(b) ||
        (i.beneficiario_nome ?? '').toLowerCase().includes(b) ||
        (i.descricao ?? '').toLowerCase().includes(b)
      );
    }
    return list;
  }, [items, filtroStatus, busca]);

  async function handleAprovar(s: Solicitacao, nivel: 1 | 2) {
    setActionLoading(true);
    const status = nivel === 1 ? 'aprovado_nivel1' : 'aprovado_nivel2';
    const { error } = await supabase.from('solicitacoes_pagamento').update({
      status,
      aprovado_por: user?.id,
      data_aprovacao: new Date().toISOString(),
    }).eq('id', s.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Solicitação ${nivel === 1 ? 'aprovada no nível 1' : 'aprovada e pronta para pagamento'}`);
      // Registrar histórico
      await supabase.from('solicitacoes_pagamento_historico').insert({
        solicitacao_id: s.id,
        acao: nivel === 1 ? 'aprovar_nivel1' : 'aprovar_nivel2',
        status_de: s.status,
        status_para: status,
        user_id: user?.id,
      });
      carregar();
    }
    setActionLoading(false);
  }

  async function handleRejeitar(s: Solicitacao) {
    const obs = window.prompt('Motivo da rejeição:');
    if (obs === null) return;
    setActionLoading(true);
    const { error } = await supabase.from('solicitacoes_pagamento').update({
      status: 'rejeitado',
      obs_aprovacao: obs,
    }).eq('id', s.id);
    if (error) toast.error(error.message);
    else {
      toast.success('Solicitação rejeitada');
      await supabase.from('solicitacoes_pagamento_historico').insert({
        solicitacao_id: s.id,
        acao: 'rejeitar',
        status_de: s.status,
        status_para: 'rejeitado',
        observacao: obs,
        user_id: user?.id,
      });
      carregar();
    }
    setActionLoading(false);
  }

  async function handlePagar(s: Solicitacao) {
    if (!window.confirm(`Confirmar pagamento de ${fmtBRL(Number(s.valor))} para ${s.beneficiario_nome || s.titulo}?`)) return;
    setActionLoading(true);
    const { error } = await supabase.from('solicitacoes_pagamento').update({
      status: 'pago',
    }).eq('id', s.id);
    if (error) toast.error(error.message);
    else {
      // Criar lançamento em contas a pagar
      await supabase.from('financeiro_contas_pagar').insert({
        descricao: s.titulo,
        valor: Number(s.valor),
        vencimento: s.data_vencimento || hoje,
        data_pagamento: hoje,
        status: 'pago',
        fornecedor_id: (s as any).fornecedor_id || null,
        solicitacao_pagamento_id: s.id,
      });
      toast.success('Pagamento registrado');
      await supabase.from('solicitacoes_pagamento_historico').insert({
        solicitacao_id: s.id,
        acao: 'pagar',
        status_de: s.status,
        status_para: 'pago',
        user_id: user?.id,
      });
      carregar();
    }
    setActionLoading(false);
  }

  async function handleCriar() {
    if (!form.titulo || !form.valor) {
      toast.error('Informe título e valor');
      return;
    }
    const { error } = await supabase.from('solicitacoes_pagamento').insert({
      titulo: form.titulo,
      descricao: form.descricao || null,
      valor: Number(form.valor.replace(',', '.')),
      beneficiario_nome: form.beneficiario_nome || null,
      beneficiario_pix: form.beneficiario_pix || null,
      data_necessidade: form.data_necessidade || null,
      status: 'rascunho',
      nivel_aprovacao: 1,
      created_by: user?.id,
      loja_id: (user as any)?.loja_id,
    });
    if (error) toast.error(error.message);
    else {
      toast.success('Solicitação criada');
      setShowForm(false);
      setForm({ titulo: '', descricao: '', valor: '', beneficiario_nome: '', beneficiario_pix: '', data_necessidade: '', categoria: '', urgencia: 'normal' });
      carregar();
    }
  }

  // Card de urgência
  if (urgentes.length > 0 && filtroStatus === 'todas') {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h3 className="font-bold text-red-800">Pagamentos urgentes para hoje</h3>
            <Badge variant="destructive">{urgentes.length}</Badge>
          </div>
          <div className="space-y-2">
            {urgentes.map(u => (
              <div key={u.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-red-200">
                <div>
                  <p className="font-semibold text-sm">{u.titulo}</p>
                  <p className="text-xs text-slate-500">{u.beneficiario_nome || '—'} • Vence {fmtData(u.data_necessidade)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-700">{fmtBRL(Number(u.valor))}</p>
                  <p className="text-xs text-slate-500">{STATUS_CONFIG[u.status].label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Input placeholder="Buscar solicitação..." value={busca} onChange={e => setBusca(e.target.value)} className="max-w-xs" />
          </div>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="aprovado_nivel1">Aprovado N1</SelectItem>
              <SelectItem value="aprovado_nivel2">Aprovado</SelectItem>
              <SelectItem value="rejeitado">Rejeitado</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowForm(true)} className="bg-[#1E6FBF] hover:bg-[#1E6FBF]/90 text-white">
            <Plus className="h-4 w-4 mr-1" /> Nova Solicitação
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Todas as Solicitações ({filtrados.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="bg-[#F8FAFC] text-[#64748B]">
                <tr>
                  <th className="px-3 py-2.5 text-left">Título / Beneficiário</th>
                  <th className="px-3 py-2.5 text-right">Valor</th>
                  <th className="px-3 py-2.5 text-left">Necessidade</th>
                  <th className="px-3 py-2.5 text-left">Status</th>
                  <th className="px-3 py-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8ECF2]">
                {loading ? (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-400">Carregando...</td></tr>
                ) : filtrados.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-400">Nenhuma solicitação encontrada</td></tr>
                ) : filtrados.map(s => {
                  const sc = STATUS_CONFIG[s.status];
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-3">
                        <p className="font-medium">{s.titulo}</p>
                        <p className="text-xs text-slate-500">{s.beneficiario_nome || '—'}</p>
                      </td>
                      <td className="px-3 py-3 text-right font-bold">{fmtBRL(Number(s.valor))}</td>
                      <td className="px-3 py-3 text-xs text-slate-500">{fmtData(s.data_necessidade)}</td>
                      <td className="px-3 py-3">
                        <Badge className="text-[10px]" style={{ background: sc.bg, color: sc.fg }}>
                          {sc.icon} {sc.label}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowDetalhe(s)}>Ver</Button>
                          {podeGerenciar && s.status === 'pendente' && (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-600" onClick={() => handleAprovar(s, 1)} disabled={actionLoading}>Aprovar N1</Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500" onClick={() => handleRejeitar(s)} disabled={actionLoading}>Rejeitar</Button>
                            </>
                          )}
                          {podeGerenciar && s.status === 'aprovado_nivel2' && (
                            <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => handlePagar(s)} disabled={actionLoading}>Pagar</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Dialog nova solicitação */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader><DialogTitle>Nova Solicitação de Pagamento</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Título *</Label>
                <Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Reembolso combustível - João" />
              </div>
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Detalhes da despesa..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Valor *</Label>
                  <Input inputMode="decimal" placeholder="R$ 0,00" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value.replace(/[^\d.,]/g, '') }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Data necessidade</Label>
                  <Input type="date" value={form.data_necessidade} onChange={e => setForm(f => ({ ...f, data_necessidade: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Beneficiário</Label>
                <Input value={form.beneficiario_nome} onChange={e => setForm(f => ({ ...f, beneficiario_nome: e.target.value }))} placeholder="Nome de quem recebe" />
              </div>
              <div className="space-y-1.5">
                <Label>Chave PIX</Label>
                <Input value={form.beneficiario_pix} onChange={e => setForm(f => ({ ...f, beneficiario_pix: e.target.value }))} placeholder="email, CPF ou telefone" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button className="bg-[#1E6FBF] hover:bg-[#1E6FBF]/90 text-white" onClick={handleCriar}>Criar Solicitação</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog detalhe */}
        <Dialog open={!!showDetalhe} onOpenChange={v => !v && setShowDetalhe(null)}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader><DialogTitle>{showDetalhe?.titulo}</DialogTitle></DialogHeader>
            {showDetalhe && (
              <div className="space-y-3">
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-2xl font-bold text-slate-900">{fmtBRL(Number(showDetalhe.valor))}</p>
                  {showDetalhe.descricao && <p className="text-sm text-slate-600 mt-1">{showDetalhe.descricao}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="font-medium text-slate-500">Beneficiário:</span> {showDetalhe.beneficiario_nome || '—'}</div>
                  <div><span className="font-medium text-slate-500">PIX:</span> {showDetalhe.beneficiario_pix || '—'}</div>
                  <div><span className="font-medium text-slate-500">Necessidade:</span> {fmtData(showDetalhe.data_necessidade)}</div>
                  <div><span className="font-medium text-slate-500">Vencimento:</span> {fmtData(showDetalhe.data_vencimento)}</div>
                </div>
                <div>
                  <span className="font-medium text-slate-500 text-sm">Status: </span>
                  <Badge style={{ background: STATUS_CONFIG[showDetalhe.status].bg, color: STATUS_CONFIG[showDetalhe.status].fg }}>
                    {STATUS_CONFIG[showDetalhe.status].icon} {STATUS_CONFIG[showDetalhe.status].label}
                  </Badge>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input placeholder="Buscar solicitação..." value={busca} onChange={e => setBusca(e.target.value)} className="max-w-xs" />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="aprovado_nivel1">Aprovado N1</SelectItem>
            <SelectItem value="aprovado_nivel2">Aprovado</SelectItem>
            <SelectItem value="rejeitado">Rejeitado</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setShowForm(true)} className="bg-[#1E6FBF] hover:bg-[#1E6FBF]/90 text-white">
          <Plus className="h-4 w-4 mr-1" /> Nova Solicitação
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Solicitações de Pagamento ({filtrados.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-slate-400">Carregando...</p>
          ) : filtrados.length === 0 ? (
            <div className="py-12 text-center">
              <Clock className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">Nenhuma solicitação encontrada</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-[#E8ECF2]">
              <table className="w-full text-sm">
                <thead className="bg-[#F8FAFC] text-[#64748B]">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-medium">Título / Beneficiário</th>
                    <th className="px-3 py-2.5 text-right font-medium">Valor</th>
                    <th className="px-3 py-2.5 text-left font-medium">Necessidade</th>
                    <th className="px-3 py-2.5 text-left font-medium">Status</th>
                    <th className="px-3 py-2.5 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8ECF2]">
                  {filtrados.map(s => {
                    const sc = STATUS_CONFIG[s.status];
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="px-3 py-3">
                          <p className="font-medium">{s.titulo}</p>
                          <p className="text-xs text-slate-500">{s.beneficiario_nome || '—'}</p>
                        </td>
                        <td className="px-3 py-3 text-right font-bold">{fmtBRL(Number(s.valor))}</td>
                        <td className="px-3 py-3 text-xs text-slate-500">{fmtData(s.data_necessidade)}</td>
                        <td className="px-3 py-3">
                          <Badge className="text-[10px]" style={{ background: sc.bg, color: sc.fg }}>
                            {sc.icon} {sc.label}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowDetalhe(s)}>Ver</Button>
                            {podeGerenciar && s.status === 'pendente' && (
                              <>
                                <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-600" onClick={() => handleAprovar(s, 1)} disabled={actionLoading}>Aprovar N1</Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500" onClick={() => handleRejeitar(s)} disabled={actionLoading}>Rejeitar</Button>
                              </>
                            )}
                            {podeGerenciar && s.status === 'aprovado_nivel2' && (
                              <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => handlePagar(s)} disabled={actionLoading}>Pagar</Button>
                            )}
                          </div>
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

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>Nova Solicitação de Pagamento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Reembolso combustível - João" />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Detalhes da despesa..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor *</Label>
                <Input inputMode="decimal" placeholder="R$ 0,00" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value.replace(/[^\d.,]/g, '') }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Data necessidade</Label>
                <Input type="date" value={form.data_necessidade} onChange={e => setForm(f => ({ ...f, data_necessidade: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Beneficiário</Label>
              <Input value={form.beneficiario_nome} onChange={e => setForm(f => ({ ...f, beneficiario_nome: e.target.value }))} placeholder="Nome de quem recebe" />
            </div>
            <div className="space-y-1.5">
              <Label>Chave PIX</Label>
              <Input value={form.beneficiario_pix} onChange={e => setForm(f => ({ ...f, beneficiario_pix: e.target.value }))} placeholder="email, CPF ou telefone" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button className="bg-[#1E6FBF] hover:bg-[#1E6FBF]/90 text-white" onClick={handleCriar}>Criar Solicitação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showDetalhe} onOpenChange={v => !v && setShowDetalhe(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>{showDetalhe?.titulo}</DialogTitle></DialogHeader>
          {showDetalhe && (
            <div className="space-y-3">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-2xl font-bold text-slate-900">{fmtBRL(Number(showDetalhe.valor))}</p>
                {showDetalhe.descricao && <p className="text-sm text-slate-600 mt-1">{showDetalhe.descricao}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="font-medium text-slate-500">Beneficiário:</span> {showDetalhe.beneficiario_nome || '—'}</div>
                <div><span className="font-medium text-slate-500">PIX:</span> {showDetalhe.beneficiario_pix || '—'}</div>
                <div><span className="font-medium text-slate-500">Necessidade:</span> {fmtData(showDetalhe.data_necessidade)}</div>
                <div><span className="font-medium text-slate-500">Vencimento:</span> {fmtData(showDetalhe.data_vencimento)}</div>
              </div>
              <div>
                <span className="font-medium text-slate-500 text-sm">Status: </span>
                <Badge style={{ background: STATUS_CONFIG[showDetalhe.status].bg, color: STATUS_CONFIG[showDetalhe.status].fg }}>
                  {STATUS_CONFIG[showDetalhe.status].icon} {STATUS_CONFIG[showDetalhe.status].label}
                </Badge>
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