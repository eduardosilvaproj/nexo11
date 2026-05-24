import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Package, AlertCircle, CheckCircle2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const sb = supabase as unknown as { from: (t: string) => any };

interface EstoqueSelectorProps {
  lojaId: string;
  contratoId: string;
  item: any;
  onUpdateItem: (updates: any) => void;
  onRefresh: () => void;
}

export function EstoqueItemSelector({
  lojaId,
  contratoId,
  item,
  onUpdateItem,
  onRefresh,
}: EstoqueSelectorProps) {
  const [search, setSearch] = useState("");
  const [isConfirmBaixaOpen, setIsConfirmBaixaOpen] = useState(false);

  const { data: estoqueItens = [], isLoading } = useQuery({
    queryKey: ["estoque_itens_selector", lojaId, search],
    enabled: !!lojaId && !item.reserva_estoque_id && !item.estoque_baixado,
    queryFn: async () => {
      let query = sb
        .from("estoque_itens")
        .select("*")
        .eq("loja_id", lojaId)
        .eq("ativo", true);

      if (search) {
        query = query.or(`descricao.ilike.%${search}%,codigo.ilike.%${search}%,categoria.ilike.%${search}%`);
      }

      const { data, error } = await query.order("descricao").limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: itemVinculado } = useQuery({
    queryKey: ["estoque_item_detalhe", item.item_estoque_id],
    enabled: !!item.item_estoque_id,
    queryFn: async () => {
      const { data, error } = await sb
        .from("estoque_itens")
        .select("*")
        .eq("id", item.item_estoque_id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const handleReservar = async (estoqueItem: any) => {
    try {
      if (item.quantidade <= 0) {
        return toast.error("Quantidade solicitada deve ser maior que zero.");
      }

      const disponivel = (estoqueItem.quantidade_total || 0) - (estoqueItem.quantidade_reservada || 0);
      if (disponivel < item.quantidade) {
        return toast.error("Saldo insuficiente no almoxarifado.");
      }

      // 1. Criar reserva
      const { data: reserva, error: resError } = await sb
        .from("estoque_reservas")
        .insert({
          item_id: estoqueItem.id,
          contrato_id: contratoId,
          loja_id: lojaId,
          quantidade: item.quantidade,
          origem_conferencia_id: item.id || null,
          observacoes: `Reserva para requisição de compras`,
          status: "reservada",
        })
        .select()
        .single();

      if (resError) throw resError;

      // 2. Atualizar estoque_itens.quantidade_reservada
      const { error: updError } = await sb
        .from("estoque_itens")
        .update({
          quantidade_reservada: (estoqueItem.quantidade_reservada || 0) + item.quantidade,
        })
        .eq("id", estoqueItem.id);

      if (updError) throw updError;

      // 3. Atualizar item local e se houver ambiente_itens_extras
      onUpdateItem({
        item_estoque_id: estoqueItem.id,
        reserva_estoque_id: reserva.id,
        quantidade_em_estoque: estoqueItem.quantidade_total,
        divergencia_estoque: false,
      });

      if (item.id) {
        await sb
          .from("ambiente_itens_extras")
          .update({
            origem: "almoxarifado",
            item_estoque_id: estoqueItem.id,
            reserva_id: reserva.id,
            quantidade_em_estoque: estoqueItem.quantidade_total,
            divergencia_estoque: false,
          })
          .eq("id", item.id);
      }

      toast.success("Estoque reservado com sucesso.");
      onRefresh();
    } catch (error: any) {
      toast.error("Erro ao reservar estoque: " + error.message);
    }
  };

  const handleBaixar = async () => {
    try {
      if (!item.reserva_estoque_id || !item.item_estoque_id) return;

      const { data: reserva, error: resFetchError } = await sb
        .from("estoque_reservas")
        .select("*")
        .eq("id", item.reserva_estoque_id)
        .single();

      if (resFetchError) throw resFetchError;
      if (reserva.status !== "reservada") {
        return toast.error("Reserva não está mais ativa.");
      }

      const { data: estoqueItem, error: itemFetchError } = await sb
        .from("estoque_itens")
        .select("*")
        .eq("id", item.item_estoque_id)
        .single();

      if (itemFetchError) throw itemFetchError;

      if (estoqueItem.quantidade_total < reserva.quantidade) {
        return toast.error("Saldo total insuficiente para baixa.");
      }

      // 1. Movimentação de saída
      const { error: movError } = await sb.from("estoque_movimentacoes").insert({
        tipo: "saida",
        subtipo: "separacao_requisicao",
        item_id: item.item_estoque_id,
        loja_id: lojaId,
        contrato_id: contratoId,
        quantidade: reserva.quantidade,
        valor_unitario: estoqueItem.custo_medio_unitario || 0,
        valor_total: (estoqueItem.custo_medio_unitario || 0) * reserva.quantidade,
        motivo: "Separação de item reservado para requisição",
        observacoes: "Baixa automática via Compras",
        data: new Date().toISOString(),
      });

      if (movError) throw movError;

      // 2. Atualizar estoque_itens
      const { error: updItemError } = await sb
        .from("estoque_itens")
        .update({
          quantidade_total: (estoqueItem.quantidade_total || 0) - reserva.quantidade,
          quantidade_reservada: (estoqueItem.quantidade_reservada || 0) - reserva.quantidade,
        })
        .eq("id", item.item_estoque_id);

      if (updItemError) throw updItemError;

      // 3. Atualizar reserva
      const { error: updResError } = await sb
        .from("estoque_reservas")
        .update({
          status: "baixada",
          liberada_at: new Date().toISOString(),
        })
        .eq("id", item.reserva_estoque_id);

      if (updResError) throw updResError;

      // 4. Atualizar item
      onUpdateItem({
        status: "concluido",
        estoque_baixado: true,
      });

      if (item.id) {
        await sb
          .from("ambiente_itens_extras")
          .update({
            status_compra: "recebido",
          })
          .eq("id", item.id);
      }

      toast.success("Item baixado do estoque com sucesso.");
      setIsConfirmBaixaOpen(false);
      onRefresh();
    } catch (error: any) {
      toast.error("Erro ao baixar estoque: " + error.message);
    }
  };

  const handleCancelarReserva = async () => {
    try {
      if (!item.reserva_estoque_id || !item.item_estoque_id) return;

      const { data: reserva, error: resError } = await sb
        .from("estoque_reservas")
        .select("*")
        .eq("id", item.reserva_estoque_id)
        .single();

      if (resError) throw resError;

      const { data: estoqueItem, error: itemError } = await sb
        .from("estoque_itens")
        .select("*")
        .eq("id", item.item_estoque_id)
        .single();

      if (itemError) throw itemError;

      // 1. Atualizar quantidade reservada
      await sb
        .from("estoque_itens")
        .update({
          quantidade_reservada: Math.max(0, (estoqueItem.quantidade_reservada || 0) - reserva.quantidade),
        })
        .eq("id", item.item_estoque_id);

      // 2. Cancelar reserva
      await sb
        .from("estoque_reservas")
        .update({ status: "cancelada" })
        .eq("id", item.reserva_estoque_id);

      // 3. Limpar item
      onUpdateItem({
        item_estoque_id: null,
        reserva_estoque_id: null,
        quantidade_em_estoque: null,
        divergencia_estoque: false,
      });

      if (item.id) {
        await sb
          .from("ambiente_itens_extras")
          .update({
            item_estoque_id: null,
            reserva_id: null,
            quantidade_em_estoque: null,
            divergencia_estoque: false,
          })
          .eq("id", item.id);
      }

      toast.success("Reserva cancelada.");
      onRefresh();
    } catch (error: any) {
      toast.error("Erro ao cancelar reserva: " + error.message);
    }
  };

  if (item.estoque_baixado) {
    return (
      <div className="mt-2 p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-2 text-emerald-700">
          <CheckCircle2 size={16} />
          <span className="text-sm font-medium">Item separado e baixado do estoque</span>
        </div>
        {itemVinculado && (
          <span className="text-xs text-emerald-600">
            {itemVinculado.descricao} ({itemVinculado.codigo || "S/C"})
          </span>
        )}
      </div>
    );
  }

  if (item.reserva_estoque_id) {
    const disponivel = itemVinculado ? itemVinculado.quantidade_total - itemVinculado.quantidade_reservada : 0;
    
    return (
      <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-700">
            <Package size={16} />
            <span className="text-sm font-medium">Item reservado no estoque</span>
          </div>
          <Badge variant="info">Reservado</Badge>
        </div>
        
        {itemVinculado && (
          <div className="text-xs text-slate-600 grid grid-cols-2 gap-2 bg-white/50 p-2 rounded">
            <div><strong>Item:</strong> {itemVinculado.descricao}</div>
            <div><strong>Código:</strong> {itemVinculado.codigo || "—"}</div>
            <div><strong>Total:</strong> {itemVinculado.quantidade_total} {itemVinculado.unidade}</div>
            <div><strong>Disponível:</strong> {disponivel} {itemVinculado.unidade}</div>
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            size="sm" 
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            onClick={() => setIsConfirmBaixaOpen(true)}
          >
            Baixar Estoque
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="text-slate-500"
            onClick={handleCancelarReserva}
          >
            <RotateCcw size={14} className="mr-1" />
            Cancelar
          </Button>
        </div>

        <Dialog open={isConfirmBaixaOpen} onOpenChange={setIsConfirmBaixaOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar baixa de estoque</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-slate-600">
                Deseja confirmar a separação e baixa de <strong>{item.quantidade} {item.unidade}</strong> do item 
                <strong> {itemVinculado?.descricao}</strong>?
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Esta ação gerará uma movimentação de saída e atualizará o saldo real.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsConfirmBaixaOpen(false)}>Cancelar</Button>
              <Button onClick={handleBaixar}>Confirmar Baixa</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="mt-2 p-3 border border-dashed border-slate-300 rounded-lg bg-slate-50/50 space-y-3">
      <div className="flex items-center gap-2 text-slate-500">
        <Search size={16} />
        <span className="text-sm font-medium">Vincular item ao estoque</span>
      </div>

      <Input
        placeholder="Buscar no almoxarifado..."
        size={32}
        className="h-8 text-xs"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="max-h-[200px] overflow-y-auto space-y-1">
        {isLoading && <p className="text-[10px] text-center text-slate-400 py-2">Buscando...</p>}
        {!isLoading && estoqueItens.length === 0 && search && (
          <p className="text-[10px] text-center text-slate-400 py-2">Nenhum item encontrado.</p>
        )}
        {estoqueItens.map((ei: any) => {
          const disponivel = ei.quantidade_total - ei.quantidade_reservada;
          const insuficiente = disponivel < item.quantidade;

          return (
            <div 
              key={ei.id} 
              className={`p-2 rounded border flex items-center justify-between gap-2 transition-colors ${
                insuficiente ? "bg-red-50/30 border-red-100 opacity-70" : "bg-white border-slate-200 hover:border-blue-300"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-700 truncate">{ei.descricao}</span>
                  {ei.codigo && <span className="text-[9px] bg-slate-100 px-1 rounded text-slate-500 font-mono">{ei.codigo}</span>}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <span>Disp: {disponivel} {ei.unidade}</span>
                  <span>·</span>
                  <span>Total: {ei.quantidade_total}</span>
                </div>
              </div>
              
              {insuficiente ? (
                <div className="flex items-center gap-1 text-red-500" title="Saldo insuficiente">
                  <AlertCircle size={12} />
                  <span className="text-[9px] font-medium">Saldo</span>
                </div>
              ) : (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-7 text-[10px] text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={() => handleReservar(ei)}
                >
                  Reservar
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}