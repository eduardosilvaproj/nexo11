import { useMemo, useState } from "react";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const labelStyle: React.CSSProperties = { fontSize: 12, color: "#6B7A90", fontWeight: 500 };

function fieldStyle(invalid: boolean): React.CSSProperties {
  return {
    width: "100%",
    fontSize: 13,
    color: "#0D1117",
    background: "#FFFFFF",
    border: `1px solid ${invalid ? "#E53935" : "#E8ECF2"}`,
    borderRadius: 8,
    padding: "8px 10px",
    outline: "none",
    height: 36,
  };
}

function moneyToNumber(s: string): number {
  if (!s) return 0;
  const cleaned = s.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const n = Number(cleaned);
  return isNaN(n) ? 0 : n;
}

function MoneyInput({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
}) {
  return (
    <div className="relative">
      <span
        className="absolute left-3 top-1/2 -translate-y-1/2"
        style={{ fontSize: 13, color: "#6B7A90" }}
      >
        R$
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
        placeholder="0,00"
        style={{ ...fieldStyle(!!invalid), paddingLeft: 32 }}
      />
    </div>
  );
}

const schema = z.object({
  cliente_nome: z.string().trim().min(2, "Cliente obrigatório").max(120),
  vendedor_id: z.string().uuid("Vendedor obrigatório"),
  valor_venda: z.number().positive("Valor obrigatório"),
});

