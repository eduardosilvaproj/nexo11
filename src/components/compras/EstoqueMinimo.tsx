import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Package, Plus, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const sb = supabase as unknown as { from: (t: string) => any };

interface EstoqueItem {
  id: string;
  loja_id: string;
  nome: string;
  quantidade_atual: number;
  quantidade_minima: number;
  unidade: string;
  fornecedor_id: string | null;
}

export function EstoqueMinimo() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ nome: "", quantidade_atual: 0, quantidade_minima: 0, unidade: "un" });
  const [creating, setCreating] = useState(false);

  // Get user's loja_id from roles
  const { data: userRole } = useQuery({
    queryKey: ["user-role-loja"],
    queryFn: async () => {
      const { data } = await sb
        .from("user_roles")
        .select("loja_id")
        .eq("user_id", user?.id)
        .limit(1)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const lojaId = userRole?.loja_id;

  const { data: itens = [], isLoading } = useQuery<EstoqueItem[]>({
    queryKey: ["compras-estoque-minimo", lojaId],
    enabled: !!lojaId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("compras_estoque_minimo")
        .select("*")
        .eq("loja_id", lojaId)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as EstoqueItem[];
    },
  });

  const abaixoMinimo = itens.filter((i) => i.quantidade_atual <= i.quantidade_minima);
  const ok = itens.filter((i) => i.quantidade_atual > i.quantidade_minima);

  const criarItem = async () => {
    if (!newItem.nome.trim()) return toast.error("Informe o nome do item");
    setCreating(true);
    try {
      const { error } = await sb.from("compras_estoque_minimo").insert({
        loja_id: lojaId,
        nome: newItem.nome,
        quantidade_atual: newItem.quantidade_atual,
        quantidade_minima: newItem.quantidade_minima,
        unidade: newItem.unidade || "un",
      });
      if (error) throw error;
      toast.success("Item adicionado");
      qc.invalidateQueries({ queryKey: ["compras-estoque-minimo", lojaId] });
      setShowAdd(false);
      setNewItem({ nome: "", quantidade_atual: 0, quantidade_minima: 0, unidade: "un" });
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar item");
    } finally {
      setCreating(false);
    }
  };

  const criarRequisicaoReposicao = async () => {
    if (abaixoMinimo.length === 0) return toast.error("Nenhum item abaixo do mínimo");
    try {
      const itensJson = abaixoMinimo.map((item) => ({
        descricao: item.nome,
        quantidade: item.quantidade_minima - item.quantidade_atual,
        unidade: item.unidade,
        origem: "comprar" as const,
        status: "pendente" as const,
      }));

      const { error } = await sb.from("requisicoes_compra").insert({
        loja_id: lojaId,
        contrato_id: null,
        ambiente_id: null,
        itens_json: itensJson,
        status: "aberta",
        observacoes: "Reposição automática - estoque mínimo",
      });
      if (error) throw error;
      toast.success(`Requisição de reposição criada com ${abaixoMinimo.length} itens`);
      qc.invalidateQueries({ queryKey: ["compras-requisicoes"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar requisição");
    }
  };

  const updateQuantidade = async (id: string, quantidade_atual: number) => {
    const { error } = await sb
      .from("compras_estoque_minimo")
      .update({ quantidade_atual, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["compras-estoque-minimo", lojaId] });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package size={18} style={{ color: "#1E6FBF" }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#0D1117" }}>Controle de Estoque Mínimo</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
            <Plus size={14} className="mr-1" />
            Novo item
          </Button>
          {abaixoMinimo.length > 0 && (
            <Button size="sm" onClick={criarRequisicaoReposicao}>
              <RefreshCw size={14} className="mr-1" />
              Criar reposição
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white p-4 flex items-center gap-3" style={{ border: "0.5px solid #E8ECF2" }}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: "#FEF2F2", color: "#DC2626" }}>
            <AlertTriangle size={18} />
          </div>
          <div className="flex flex-col">
            <span style={{ fontSize: 11, color: "#6B7A90" }}>Abaixo do mínimo</span>
            <span style={{ fontSize: 22, fontWeight: 600, color: "#DC2626" }}>{abaixoMinimo.length}</span>
          </div>
        </div>
        <div className="rounded-xl bg-white p-4 flex items-center gap-3" style={{ border: "0.5px solid #E8ECF2" }}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: "#ECFDF5", color: "#05873C" }}>
            <CheckCircle2 size={18} />
          </div>
          <div className="flex flex-col">
            <span style={{ fontSize: 11, color: "#6B7A90" }}>Estoque OK</span>
            <span style={{ fontSize: 22, fontWeight: 600, color: "#05873C" }}>{ok.length}</span>
          </div>
        </div>
      </div>

      {/* Items table */}
      <div className="rounded-xl bg-white" style={{ border: "0.5px solid #E8ECF2", overflow: "hidden" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: "#F7F9FC" }}>
              <tr>
                {["Item", "Qtd Atual", "Qtd Mínima", "Unidade", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left" style={{ fontSize: 11, color: "#6B7A90", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">Carregando...</td></tr>
              )}
              {!isLoading && itens.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">Nenhum item cadastrado.</td></tr>
              )}
              {itens.map((item) => {
                const abaixo = item.quantidade_atual <= item.quantidade_minima;
                return (
                  <tr key={item.id} style={{ borderTop: "0.5px solid #E8ECF2" }}>
                    <td className="px-4 py-3" style={{ fontSize: 13, fontWeight: 500, color: "#0D1117" }}>{item.nome}</td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-20 h-7 text-xs"
                        value={item.quantidade_atual}
                        onChange={(e) => updateQuantidade(item.id, parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="px-4 py-3" style={{ fontSize: 13 }}>{item.quantidade_minima}</td>
                    <td className="px-4 py-3" style={{ fontSize: 13, color: "#6B7A90" }}>{item.unidade}</td>
                    <td className="px-4 py-3">
                      {abaixo ? (
                        <Badge variant="destructive" className="text-[10px]">
                          <AlertTriangle size={10} className="mr-1" />
                          Abaixo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]" style={{ color: "#05873C", borderColor: "#05873C" }}>
                          OK
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add item dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo item de estoque mínimo</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-2">
            <div>
              <label style={{ fontSize: 11, color: "#6B7A90" }}>Nome do item</label>
              <Input
                value={newItem.nome}
                onChange={(e) => setNewItem((p) => ({ ...p, nome: e.target.value }))}
                placeholder="Ex: Parafuso 6mm"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label style={{ fontSize: 11, color: "#6B7A90" }}>Qtd atual</label>
                <Input
                  type="number"
                  min="0"
                  value={newItem.quantidade_atual}
                  onChange={(e) => setNewItem((p) => ({ ...p, quantidade_atual: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#6B7A90" }}>Qtd mínima</label>
                <Input
                  type="number"
                  min="0"
                  value={newItem.quantidade_minima}
                  onChange={(e) => setNewItem((p) => ({ ...p, quantidade_minima: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#6B7A90" }}>Unidade</label>
                <Input
                  value={newItem.unidade}
                  onChange={(e) => setNewItem((p) => ({ ...p, unidade: e.target.value }))}
                  placeholder="un"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button onClick={criarItem} disabled={creating}>
              {creating ? "Salvando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
