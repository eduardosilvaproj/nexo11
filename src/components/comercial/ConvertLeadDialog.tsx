import { useEffect, useState } from "react";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

const schema = z.object({
  cliente_nome: z.string().trim().min(2).max(120),
  cliente_contato: z.string().trim().max(80).optional(),
  valor_venda: z.number().positive("Valor deve ser maior que zero").max(99999999),
  custo_produto_previsto: z.number().min(0).max(99999999),
  custo_montagem_previsto: z.number().min(0).max(99999999),
  custo_frete_previsto: z.number().min(0).max(99999999),
  custo_comissao_previsto: z.number().min(0).max(99999999),
});

interface Props {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toNumber(v: string) {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function ConvertLeadDialog({ lead, open, onOpenChange }: Props) {
  const { perfil, user } = useAuth();
  const queryClient = useQueryClient();
  const [valor, setValor] = useState("0");
  const [cProd, setCProd] = useState("0");
  const [cMont, setCMont] = useState("0");
  const [cFrete, setCFrete] = useState("0");
  const [cComis, setCComis] = useState("0");
  const [contato, setContato] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (lead) {
      setContato(lead.contato ?? "");
      setValor("0");
      setCProd("0");
      setCMont("0");
      setCFrete("0");
      setCComis("0");
      setErrors({});
    }
  }, [lead]);

  const margemPrev = (() => {
    const v = toNumber(valor);
    const total = toNumber(cProd) + toNumber(cMont) + toNumber(cFrete) + toNumber(cComis);
    if (v <= 0) return 0;
    return ((v - total) / v) * 100;
  })();

  const margemTone =
    margemPrev >= 30 ? "text-nexo-green-dark" : margemPrev >= 15 ? "text-nexo-amber" : "text-nexo-red";

  const convert = useMutation({
    mutationFn: async () => {
      if (!lead || !perfil?.loja_id) throw new Error("Lead ou loja inválida");

      const payload = {
        cliente_nome: lead.nome,
        cliente_contato: contato || undefined,
        valor_venda: toNumber(valor),
        custo_produto_previsto: toNumber(cProd),
        custo_montagem_previsto: toNumber(cMont),
        custo_frete_previsto: toNumber(cFrete),
        custo_comissao_previsto: toNumber(cComis),
      };

      const parsed = schema.safeParse(payload);
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        parsed.error.issues.forEach((i) => {
          errs[i.path[0] as string] = i.message;
        });
        setErrors(errs);
        throw new Error("validação");
      }

      const { data: contrato, error: cErr } = await supabase
        .from("contratos")
        .insert({
          cliente_nome: parsed.data.cliente_nome,
          cliente_contato: parsed.data.cliente_contato ?? null,
          valor_venda: parsed.data.valor_venda,
          loja_id: perfil.loja_id,
          vendedor_id: user?.id ?? lead.vendedor_id ?? null,
          status: "comercial",
          assinado: false,
        })
        .select("id")
        .single();
      if (cErr) throw cErr;

      const { error: dreErr } = await supabase
        .from("dre_contrato")
        .update({
          custo_produto_previsto: parsed.data.custo_produto_previsto,
          custo_montagem_previsto: parsed.data.custo_montagem_previsto,
          custo_frete_previsto: parsed.data.custo_frete_previsto,
          custo_comissao_previsto: parsed.data.custo_comissao_previsto,
        })
        .eq("contrato_id", contrato.id);
      if (dreErr) throw dreErr;

      const { error: leadErr } = await supabase
        .from("leads")
        .update({ status: "convertido", data_ultimo_contato: new Date().toISOString() })
        .eq("id", lead.id);
      if (leadErr) throw leadErr;
    },
    onSuccess: () => {
      toast({
        title: "Contrato criado",
        description: "Lead convertido com sucesso. Margem prevista calculada.",
      });
      queryClient.invalidateQueries({ queryKey: ["leads", perfil?.loja_id] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      if (err.message !== "validação") {
        toast({
          title: "Erro na conversão",
          description: err.message,
          variant: "destructive",
        });
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Converter lead em contrato</DialogTitle>
          <DialogDescription>
            {lead?.nome} — informe o valor de venda e custos previstos.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2">
            <Label htmlFor="conv-contato">Contato</Label>
            <Input
              id="conv-contato"
              value={contato}
              onChange={(e) => setContato(e.target.value)}
              maxLength={80}
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor="conv-valor">Valor de venda (R$) *</Label>
            <Input
              id="conv-valor"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
            {errors.valor_venda && (
              <p className="mt-1 text-xs text-nexo-red">{errors.valor_venda}</p>
            )}
          </div>
          <div>
            <Label htmlFor="conv-prod">Custo produto</Label>
            <Input id="conv-prod" inputMode="decimal" value={cProd} onChange={(e) => setCProd(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="conv-mont">Custo montagem</Label>
            <Input id="conv-mont" inputMode="decimal" value={cMont} onChange={(e) => setCMont(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="conv-frete">Custo frete</Label>
            <Input id="conv-frete" inputMode="decimal" value={cFrete} onChange={(e) => setCFrete(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="conv-com">Custo comissão</Label>
            <Input id="conv-com" inputMode="decimal" value={cComis} onChange={(e) => setCComis(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border border-nexo-border bg-nexo-bg-light px-3 py-2">
          <span className="text-sm text-muted-foreground">Margem prevista</span>
          <span className={`text-lg font-bold ${margemTone}`}>{margemPrev.toFixed(1)}%</span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="bg-nexo-blue hover:bg-nexo-blue-dark"
            onClick={() => convert.mutate()}
            disabled={convert.isPending}
          >
            {convert.isPending ? "Convertendo..." : "Criar contrato"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
