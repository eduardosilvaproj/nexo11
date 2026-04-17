import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Check, X, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

type CustoFixo = { id: string; descricao: string; valor: number };

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return `${MESES[m - 1]} ${y}`;
}
function buildMonthOptions(): string[] {
  const now = new Date();
  const arr: string[] = [];
  for (let i = 6; i >= -1; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    arr.push(monthKey(d));
  }
  return arr;
}
function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
}

interface Props {
  onTotalChange?: (total: number) => void;
  onMesChange?: (mes: string) => void;
}

export function CustosFixosCard({ onTotalChange, onMesChange }: Props) {
  const { perfil, hasRole } = useAuth();
  const lojaId = perfil?.loja_id ?? null;
  const canEdit = hasRole("admin") || hasRole("franqueador");
  const meses = useMemo(buildMonthOptions, []);
  const [mes, setMes] = useState<string>(monthKey(new Date()));
  const [itens, setItens] = useState<CustoFixo[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editValor, setEditValor] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newValor, setNewValor] = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const total = useMemo(() => itens.reduce((s, i) => s + Number(i.valor || 0), 0), [itens]);

  useEffect(() => { onTotalChange?.(total); }, [total, onTotalChange]);
  useEffect(() => { onMesChange?.(mes); }, [mes, onMesChange]);

  async function load() {
    if (!lojaId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("custos_fixos")
      .select("id,descricao,valor")
      .eq("loja_id", lojaId)
      .eq("mes_referencia", mes)
      .order("created_at", { ascending: true });
    setLoading(false);
    if (error) { toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" }); return; }
    setItens((data ?? []).map(d => ({ ...d, valor: Number(d.valor) })));
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [lojaId, mes]);

  function startEdit(it: CustoFixo) {
    setEditingId(it.id); setEditDesc(it.descricao); setEditValor(String(it.valor));
  }
  function cancelEdit() { setEditingId(null); setEditDesc(""); setEditValor(""); }

  async function saveEdit(id: string) {
    const valor = Number(editValor.replace(",", ".")) || 0;
    if (!editDesc.trim()) { toast({ title: "Descrição obrigatória", variant: "destructive" }); return; }
    const { error } = await supabase.from("custos_fixos").update({ descricao: editDesc.trim(), valor }).eq("id", id);
    if (error) { toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); return; }
    cancelEdit(); load();
  }

  async function saveNew() {
    if (!lojaId) return;
    const valor = Number(newValor.replace(",", ".")) || 0;
    if (!newDesc.trim()) { toast({ title: "Descrição obrigatória", variant: "destructive" }); return; }
    const { error } = await supabase.from("custos_fixos").insert({
      loja_id: lojaId, mes_referencia: mes, descricao: newDesc.trim(), valor,
    });
    if (error) { toast({ title: "Erro ao adicionar", description: error.message, variant: "destructive" }); return; }
    setAdding(false); setNewDesc(""); setNewValor(""); load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("custos_fixos").delete().eq("id", id);
    if (error) { toast({ title: "Erro ao remover", description: error.message, variant: "destructive" }); return; }
    setConfirmDel(null); load();
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Custos fixos do mês</CardTitle>
        <Select value={mes} onValueChange={setMes}>
          <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {meses.map(m => <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>)}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {!loading && itens.length === 0 && !adding && (
          <p className="py-4 text-sm text-muted-foreground">Nenhum custo fixo neste mês.</p>
        )}

        <div className="divide-y">
          {itens.map((it) => (
            <div key={it.id} className="flex items-center gap-2 py-2">
              {editingId === it.id ? (
                <>
                  <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="h-9 flex-1" />
                  <Input value={editValor} onChange={(e) => setEditValor(e.target.value)} type="number" step="0.01" className="h-9 w-32" />
                  <Button size="icon" variant="ghost" onClick={() => saveEdit(it.id)} aria-label="Salvar">
                    <Check className="h-4 w-4 text-[#12B76A]" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={cancelEdit} aria-label="Cancelar">
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{it.descricao}</span>
                  <span className="w-32 text-right text-sm tabular-nums">{fmtBRL(Number(it.valor))}</span>
                  {canEdit && (
                    <>
                      <Button size="icon" variant="ghost" onClick={() => startEdit(it)} aria-label="Editar">
                        <Pencil className="h-4 w-4 text-[#6B7A90]" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setConfirmDel(it.id)} aria-label="Remover">
                        <Trash2 className="h-4 w-4 text-[#E53935]" />
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          ))}

          {adding && (
            <div className="flex items-center gap-2 py-2">
              <Input placeholder="Descrição" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="h-9 flex-1" autoFocus />
              <Input placeholder="0,00" value={newValor} onChange={(e) => setNewValor(e.target.value)} type="number" step="0.01" className="h-9 w-32" />
              <Button size="icon" variant="ghost" onClick={saveNew} aria-label="Salvar">
                <Check className="h-4 w-4 text-[#12B76A]" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => { setAdding(false); setNewDesc(""); setNewValor(""); }} aria-label="Cancelar">
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div
          className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium"
          style={{ background: "#F5F7FA", borderTop: "0.5px solid #E8ECF2" }}
        >
          <span>Total custo fixo</span>
          <span className="tabular-nums">{fmtBRL(total)}</span>
        </div>

        {!adding && (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)} className="w-full">
            <Plus className="mr-1 h-4 w-4" /> Adicionar custo fixo
          </Button>
        )}
      </CardContent>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover este custo fixo?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDel && remove(confirmDel)}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
