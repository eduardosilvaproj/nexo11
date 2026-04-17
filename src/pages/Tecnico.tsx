import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, ArrowRight, Loader2, Lock } from "lucide-react";

type Contrato = {
  id: string;
  cliente_nome: string;
  status: string;
  valor_venda: number;
};

type Checklist = {
  id: string;
  contrato_id: string;
  item: string;
  concluido: boolean;
  observacao: string | null;
  data: string | null;
};

const ITENS_PADRAO = [
  "Medição final no local",
  "Conferência de projeto técnico",
  "Validação de materiais e acabamentos",
  "Aprovação do cliente (assinatura técnica)",
  "Liberação para produção",
];

export default function Tecnico() {
  const qc = useQueryClient();
  const [selectedContrato, setSelectedContrato] = useState<string | null>(null);
  const [novoItem, setNovoItem] = useState("");

  const { data: contratos = [], isLoading: loadingContratos } = useQuery({
    queryKey: ["contratos-tecnico"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("id,cliente_nome,status,valor_venda")
        .in("status", ["tecnico", "comercial"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Contrato[];
    },
  });

  const { data: checklist = [], isLoading: loadingCheck } = useQuery({
    queryKey: ["checklist", selectedContrato],
    queryFn: async () => {
      if (!selectedContrato) return [];
      const { data, error } = await supabase
        .from("checklists_tecnicos")
        .select("*")
        .eq("contrato_id", selectedContrato)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Checklist[];
    },
    enabled: !!selectedContrato,
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      if (!selectedContrato) return;
      const rows = ITENS_PADRAO.map((item) => ({
        contrato_id: selectedContrato,
        item,
      }));
      const { error } = await supabase.from("checklists_tecnicos").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checklist", selectedContrato] });
      toast.success("Checklist padrão criado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addMutation = useMutation({
    mutationFn: async (item: string) => {
      if (!selectedContrato) return;
      const { error } = await supabase
        .from("checklists_tecnicos")
        .insert({ contrato_id: selectedContrato, item });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checklist", selectedContrato] });
      setNovoItem("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, concluido }: { id: string; concluido: boolean }) => {
      const { error } = await supabase
        .from("checklists_tecnicos")
        .update({ concluido, data: concluido ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["checklist", selectedContrato] }),
    onError: (e: any) => toast.error(e.message),
  });

  const avancarMutation = useMutation({
    mutationFn: async () => {
      if (!selectedContrato) return;
      const { error } = await supabase
        .from("contratos")
        .update({ status: "producao" })
        .eq("id", selectedContrato);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contrato avançado para Produção");
      qc.invalidateQueries({ queryKey: ["contratos-tecnico"] });
      setSelectedContrato(null);
    },
    onError: (e: any) => {
      if (e.message?.includes("TRAVA_TECNICO")) {
        toast.error("Trava: complete 100% do checklist antes de avançar");
      } else {
        toast.error(e.message);
      }
    },
  });

  const total = checklist.length;
  const concluidos = checklist.filter((c) => c.concluido).length;
  const progresso = total > 0 ? Math.round((concluidos / total) * 100) : 0;
  const podeAvancar = total > 0 && concluidos === total;
  const contratoAtual = contratos.find((c) => c.id === selectedContrato);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">NEXO Técnico</h1>
        <p className="text-sm text-muted-foreground">
          Checklist técnico por contrato. 100% concluído libera para Produção.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contratos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loadingContratos ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : contratos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum contrato em fase técnica.</p>
            ) : (
              contratos.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedContrato(c.id)}
                  className={`w-full rounded-md border p-3 text-left transition-colors ${
                    selectedContrato === c.id
                      ? "border-nexo-blue bg-nexo-blue-bg"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <p className="text-sm font-medium">{c.cliente_nome}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {c.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      R$ {Number(c.valor_venda).toLocaleString("pt-BR")}
                    </span>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">
                  {contratoAtual ? `Checklist · ${contratoAtual.cliente_nome}` : "Selecione um contrato"}
                </CardTitle>
                {contratoAtual && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Status atual: {contratoAtual.status}
                  </p>
                )}
              </div>
              {selectedContrato && (
                <Button
                  size="sm"
                  disabled={!podeAvancar || avancarMutation.isPending || contratoAtual?.status !== "tecnico"}
                  onClick={() => avancarMutation.mutate()}
                >
                  {podeAvancar ? <ArrowRight className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  Avançar para Produção
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedContrato ? (
              <p className="text-sm text-muted-foreground">
                Escolha um contrato à esquerda para ver e editar o checklist.
              </p>
            ) : (
              <>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {concluidos} de {total} concluídos
                    </span>
                    <span
                      className={`font-medium ${
                        progresso === 100
                          ? "text-nexo-green-dark"
                          : progresso >= 50
                          ? "text-nexo-blue"
                          : "text-nexo-amber"
                      }`}
                    >
                      {progresso}%
                    </span>
                  </div>
                  <Progress value={progresso} />
                </div>

                {loadingCheck ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : checklist.length === 0 ? (
                  <div className="rounded-md border border-dashed p-6 text-center">
                    <p className="mb-3 text-sm text-muted-foreground">
                      Nenhum item no checklist ainda.
                    </p>
                    <Button size="sm" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
                      Criar checklist padrão
                    </Button>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {checklist.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-start gap-3 rounded-md border border-border p-3"
                      >
                        <Checkbox
                          checked={c.concluido}
                          onCheckedChange={(v) =>
                            toggleMutation.mutate({ id: c.id, concluido: !!v })
                          }
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <p
                            className={`text-sm ${
                              c.concluido ? "text-muted-foreground line-through" : ""
                            }`}
                          >
                            {c.item}
                          </p>
                          {c.data && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Concluído em {new Date(c.data).toLocaleString("pt-BR")}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex gap-2">
                  <Input
                    placeholder="Adicionar novo item ao checklist..."
                    value={novoItem}
                    onChange={(e) => setNovoItem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && novoItem.trim()) {
                        addMutation.mutate(novoItem.trim());
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => novoItem.trim() && addMutation.mutate(novoItem.trim())}
                    disabled={!novoItem.trim() || addMutation.isPending}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