export function ContratoFormDialog({ open, onOpenChange }: Props) {
  const { perfil } = useAuth();
  const queryClient = useQueryClient();

  const [clienteNome, setClienteNome] = useState("");
  const [vendedorId, setVendedorId] = useState("");
  const [valorVenda, setValorVenda] = useState("");
  const [dataEntrega, setDataEntrega] = useState<Date | undefined>();
  const [descricao, setDescricao] = useState("");

  const [custoProduto, setCustoProduto] = useState("");
  const [custoMontagem, setCustoMontagem] = useState("");
  const [custoFrete, setCustoFrete] = useState("");
  const [custoComissao, setCustoComissao] = useState("");
  const [outrosCustos, setOutrosCustos] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: vendedores = [] } = useQuery({
    queryKey: ["usuarios-loja", perfil?.loja_id],
    enabled: !!perfil?.loja_id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nome")
        .eq("loja_id", perfil!.loja_id!)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-existentes", perfil?.loja_id],
    enabled: !!perfil?.loja_id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("cliente_nome")
        .order("cliente_nome");
      if (error) throw error;
      const set = new Set((data ?? []).map((c) => c.cliente_nome).filter(Boolean));
      return Array.from(set);
    },
  });

  const valorNum = useMemo(() => moneyToNumber(valorVenda), [valorVenda]);
  const totalCustos = useMemo(
    () =>
      moneyToNumber(custoProduto) +
      moneyToNumber(custoMontagem) +
      moneyToNumber(custoFrete) +
      moneyToNumber(custoComissao) +
      moneyToNumber(outrosCustos),
    [custoProduto, custoMontagem, custoFrete, custoComissao, outrosCustos],
  );
  const margem = valorNum > 0 ? ((valorNum - totalCustos) / valorNum) * 100 : null;
  const margemColor = margem == null ? "#B0BAC9" : margem >= 30 ? "#12B76A" : margem >= 15 ? "#E8A020" : "#E53935";
  const margemBg = margem == null ? "#F5F7FA" : margem >= 30 ? "#E0F7EC" : margem >= 15 ? "#FCEFD2" : "#FDECEC";

  const reset = () => {
    setClienteNome("");
    setVendedorId("");
    setValorVenda("");
    setDataEntrega(undefined);
    setDescricao("");
    setCustoProduto("");
    setCustoMontagem("");
    setCustoFrete("");
    setCustoComissao("");
    setOutrosCustos("");
    setErrors({});
  };

  const create = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse({
        cliente_nome: clienteNome,
        vendedor_id: vendedorId,
        valor_venda: valorNum,
      });
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        parsed.error.issues.forEach((i) => (errs[i.path[0] as string] = i.message));
        setErrors(errs);
        throw new Error("validacao");
      }
      if (!perfil?.loja_id) throw new Error("Sem loja vinculada");

      const { data: contrato, error } = await supabase
        .from("contratos")
        .insert({
          cliente_nome: parsed.data.cliente_nome,
          vendedor_id: parsed.data.vendedor_id,
          valor_venda: parsed.data.valor_venda,
          loja_id: perfil.loja_id,
          status: "comercial",
        })
        .select("id")
        .single();
      if (error) throw error;

      // Atualiza DRE com custos previstos (linha já criada via trigger contrato_sync_dre)
      const { error: dreErr } = await supabase
        .from("dre_contrato")
        .update({
          custo_produto_previsto: moneyToNumber(custoProduto),
          custo_montagem_previsto: moneyToNumber(custoMontagem),
          custo_frete_previsto: moneyToNumber(custoFrete),
          custo_comissao_previsto: moneyToNumber(custoComissao),
          outros_custos_previstos: moneyToNumber(outrosCustos),
        })
        .eq("contrato_id", contrato.id);
      if (dreErr) throw dreErr;
    },
    onSuccess: () => {
      toast({ title: "Contrato criado", description: "Adicionado em 'Comercial'." });
      queryClient.invalidateQueries({ queryKey: ["contratos-table", perfil?.loja_id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      reset();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      if (err.message !== "validacao") {
        toast({ title: "Erro ao criar contrato", description: err.message, variant: "destructive" });
      }
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle style={{ fontSize: 16, fontWeight: 600, color: "#0D1117" }}>
            Novo contrato
          </DialogTitle>
          <DialogDescription style={{ fontSize: 13, color: "#6B7A90" }}>
            Cadastre os dados do contrato e os custos previstos.
          </DialogDescription>
        </DialogHeader>

        {/* SEÇÃO 1 */}
        <div className="space-y-3">
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "#0D1117" }}>Dados do contrato</h3>

          <div>
            <label style={labelStyle}>Cliente *</label>
            <input
              type="text"
              value={clienteNome}
              onChange={(e) => setClienteNome(e.target.value)}
              list="clientes-list"
              placeholder="Buscar ou digitar novo cliente"
              maxLength={120}
              style={fieldStyle(!!errors.cliente_nome)}
              className="mt-1"
            />
            <datalist id="clientes-list">
              {clientes.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            {errors.cliente_nome && (
              <p className="mt-1" style={{ fontSize: 11, color: "#E53935" }}>{errors.cliente_nome}</p>
            )}
          </div>

          <div>
            <label style={labelStyle}>Vendedor responsável *</label>
            <select
              value={vendedorId}
              onChange={(e) => setVendedorId(e.target.value)}
              style={fieldStyle(!!errors.vendedor_id)}
              className="mt-1"
            >
              <option value="">Selecione...</option>
              {vendedores.map((v) => (
                <option key={v.id} value={v.id}>{v.nome}</option>
              ))}
            </select>
            {errors.vendedor_id && (
              <p className="mt-1" style={{ fontSize: 11, color: "#E53935" }}>{errors.vendedor_id}</p>
            )}
          </div>

          <div>
            <label style={labelStyle}>Valor da venda *</label>
            <div className="mt-1">
              <MoneyInput value={valorVenda} onChange={setValorVenda} invalid={!!errors.valor_venda} />
            </div>
            {errors.valor_venda && (
              <p className="mt-1" style={{ fontSize: 11, color: "#E53935" }}>{errors.valor_venda}</p>
            )}
          </div>

          <div>
            <label style={labelStyle}>Data prevista de entrega</label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "mt-1 inline-flex w-full items-center justify-between text-left",
                  )}
                  style={fieldStyle(false)}
                >
                  <span style={{ color: dataEntrega ? "#0D1117" : "#B0BAC9" }}>
                    {dataEntrega ? format(dataEntrega, "dd/MM/yyyy") : "Selecione a data"}
                  </span>
                  <CalendarIcon className="h-4 w-4" style={{ color: "#6B7A90" }} />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dataEntrega}
                  onSelect={setDataEntrega}
                  initialFocus
                  className={cn("pointer-events-auto p-3")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <label style={labelStyle}>Descrição / ambiente</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: Cozinha + sala + quarto casal"
              maxLength={1000}
              rows={3}
              style={{ ...fieldStyle(false), height: "auto", resize: "vertical", fontFamily: "inherit" }}
              className="mt-1"
            />
          </div>
        </div>

        {/* SEÇÃO 2 */}
        <div className="mt-4 space-y-3">
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: "#0D1117" }}>Custos previstos</h3>
            <p style={{ fontSize: 12, color: "#6B7A90" }}>Estimativa de custos — base do DRE</p>
          </div>

          {[
            { label: "Custo do produto", v: custoProduto, set: setCustoProduto },
            { label: "Custo de montagem", v: custoMontagem, set: setCustoMontagem },
            { label: "Custo de frete", v: custoFrete, set: setCustoFrete },
            { label: "Comissão", v: custoComissao, set: setCustoComissao },
            { label: "Outros custos", v: outrosCustos, set: setOutrosCustos },
          ].map((row) => (
            <div key={row.label}>
              <label style={labelStyle}>{row.label}</label>
              <div className="mt-1">
                <MoneyInput value={row.v} onChange={row.set} />
              </div>
            </div>
          ))}

          {/* Card resultado margem */}
          <div
            className="mt-2 flex items-center justify-between"
            style={{
              background: margemBg,
              border: `1px solid ${margemColor}33`,
              borderRadius: 10,
              padding: "12px 14px",
            }}
          >
            <div>
              <p style={{ fontSize: 12, color: "#6B7A90" }}>Margem prevista</p>
              <p style={{ fontSize: 11, color: "#6B7A90" }}>
                Valor − custos / valor × 100
              </p>
            </div>
            <p style={{ fontSize: 22, fontWeight: 600, color: margemColor }}>
              {margem != null ? `${margem.toFixed(1)}%` : "—"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 transition-colors hover:bg-[#F5F7FA]"
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#6B7A90",
              background: "#FFFFFF",
              border: "1px solid #E8ECF2",
              borderRadius: 8,
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => create.mutate()}
            disabled={create.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-white transition-colors hover:bg-[#0B4A8A] disabled:opacity-60"
            style={{ fontSize: 13, fontWeight: 500, background: "#1E6FBF", borderRadius: 8 }}
          >
            {create.isPending ? "Criando..." : "Criar contrato"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
