import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

type Orcamento = {
  id: string;
  nome: string;
  status: string | null;
  valor_negociado: number | null;
  total_pedido: number | null;
  total_tabela: number | null;
  frete_loja: number | null;
  frete_fabrica: number | null;
  montagem_loja: number | null;
  montagem_fabrica: number | null;
  vendedor_id: string | null;
  contrato_id: string | null;
};

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clienteId: string;
  clienteNome: string;
  lojaId: string;
  preselectedOrcamentoId?: string;
  onCreated?: () => void;
}

export function GerarContratoDialog({
  open,
  onOpenChange,
  clienteId,
  clienteNome,
  lojaId,
  preselectedOrcamentoId,
  onCreated,
}: Props) {
  const navigate = useNavigate();
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [dataEntrega, setDataEntrega] = useState("");
  const [descricao, setDescricao] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("orcamentos")
        .select(
          "id,nome,status,valor_negociado,total_pedido,total_tabela,frete_loja,frete_fabrica,montagem_loja,montagem_fabrica,vendedor_id,contrato_id",
        )
        .eq("cliente_id", clienteId)
        .is("contrato_id", null)
        .order("created_at", { ascending: false });
      const list = (data ?? []) as Orcamento[];
      setOrcamentos(list);
      const init: Record<string, boolean> = {};
      list.forEach((o) => {
        if (preselectedOrcamentoId && o.id === preselectedOrcamentoId) init[o.id] = true;
        else if (!preselectedOrcamentoId && o.status === "aprovado") init[o.id] = true;
      });
      setSelected(init);
      setLoading(false);
    })();
  }, [open, clienteId, preselectedOrcamentoId]);

  const selecionados = useMemo(
    () => orcamentos.filter((o) => selected[o.id]),
    [orcamentos, selected],
  );

  const totals = useMemo(() => {
    const valor = selecionados.reduce(
      (s, o) => s + Number(o.valor_negociado || o.total_pedido || 0),
      0,
    );
    const custoProduto = selecionados.reduce(
      (s, o) => s + Number(o.total_tabela || 0),
      0,
    );
    const frete = selecionados.reduce(
      (s, o) => s + Number(o.frete_loja || 0) + Number(o.frete_fabrica || 0),
      0,
    );
    const montagem = selecionados.reduce(
      (s, o) => s + Number(o.montagem_loja || 0) + Number(o.montagem_fabrica || 0),
      0,
    );
    const margem = valor > 0 ? ((valor - custoProduto - frete - montagem) / valor) * 100 : 0;
    return { valor, custoProduto, frete, montagem, margem };
  }, [selecionados]);

  const margemColor =
    totals.margem >= 30
      ? "text-emerald-600"
      : totals.margem >= 15
      ? "text-amber-600"
      : "text-destructive";

  const handleCreate = async () => {
    if (selecionados.length === 0) {
      toast.error("Selecione ao menos um orçamento");
      return;
    }
    setSaving(true);
    try {
      const vendedorId = selecionados.find((o) => o.vendedor_id)?.vendedor_id ?? null;

      const { data: contrato, error: e1 } = await supabase
        .from("contratos")
        .insert({
          loja_id: lojaId,
          cliente_nome: clienteNome,
          valor_venda: totals.valor,
          vendedor_id: vendedorId,
        })
        .select("id")
        .single();
      if (e1 || !contrato) throw e1 ?? new Error("Falha ao criar contrato");

      // O trigger contrato_sync_dre cria a linha em dre_contrato; atualizamos os custos previstos
      const { error: e2 } = await supabase
        .from("dre_contrato")
        .update({
          valor_venda: totals.valor,
          custo_produto_previsto: totals.custoProduto,
          custo_frete_previsto: totals.frete,
          custo_montagem_previsto: totals.montagem,
        })
        .eq("contrato_id", contrato.id);
      if (e2) throw e2;

      const ids = selecionados.map((o) => o.id);
      const { error: e3 } = await supabase
        .from("orcamentos")
        .update({ status: "convertido", contrato_id: contrato.id })
        .in("id", ids);
      if (e3) throw e3;

      toast.success("Contrato gerado com DRE preenchido ✓");
      onOpenChange(false);
      onCreated?.();
      navigate(`/contratos/${contrato.id}`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar contrato");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Gerar contrato — {clienteNome}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">
              Selecione os orçamentos que entrarão no contrato
            </Label>
            <div className="mt-2 space-y-2 rounded-md border p-2 max-h-[240px] overflow-auto">
              {loading ? (
                <p className="text-sm text-muted-foreground p-2">Carregando...</p>
              ) : orcamentos.length === 0 ? (
                <p className="text-sm text-muted-foreground p-2">
                  Nenhum orçamento disponível
                </p>
              ) : (
                orcamentos.map((o) => {
                  const valor = Number(o.valor_negociado || o.total_pedido || 0);
                  const statusLabel =
                    o.status === "aprovado"
                      ? "Aprovado"
                      : o.status === "enviado"
                      ? "Enviado"
                      : o.status === "recusado"
                      ? "Recusado"
                      : "Rascunho";
                  return (
                    <label
                      key={o.id}
                      className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={!!selected[o.id]}
                        onCheckedChange={(v) =>
                          setSelected((s) => ({ ...s, [o.id]: !!v }))
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{o.nome}</p>
                      </div>
                      <span className="text-sm tabular-nums">{formatBRL(valor)}</span>
                      <Badge variant="secondary" className="text-[11px]">
                        {statusLabel}
                      </Badge>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-md border bg-muted/30 p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor total</span>
              <span className="font-medium">{formatBRL(totals.valor)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Custo do produto</span>
              <span>{formatBRL(totals.custoProduto)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frete</span>
              <span>{formatBRL(totals.frete)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Montagem</span>
              <span>{formatBRL(totals.montagem)}</span>
            </div>
            <div className="flex justify-between border-t pt-1.5 mt-1.5">
              <span className="text-muted-foreground">Margem prevista</span>
              <span className={`font-medium ${margemColor}`}>
                {totals.margem.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="data-entrega">Data prevista entrega</Label>
              <Input
                id="data-entrega"
                type="date"
                value={dataEntrega}
                onChange={(e) => setDataEntrega(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="desc">Descrição do contrato</Label>
            <Textarea
              id="desc"
              rows={2}
              placeholder="Ex: Cozinha + Suite casal"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={saving || selecionados.length === 0}
            className="bg-emerald-600 hover:bg-emerald-600/90 text-white"
          >
            Criar contrato <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
