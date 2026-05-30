import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, Plus, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Transferencia {
  id: string;
  loja_id: string;
  modulo_origem: string;
  modulo_destino: string;
  descricao: string | null;
  valor: number;
  data_transferencia: string;
  tipo: string;
  status: string;
  created_at: string;
}

interface Loja {
  id: string;
  nome: string;
}

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtData(s: string | null) {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

const TIPOS = [
  { value: "transferencia", label: "Transferência" },
  { value: "repasse", label: "Repasse" },
  { value: "deposito", label: "Depósito" },
  { value: "saque", label: "Saque" },
  { value: "ajuste", label: "Ajuste" },
];

export function TransferenciasModulos() {
  const [items, setItems] = useState<Transferencia[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const { user, perfil } = useAuth();

  const [form, setForm] = useState({
    loja_origem: "",
    loja_destino: "",
    valor: "",
    tipo: "transferencia",
    descricao: "",
    data: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const [t, l] = await Promise.all([
      supabase.from("transferencias_modulos").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("lojas").select("id, nome"),
    ]);
    if (t.error) toast.error(t.error.message); else setItems(t.data ?? []);
    if (l.error) toast.error(l.error.message); else setLojas(l.data ?? []);
    setLoading(false);
  }

  async function handleCriar() {
    if (!form.loja_origem || !form.loja_destino || !form.valor) {
      toast.error("Informe origem, destino e valor");
      return;
    }
    if (form.loja_origem === form.loja_destino) {
      toast.error("Origem e destino devem ser diferentes");
      return;
    }
    const valor = Number(form.valor.replace(/[^\d.,]/g, "").replace(",", "."));

    // Criar 2 registros: saída na origem, entrada no destino
    const lojaOrigem = lojas.find(l => l.id === form.loja_origem);
    const lojaDestino = lojas.find(l => l.id === form.loja_destino);

    const { error } = await supabase.from("transferencias_modulos").insert([
      {
        loja_id: form.loja_origem,
        modulo_origem: lojaOrigem?.nome || "Origem",
        modulo_destino: lojaDestino?.nome || "Destino",
        descricao: form.descricao || `Transferência para ${lojaDestino?.nome}`,
        valor: -valor,
        data_transferencia: form.data,
        tipo: form.tipo,
        status: "concluida",
        created_by: user?.id,
      },
      {
        loja_id: form.loja_destino,
        modulo_origem: lojaOrigem?.nome || "Origem",
        modulo_destino: lojaDestino?.nome || "Destino",
        descricao: form.descricao || `Recebido de ${lojaOrigem?.nome}`,
        valor: valor,
        data_transferencia: form.data,
        tipo: form.tipo,
        status: "concluida",
        created_by: user?.id,
      },
    ]);

    if (error) toast.error(error.message);
    else {
      toast.success("Transferência registrada");
      setShowForm(false);
      setForm({ loja_origem: "", loja_destino: "", valor: "", tipo: "transferencia", descricao: "", data: new Date().toISOString().slice(0, 10) });
      carregar();
    }
  }

  const totalEntradas = items.filter(i => i.valor > 0).reduce((s, i) => s + Number(i.valor), 0);
  const totalSaidas = items.filter(i => i.valor < 0).reduce((s, i) => s + Math.abs(Number(i.valor)), 0);

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-none shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2"><ArrowRightLeft className="h-4 w-4 text-green-600" /></div>
              <div><p className="text-xs text-slate-500">Total Entradas</p><p className="text-lg font-bold text-green-600">{fmtBRL(totalEntradas)}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-2"><ArrowRightLeft className="h-4 w-4 text-red-600" /></div>
              <div><p className="text-xs text-slate-500">Total Saídas</p><p className="text-lg font-bold text-red-600">{fmtBRL(totalSaidas)}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2"><Building2 className="h-4 w-4 text-blue-600" /></div>
              <div><p className="text-xs text-slate-500">Filiais</p><p className="text-lg font-bold">{lojas.length}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header + botão */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Histórico de Transferências</h3>
        <Button onClick={() => setShowForm(true)} className="bg-[#1E6FBF] hover:bg-[#1E6FBF]/90 text-white">
          <Plus className="h-4 w-4 mr-1" /> Nova Transferência
        </Button>
      </div>

      {/* Tabela */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <p className="py-8 text-center text-slate-400">Carregando...</p>
          ) : items.length === 0 ? (
            <div className="py-12 text-center">
              <ArrowRightLeft className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">Nenhuma transferência registrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F8FAFC] text-[#64748B]">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-medium">Data</th>
                    <th className="px-3 py-2.5 text-left font-medium">Origem → Destino</th>
                    <th className="px-3 py-2.5 text-left font-medium">Descrição</th>
                    <th className="px-3 py-2.5 text-left font-medium">Tipo</th>
                    <th className="px-3 py-2.5 text-right font-medium">Valor</th>
                    <th className="px-3 py-2.5 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8ECF2]">
                  {items.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-3 text-xs text-slate-500">{fmtData(t.data_transferencia)}</td>
                      <td className="px-3 py-3 text-xs">{t.modulo_origem} → {t.modulo_destino}</td>
                      <td className="px-3 py-3 text-xs">{t.descricao || "—"}</td>
                      <td className="px-3 py-3"><Badge variant="outline" className="text-[10px]">{t.tipo}</Badge></td>
                      <td className="px-3 py-3 text-right font-bold" style={{ color: Number(t.valor) >= 0 ? "#10B981" : "#EF4444" }}>
                        {Number(t.valor) >= 0 ? "+" : ""}{fmtBRL(Number(t.valor))}
                      </td>
                      <td className="px-3 py-3">
                        <Badge style={{ background: t.status === "concluida" ? "#D1FAE5" : "#FEF3C7", color: t.status === "concluida" ? "#059669" : "#D97706" }}>{t.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Nova Transferência */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>Nova Transferência entre Empresas</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Empresa Origem *</Label>
                <Select value={form.loja_origem} onValueChange={v => setForm(f => ({ ...f, loja_origem: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{lojas.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Empresa Destino *</Label>
                <Select value={form.loja_destino} onValueChange={v => setForm(f => ({ ...f, loja_destino: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{lojas.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Valor *</Label>
                <Input inputMode="decimal" placeholder="R$ 0,00" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value.replace(/[^\d.,]/g, "") }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Empréstimo para capital de giro" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button className="bg-[#1E6FBF] hover:bg-[#1E6FBF]/90 text-white" onClick={handleCriar}>Registrar Transferência</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}