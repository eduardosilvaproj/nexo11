import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, ArrowRight, Factory, CheckCircle2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type OpStatus = Database["public"]["Enums"]["op_status"];

type Contrato = {
  id: string;
  cliente_nome: string;
  status: string;
  valor_venda: number;
};

type OP = {
  id: string;
  contrato_id: string;
  status: OpStatus;
  custo_real: number | null;
  data_inicio: string | null;
  data_previsao: string | null;
  data_conclusao: string | null;
  itens_json: any;
};

const STATUS_FLOW: Record<OpStatus, OpStatus | null> = {
  aguardando: "em_corte",
  em_corte: "em_montagem",
  em_montagem: "concluido",
  concluido: null,
};

const STATUS_LABEL: Record<OpStatus, string> = {
  aguardando: "Aguardando",
  em_corte: "Em corte",
  em_montagem: "Em montagem",
  concluido: "Concluído",
};

const STATUS_BADGE: Record<OpStatus, string> = {
  aguardando: "bg-nexo-gray-light text-nexo-gray-dark",
  em_corte: "bg-nexo-amber-light text-nexo-amber",
  em_montagem: "bg-nexo-blue-bg text-nexo-blue",
  concluido: "bg-nexo-green-light text-nexo-green-dark",
};

export default function Producao() {
  const qc = useQueryClient();
  const [novaOpContrato, setNovaOpContrato] = useState<string>("");
  const [openNova, setOpenNova] = useState(false);
  const [custoEditando, setCustoEditando] = useState<{ id: string; valor: string } | null>(null);

  const { data: contratos = [] } = useQuery({
    queryKey: ["contratos-producao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("id,cliente_nome,status,valor_venda")
        .in("status", ["producao", "tecnico"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Contrato[];
    },
  });

  const { data: ops = [], isLoading } = useQuery({
    queryKey: ["ordens-producao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordens_producao")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as OP[];
    },
  });

  const criarOP = useMutation({
    mutationFn: async (contrato_id: string) => {
      const { error } = await supabase
        .from("ordens_producao")
        .insert({ contrato_id, status: "aguardando", data_inicio: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ordens-producao"] });
      setOpenNova(false);
      setNovaOpContrato("");
      toast.success("Ordem de produção criada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const avancarStatus = useMutation({
    mutationFn: async (op: OP) => {
      const proximo = STATUS_FLOW[op.status];
      if (!proximo) return;
      const updates: any = { status: proximo };
      if (proximo === "concluido") updates.data_conclusao = new Date().toISOString();
      const { error } = await supabase.from("ordens_producao").update(updates).eq("id", op.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ordens-producao"] });
      toast.success("Status atualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const salvarCusto = useMutation({
    mutationFn: async ({ id, valor }: { id: string; valor: number }) => {
      const { error } = await supabase
        .from("ordens_producao")
        .update({ custo_real: valor })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ordens-producao"] });
      setCustoEditando(null);
      toast.success("Custo real registrado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const contratosSemOP = contratos.filter((c) => !ops.some((o) => o.contrato_id === c.id));
  const contratoNome = (id: string) =>
    contratos.find((c) => c.id === id)?.cliente_nome ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">NEXO Produção</h1>
          <p className="text-sm text-muted-foreground">
            Ordens de produção por contrato. Conclusão libera para Logística.
          </p>
        </div>

        <Dialog open={openNova} onOpenChange={setOpenNova}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Nova OP
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova ordem de produção</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Contrato</Label>
              {contratosSemOP.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Todos os contratos elegíveis já têm OP.
                </p>
              ) : (
                <select
                  className="w-full rounded-md border border-input bg-background p-2 text-sm"
                  value={novaOpContrato}
                  onChange={(e) => setNovaOpContrato(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {contratosSemOP.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.cliente_nome} · R$ {Number(c.valor_venda).toLocaleString("pt-BR")}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <DialogFooter>
              <Button
                onClick={() => criarOP.mutate(novaOpContrato)}
                disabled={!novaOpContrato || criarOP.isPending}
              >
                Criar OP
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ordens de produção</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : ops.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Factory className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Nenhuma ordem de produção ainda. Crie uma a partir de um contrato.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {ops.map((op) => {
                const proximo = STATUS_FLOW[op.status];
                const isEditing = custoEditando?.id === op.id;
                return (
                  <div
                    key={op.id}
                    className="flex flex-col gap-3 rounded-md border border-border p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{contratoNome(op.contrato_id)}</p>
                        <Badge className={STATUS_BADGE[op.status]} variant="secondary">
                          {STATUS_LABEL[op.status]}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {op.data_inicio
                          ? `Iniciada em ${new Date(op.data_inicio).toLocaleDateString("pt-BR")}`
                          : "Sem início"}
                        {op.data_conclusao &&
                          ` · Concluída em ${new Date(op.data_conclusao).toLocaleDateString("pt-BR")}`}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {isEditing ? (
                        <>
                          <Input
                            type="number"
                            placeholder="Custo R$"
                            className="h-9 w-32"
                            value={custoEditando.valor}
                            onChange={(e) =>
                              setCustoEditando({ ...custoEditando, valor: e.target.value })
                            }
                          />
                          <Button
                            size="sm"
                            onClick={() =>
                              salvarCusto.mutate({
                                id: op.id,
                                valor: parseFloat(custoEditando.valor) || 0,
                              })
                            }
                            disabled={salvarCusto.isPending}
                          >
                            Salvar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setCustoEditando(null)}>
                            Cancelar
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setCustoEditando({
                              id: op.id,
                              valor: op.custo_real?.toString() ?? "",
                            })
                          }
                        >
                          {op.custo_real != null
                            ? `Custo: R$ ${Number(op.custo_real).toLocaleString("pt-BR")}`
                            : "Registrar custo"}
                        </Button>
                      )}

                      {proximo ? (
                        <Button
                          size="sm"
                          onClick={() => avancarStatus.mutate(op)}
                          disabled={avancarStatus.isPending}
                        >
                          <ArrowRight className="h-4 w-4" />
                          {STATUS_LABEL[proximo]}
                        </Button>
                      ) : (
                        <Badge className="bg-nexo-green-light text-nexo-green-dark" variant="secondary">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Finalizada
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
