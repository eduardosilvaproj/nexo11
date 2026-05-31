import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, ShoppingBag, Receipt } from "lucide-react";

const sb = supabase as unknown as { from: (t: string) => any };

interface ItemCompra {
  descricao: string;
  quantidade: number;
  unidade: string;
  preco_unitario: number;
}

interface CompraAvulsa {
  id: string;
  fornecedor_nome: string;
  itens: ItemCompra[];
  valor_total: number;
  forma_pagamento: string | null;
  nota_fiscal: string | null;
  observacoes: string | null;
  created_at: string;
  created_by_nome?: string;
}

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function CompraAvulsaTab() {
  const { user, perfil } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [fornecedorNome, setFornecedorNome] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [notaFiscal, setNotaFiscal] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [itens, setItens] = useState<ItemCompra[]>([
    { descricao: "", quantidade: 1, unidade: "un", preco_unitario: 0 },
  ]);
  const [saving, setSaving] = useState(false);

  const { data: compras = [], isLoading } = useQuery({
    queryKey: ["compras-avulsas"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("compras_avulsas")
        .select("id, fornecedor_nome, itens, valor_total, forma_pagamento, nota_fiscal, observacoes, created_at, pessoas:created_by(nome)")
        .eq("loja_id", perfil?.loja_id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []).map((c: any) => ({
        ...c,
        itens: c.itens || [],
        created_by_nome: c.pessoas?.nome || "—",
      })) as CompraAvulsa[];
    },
    enabled: !!perfil?.loja_id,
  });

  function addItem() {
    setItens([...itens, { descricao: "", quantidade: 1, unidade: "un", preco_unitario: 0 }]);
  }

  function removeItem(idx: number) {
    setItens(itens.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof ItemCompra, value: any) {
    setItens(itens.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  const valorTotal = itens.reduce((sum, i) => sum + i.quantidade * i.preco_unitario, 0);

  async function handleSalvar() {
    if (!fornecedorNome.trim()) {
      toast.error("Informe o fornecedor");
      return;
    }
    if (itens.length === 0 || !itens[0].descricao.trim()) {
      toast.error("Adicione pelo menos um item");
      return;
    }

    setSaving(true);
    const { error } = await sb.from("compras_avulsas").insert({
      loja_id: perfil?.loja_id,
      fornecedor_nome: fornecedorNome.trim(),
      itens,
      valor_total: valorTotal,
      forma_pagamento: formaPagamento || null,
      nota_fiscal: notaFiscal.trim() || null,
      observacoes: observacoes.trim() || null,
      created_by: user?.id,
    });
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Compra registrada");
    setOpen(false);
    resetForm();
    qc.invalidateQueries({ queryKey: ["compras-avulsas"] });
  }

  function resetForm() {
    setFornecedorNome("");
    setFormaPagamento("pix");
    setNotaFiscal("");
    setObservacoes("");
    setItens([{ descricao: "", quantidade: 1, unidade: "un", preco_unitario: 0 }]);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <ShoppingBag className="h-4 w-4" />
          Compras Avulsas
        </h3>
        <Button size="sm" className="bg-[#1E6FBF] gap-1" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Nova Compra
        </Button>
      </div>

      {/* Lista de compras */}
      {isLoading ? (
        <p className="text-xs text-slate-400 text-center py-8">Carregando...</p>
      ) : compras.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed rounded-xl">
          <Receipt className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Nenhuma compra avulsa registrada</p>
          <p className="text-xs text-slate-400 mt-1">Use "Nova Compra" para lançar compras diretas</p>
        </div>
      ) : (
        <div className="rounded-xl bg-white overflow-hidden" style={{ border: "0.5px solid #E8ECF2" }}>
          <table className="w-full">
            <thead style={{ backgroundColor: "#F7F9FC" }}>
              <tr>
                {["Data", "Fornecedor", "Itens", "Valor Total", "Pagamento", "NF", "Responsável"].map(h => (
                  <th key={h} className="px-4 py-3 text-left" style={{ fontSize: 11, color: "#6B7A90", fontWeight: 500, textTransform: "uppercase" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compras.map(c => (
                <tr key={c.id} className="border-t border-[#E8ECF2] hover:bg-slate-50">
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {new Date(c.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-slate-900">{c.fornecedor_nome}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{c.itens.length} item(ns)</td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-900">{fmtBRL(c.valor_total)}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 capitalize">{c.forma_pagamento || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{c.nota_fiscal || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{c.created_by_nome}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog Nova Compra */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Compra Avulsa</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Fornecedor *</Label>
                <Input
                  placeholder="Nome do fornecedor"
                  value={fornecedorNome}
                  onChange={e => setFornecedorNome(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Forma de pagamento</Label>
                <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Nº Nota Fiscal (opcional)</Label>
              <Input
                placeholder="Ex: 12345"
                value={notaFiscal}
                onChange={e => setNotaFiscal(e.target.value)}
              />
            </div>

            {/* Itens */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold">Itens</Label>
                <Button type="button" size="sm" variant="outline" className="h-6 text-[10px]" onClick={addItem}>
                  <Plus className="h-3 w-3 mr-1" /> Item
                </Button>
              </div>
              <div className="space-y-2">
                {itens.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      {idx === 0 && <Label className="text-[10px] text-slate-400">Descrição</Label>}
                      <Input
                        placeholder="Descrição do item"
                        value={item.descricao}
                        onChange={e => updateItem(idx, "descricao", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && <Label className="text-[10px] text-slate-400">Qtd</Label>}
                      <Input
                        type="number"
                        min={1}
                        value={item.quantidade}
                        onChange={e => updateItem(idx, "quantidade", Number(e.target.value))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && <Label className="text-[10px] text-slate-400">Unidade</Label>}
                      <Input
                        value={item.unidade}
                        onChange={e => updateItem(idx, "unidade", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && <Label className="text-[10px] text-slate-400">Preço unit.</Label>}
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={item.preco_unitario}
                        onChange={e => updateItem(idx, "preco_unitario", Number(e.target.value))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-1">
                      {itens.length > 1 && (
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-red-400" onClick={() => removeItem(idx)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-right">
                <span className="text-xs text-slate-500">Total: </span>
                <span className="text-sm font-bold text-slate-900">{fmtBRL(valorTotal)}</span>
              </div>
            </div>

            <div>
              <Label className="text-xs">Observações</Label>
              <Textarea
                placeholder="Observações sobre a compra..."
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button className="bg-[#1E6FBF]" onClick={handleSalvar} disabled={saving}>
              {saving ? "Salvando..." : "Registrar Compra"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
