import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import CondicaoPagamentoDialog, { Condicao } from "@/components/configuracoes/CondicaoPagamentoDialog";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const EXEMPLO_BASE = 3000;

export default function ConfigPagamento() {
  const { perfil, hasRole } = useAuth();
  const podeEditar = hasRole("admin") || hasRole("gerente");
  const [rows, setRows] = useState<Condicao[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Condicao | null>(null);

  const load = async () => {
    if (!perfil?.loja_id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("condicoes_pagamento")
      .select("*")
      .order("ordem", { ascending: true })
      .order("parcelas", { ascending: true });
    if (error) {
      toast.error("Erro ao carregar condições");
    } else {
      setRows((data ?? []) as Condicao[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.loja_id]);

  const toggleAtivo = async (c: Condicao) => {
    const { error } = await supabase
      .from("condicoes_pagamento")
      .update({ ativo: !c.ativo })
      .eq("id", c.id);
    if (error) toast.error("Erro ao atualizar");
    else {
      toast.success(!c.ativo ? "Condição ativada" : "Condição desativada");
      load();
    }
  };

  const exemplos = useMemo(
    () =>
      rows.map((c) => {
        const total = EXEMPLO_BASE * (1 + Number(c.taxa || 0) / 100);
        const parcela = c.parcelas > 0 ? total / c.parcelas : total;
        return { id: c.id, total, parcela };
      }),
    [rows],
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Condições de Pagamento</h1>
          <p className="text-sm text-muted-foreground">
            Taxas financeiras por forma de parcelamento
          </p>
        </div>
        {podeEditar && (
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="bg-[#1E6FBF] hover:bg-[#1A5FA8] text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova condição
          </Button>
        )}
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Ordem</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="w-24">Parcelas</TableHead>
              <TableHead className="w-24">Taxa %</TableHead>
              <TableHead>Valor exemplo (R$ 3.000)</TableHead>
              <TableHead className="w-20">Ativo</TableHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Nenhuma condição cadastrada
                </TableCell>
              </TableRow>
            ) : (
              rows.map((c) => {
                const ex = exemplos.find((e) => e.id === c.id);
                return (
                  <TableRow key={c.id}>
                    <TableCell>{c.ordem ?? 0}</TableCell>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell>{c.parcelas}x</TableCell>
                    <TableCell>{Number(c.taxa).toFixed(1)}%</TableCell>
                    <TableCell>
                      {ex && (
                        <div className="flex flex-col">
                          <span>{fmt(ex.total)}</span>
                          {c.parcelas > 1 && (
                            <span className="text-xs text-muted-foreground">
                              {fmt(ex.parcela)}/parcela
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={c.ativo}
                        onCheckedChange={() => podeEditar && toggleAtivo(c)}
                        disabled={!podeEditar}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {podeEditar && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(c);
                            setOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CondicaoPagamentoDialog
        open={open}
        onOpenChange={setOpen}
        condicao={editing}
        lojaId={perfil?.loja_id ?? null}
        onSaved={load}
      />
    </div>
  );
}
