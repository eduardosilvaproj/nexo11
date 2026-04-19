import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type Vendedor = { id: string; nome: string };

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clienteId: string;
  clienteNome: string;
  clienteContato?: string | null;
  lojaId: string;
  preselectedOrcamentoId?: string;
  onCreated?: () => void;
}

export function GerarContratoDialog({
  open,
  onOpenChange,
  clienteId,
  clienteNome,
  clienteContato,
  lojaId,
  preselectedOrcamentoId,
  onCreated,
}: Props) {
  const navigate = useNavigate();
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [vendedorId, setVendedorId] = useState<string>("");
  const [dataEntrega, setDataEntrega] = useState("");
  const [descricao, setDescricao] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const [{ data: orcs }, { data: users }] = await Promise.all([
        supabase
          .from("orcamentos")
          .select(
            "id,nome,status,valor_negociado,total_pedido,total_tabela,frete_loja,frete_fabrica,montagem_loja,montagem_fabrica,vendedor_id,contrato_id",
          )
          .eq("cliente_id", clienteId)
          .is("contrato_id", null)
          .eq("status", "aprovado")
          .order("created_at", { ascending: false }),
        supabase
          .from("usuarios_publico")
          .select("id,nome")
          .eq("loja_id", lojaId)
          .order("nome"),
      ]);
      const list = (orcs ?? []) as Orcamento[];
      setOrcamentos(list);
      setVendedores((users ?? []).filter((u): u is Vendedor => !!u.id && !!u.nome));

      const init: Record<string, boolean> = {};
      list.forEach((o) => {
        if (preselectedOrcamentoId && o.id === preselectedOrcamentoId) init[o.id] = true;
        else if (!preselectedOrcamentoId) init[o.id] = true;
      });
      setSelected(init);

      const defaultVend =
        list.find((o) => preselectedOrcamentoId && o.id === preselectedOrcamentoId)?.vendedor_id ??
        list.find((o) => o.vendedor_id)?.vendedor_id ??
        "";
      setVendedorId(defaultVend ?? "");

      const defaultDesc =
        list.find((o) => preselectedOrcamentoId && o.id === preselectedOrcamentoId)?.nome ?? "";
      setDescricao(defaultDesc);

      setLoading(false);
    })();
  }, [open, clienteId, lojaId, preselectedOrcamentoId]);

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
      (s, o) => s + Number(o.total_pedido || 0),
      0,
    );
    const frete = selecionados.reduce(
      (s, o) => s + Number(o.frete_loja || 0),
      0,
    );
    const montagem = selecionados.reduce(
      (s, o) => s + Number(o.montagem_loja || 0),
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

  const unico = orcamentos.length === 1;

  const handleCreate = async () => {
    if (selecionados.length === 0) {
      toast.error("Selecione ao menos um orçamento");
      return;
    }
    if (!descricao.trim()) {
      toast.error("Informe a descrição do contrato");
      return;
    }
    if (!vendedorId) {
      toast.error("Selecione o vendedor");
      return;
    }
    setSaving(true);
    try {
      const { data: contrato, error: e1 } = await supabase
        .from("contratos")
        .insert({
          loja_id: lojaId,
          cliente_nome: clienteNome,
          cliente_contato: clienteContato ?? null,
          valor_venda: totals.valor,
          vendedor_id: vendedorId,
          status: "comercial",
          assinado: false,
        })
        .select("id")
        .single();
      if (e1 || !contrato) throw e1 ?? new Error("Falha ao criar contrato");

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

      const nomes = selecionados.map((o) => o.nome).join(", ");
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        await supabase.from("contrato_logs").insert({
          contrato_id: contrato.id,
          acao: "contrato_gerado",
          titulo: "Contrato gerado a partir do orçamento",
          descricao: nomes,
          autor_id: auth.user.id,
        });
      }

      toast.success("Contrato criado com DRE preenchido ✓");
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
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Gerar contrato — {clienteNome}</DialogTitle>
          {!unico && orcamentos.length > 1 && (
            <p className="text-xs text-muted-foreground pt-1">
              Selecione os orçamentos que entram neste contrato
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : orcamentos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum orçamento aprovado disponível
            </p>
          ) : unico ? (
            <div className="rounded-md border p-3 flex items-center justify-between">
              <span className="text-sm font-medium">{orcamentos[0].nome}</span>
              <span className="text-sm tabular-nums">
                {formatBRL(Number(orcamentos[0].valor_negociado || orcamentos[0].total_pedido || 0))}
              </span>
            </div>
          ) : (
            <div className="space-y-1.5 rounded-md border p-2 max-h-[200px] overflow-auto">
              {orcamentos.map((o) => {
                const valor = Number(o.valor_negociado || o.total_pedido || 0);
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
                    <span className="flex-1 text-sm font-medium truncate">{o.nome}</span>
                    <span className="text-sm tabular-nums">{formatBRL(valor)}</span>
                  </label>
                );
              })}
            </div>
          )}

          <div className="rounded-md border bg-muted/30 p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor de venda</span>
              <span className="font-medium">{formatBRL(totals.valor)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Custo do produto</span>
              <span>{formatBRL(totals.custoProduto)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frete previsto</span>
              <span>{formatBRL(totals.frete)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Montagem prevista</span>
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
            <div>
              <Label htmlFor="vendedor">Vendedor *</Label>
              <Select value={vendedorId} onValueChange={setVendedorId}>
                <SelectTrigger id="vendedor">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {vendedores.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="desc">Descrição *</Label>
            <Textarea
              id="desc"
              rows={2}
              placeholder="Ex: Cozinha + Suite casal"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <Button
            onClick={handleCreate}
            disabled={saving || selecionados.length === 0}
            className="w-full text-white"
            style={{ backgroundColor: "#12B76A" }}
          >
            Criar contrato <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
