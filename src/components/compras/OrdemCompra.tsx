import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Plus, Trash2, CheckCircle2, XCircle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { canPerform } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const sb = supabase as unknown as { from: (t: string) => any };

interface OrdemItem {
  descricao: string;
  quantidade: number;
  preco_unitario: number;
}

interface OrdemCompraProps {
  requisicaoId?: string;
}

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  aguardando_aprovacao: "Aguardando aprovação",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
  concluida: "Concluída",
};

const statusColors: Record<string, { bg: string; text: string }> = {
  rascunho: { bg: "#F3F4F6", text: "#6B7280" },
  aguardando_aprovacao: { bg: "#FEF3C7", text: "#B45309" },
  aprovada: { bg: "#ECFDF5", text: "#05873C" },
  rejeitada: { bg: "#FEF2F2", text: "#DC2626" },
  concluida: { bg: "#E3F0FB", text: "#1E6FBF" },
};

export function OrdemCompra({ requisicaoId }: OrdemCompraProps) {
  const { user, roles } = useAuth();
  const qc = useQueryClient();
  const isGerente = canPerform(roles, "compras.manage");
  const [saving, setSaving] = useState(false);
  const [showReject, setShowReject] = useState<string | null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState("");

  const [fornecedorId, setFornecedorId] = useState("");
  const [itens, setItens] = useState<OrdemItem[]>([{ descricao: "", quantidade: 1, preco_unitario: 0 }]);
  const [prazoEntrega, setPrazoEntrega] = useState("");
  const [condicaoPagamento, setCondicaoPagamento] = useState("");

  // Get user's loja_id
  const { data: userRole } = useQuery({
    queryKey: ["user-role-loja-ordem"],
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

  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores-ordem"],
    queryFn: async () => {
      const { data } = await sb.from("fornecedores").select("id, nome").eq("ativo", true).order("nome");
      return data ?? [];
    },
  });

  // Pre-fill from requisicao if provided
  const { data: requisicao } = useQuery({
    queryKey: ["requisicao-prefill", requisicaoId],
    enabled: !!requisicaoId,
    queryFn: async () => {
      const { data } = await sb
        .from("requisicoes_compra")
        .select("id, itens_json, loja_id")
        .eq("id", requisicaoId)
        .single();
      return data;
    },
  });

  useEffect(() => {
    if (requisicao?.itens_json) {
      const prefilled = (requisicao.itens_json as any[])
        .filter((i: any) => i.origem === "comprar")
        .map((i: any) => ({
          descricao: i.descricao || "",
          quantidade: i.quantidade || 1,
          preco_unitario: 0,
        }));
      if (prefilled.length > 0) setItens(prefilled);
    }
  }, [requisicao]);

  // Existing orders
  const { data: ordens = [], isLoading } = useQuery({
    queryKey: ["ordens-compra", lojaId],
    enabled: !!lojaId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("compras_ordens")
        .select("*, fornecedores:fornecedor_id(nome)")
        .eq("loja_id", lojaId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const addItem = () => setItens((prev) => [...prev, { descricao: "", quantidade: 1, preco_unitario: 0 }]);
  const removeItem = (idx: number) => setItens((prev) => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof OrdemItem, value: any) => {
    setItens((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };

  const valorTotal = itens.reduce((sum, it) => sum + it.quantidade * it.preco_unitario, 0);

  const salvarOrdem = async (enviar: boolean) => {
    if (!fornecedorId) return toast.error("Selecione um fornecedor");
    if (itens.some((it) => !it.descricao.trim())) return toast.error("Preencha a descrição de todos os itens");
    setSaving(true);
    try {
      const status = enviar
        ? isGerente ? "aprovada" : "aguardando_aprovacao"
        : "rascunho";

      const payload = {
        loja_id: lojaId,
        requisicao_id: requisicaoId || null,
        fornecedor_id: fornecedorId,
        itens,
        valor_total: valorTotal,
        prazo_entrega: prazoEntrega || null,
        condicao_pagamento: condicaoPagamento || null,
        status,
        created_by: user?.id,
        aprovado_por: enviar && isGerente ? user?.id : null,
      };

      const { error } = await sb.from("compras_ordens").insert(payload);
      if (error) throw error;

      toast.success(enviar ? (isGerente ? "Ordem aprovada" : "Ordem enviada para aprovação") : "Rascunho salvo");
      qc.invalidateQueries({ queryKey: ["ordens-compra", lojaId] });
      qc.invalidateQueries({ queryKey: ["historico-compras"] });

      // Reset form
      setFornecedorId("");
      setItens([{ descricao: "", quantidade: 1, preco_unitario: 0 }]);
      setPrazoEntrega("");
      setCondicaoPagamento("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar ordem");
    } finally {
      setSaving(false);
    }
  };

  const aprovarOrdem = async (ordemId: string) => {
    const { error } = await sb
      .from("compras_ordens")
      .update({ status: "aprovada", aprovado_por: user?.id })
      .eq("id", ordemId);
    if (error) return toast.error(error.message);
    toast.success("Ordem aprovada");
    qc.invalidateQueries({ queryKey: ["ordens-compra", lojaId] });
  };

  const rejeitarOrdem = async () => {
    if (!showReject) return;
    const { error } = await sb
      .from("compras_ordens")
      .update({ status: "rejeitada", motivo_rejeicao: motivoRejeicao || null })
      .eq("id", showReject);
    if (error) return toast.error(error.message);
    toast.success("Ordem rejeitada");
    setShowReject(null);
    setMotivoRejeicao("");
    qc.invalidateQueries({ queryKey: ["ordens-compra", lojaId] });
  };

  const concluirOrdem = async (ordemId: string) => {
    const { error } = await sb
      .from("compras_ordens")
      .update({ status: "concluida" })
      .eq("id", ordemId);
    if (error) return toast.error(error.message);
    toast.success("Ordem concluída");
    qc.invalidateQueries({ queryKey: ["ordens-compra", lojaId] });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <FileText size={18} style={{ color: "#1E6FBF" }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: "#0D1117" }}>Ordem de Compra</span>
      </div>

      {/* Form */}
      <div className="rounded-xl bg-white p-5" style={{ border: "0.5px solid #E8ECF2" }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: "#6B7A90", textTransform: "uppercase" }}>
          Nova ordem
        </span>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label style={{ fontSize: 11, color: "#6B7A90" }}>Fornecedor</label>
            <Select value={fornecedorId} onValueChange={setFornecedorId}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Selecionar fornecedor" />
              </SelectTrigger>
              <SelectContent>
                {fornecedores.map((f: any) => (
                  <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#6B7A90" }}>Prazo de entrega</label>
            <Input
              type="date"
              className="h-9 text-sm"
              value={prazoEntrega}
              onChange={(e) => setPrazoEntrega(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-3">
          <label style={{ fontSize: 11, color: "#6B7A90" }}>Condição de pagamento</label>
          <Input
            placeholder="Ex: 30/60/90 dias"
            className="h-9 text-sm"
            value={condicaoPagamento}
            onChange={(e) => setCondicaoPagamento(e.target.value)}
          />
        </div>

        {/* Items */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: 11, color: "#6B7A90", fontWeight: 500, textTransform: "uppercase" }}>Itens</span>
            <Button size="sm" variant="ghost" onClick={addItem}>
              <Plus size={12} className="mr-1" />
              Adicionar item
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {itens.map((it, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  placeholder="Descrição"
                  className="flex-1 h-8 text-xs"
                  value={it.descricao}
                  onChange={(e) => updateItem(idx, "descricao", e.target.value)}
                />
                <Input
                  type="number"
                  min="1"
                  placeholder="Qtd"
                  className="w-20 h-8 text-xs"
                  value={it.quantidade}
                  onChange={(e) => updateItem(idx, "quantidade", parseFloat(e.target.value) || 0)}
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Preço unit."
                  className="w-28 h-8 text-xs"
                  value={it.preco_unitario || ""}
                  onChange={(e) => updateItem(idx, "preco_unitario", parseFloat(e.target.value) || 0)}
                />
                <span style={{ fontSize: 11, color: "#6B7A90", minWidth: 70, textAlign: "right" }}>
                  R$ {(it.quantidade * it.preco_unitario).toFixed(2)}
                </span>
                {itens.length > 1 && (
                  <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <span style={{ fontSize: 14, fontWeight: 600, color: "#0D1117" }}>
              Total: R$ {valorTotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => salvarOrdem(false)} disabled={saving}>
            Salvar rascunho
          </Button>
          <Button onClick={() => salvarOrdem(true)} disabled={saving}>
            <Send size={14} className="mr-1.5" />
            {isGerente ? "Aprovar e salvar" : "Enviar para aprovação"}
          </Button>
        </div>
      </div>

      {/* Existing orders list */}
      <div className="rounded-xl bg-white" style={{ border: "0.5px solid #E8ECF2", overflow: "hidden" }}>
        <div className="px-4 py-3" style={{ borderBottom: "0.5px solid #E8ECF2" }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: "#6B7A90", textTransform: "uppercase" }}>
            Ordens recentes
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: "#F7F9FC" }}>
              <tr>
                {["Nº", "Fornecedor", "Valor", "Prazo", "Status", "Ações"].map((h) => (
                  <th key={h} className="px-4 py-2 text-left" style={{ fontSize: 11, color: "#6B7A90", fontWeight: 500, textTransform: "uppercase" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">Carregando...</td></tr>
              )}
              {!isLoading && ordens.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">Nenhuma ordem criada.</td></tr>
              )}
              {ordens.map((o: any) => {
                const sc = statusColors[o.status] || statusColors.rascunho;
                return (
                  <tr key={o.id} style={{ borderTop: "0.5px solid #E8ECF2" }}>
                    <td className="px-4 py-2 font-mono" style={{ fontSize: 12 }}>#{o.id.slice(0, 6)}</td>
                    <td className="px-4 py-2" style={{ fontSize: 13 }}>{o.fornecedores?.nome ?? "—"}</td>
                    <td className="px-4 py-2" style={{ fontSize: 13, fontWeight: 500 }}>
                      R$ {Number(o.valor_total || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-2" style={{ fontSize: 13 }}>
                      {o.prazo_entrega ? new Date(o.prazo_entrega).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <span className="rounded px-2 py-0.5" style={{ fontSize: 11, fontWeight: 500, backgroundColor: sc.bg, color: sc.text }}>
                        {statusLabels[o.status] || o.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        {o.status === "aguardando_aprovacao" && isGerente && (
                          <>
                            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => aprovarOrdem(o.id)}>
                              <CheckCircle2 size={10} className="mr-0.5" />
                              Aprovar
                            </Button>
                            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 text-red-500" onClick={() => setShowReject(o.id)}>
                              <XCircle size={10} className="mr-0.5" />
                              Rejeitar
                            </Button>
                          </>
                        )}
                        {o.status === "aprovada" && isGerente && (
                          <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => concluirOrdem(o.id)}>
                            Concluir
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject dialog */}
      <Dialog open={!!showReject} onOpenChange={(o) => !o && setShowReject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar ordem de compra</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <label style={{ fontSize: 11, color: "#6B7A90" }}>Motivo da rejeição (opcional)</label>
            <Textarea
              rows={3}
              value={motivoRejeicao}
              onChange={(e) => setMotivoRejeicao(e.target.value)}
              placeholder="Informe o motivo..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReject(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={rejeitarOrdem}>Confirmar rejeição</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
