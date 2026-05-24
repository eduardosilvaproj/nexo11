import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, Clock, AlertCircle, Paperclip } from "lucide-react";
import OperationalAttachments from "@/components/operacional/OperationalAttachments";
import { useAuth } from "@/contexts/AuthContext";
import { canPerform } from "@/lib/permissions";

interface Props {
  contratoId: string;
}

const formatBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

export function ContratoFinanceiroTab({ contratoId }: Props) {
  const { data: receber, isLoading: loadingR } = useQuery({
    queryKey: ["contrato_receber", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financeiro_contas_receber")
        .select("*")
        .eq("contrato_id", contratoId)
        .order("vencimento", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: pagar, isLoading: loadingP } = useQuery({
    queryKey: ["contrato_pagar", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financeiro_contas_pagar")
        .select("*")
        .eq("contrato_id", contratoId)
        .order("vencimento", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  if (loadingR || loadingP) return <div className="p-8 text-center text-muted-foreground">Carregando dados financeiros...</div>;

  const totalReceber = (receber ?? []).reduce((s, r) => s + (r.status !== 'cancelado' ? Number(r.valor) : 0), 0);
  const totalRecebido = (receber ?? []).reduce((s, r) => s + (r.status === 'pago' ? Number(r.valor) : 0), 0);
  const totalAtrasado = (receber ?? []).reduce((s, r) => {
    const hoje = new Date().toISOString().slice(0, 10);
    return s + (r.status === 'pendente' && r.vencimento < hoje ? Number(r.valor) : 0);
  }, 0);
  const totalPagar = (pagar ?? []).reduce((s, r) => s + (r.status !== 'cancelado' ? Number(r.valor) : 0), 0);
  const totalPago = (pagar ?? []).reduce((s, r) => s + (r.status === 'pago' ? Number(r.valor) : 0), 0);

  const StatusIcon = ({ status, vencimento }: { status: string; vencimento: string }) => {
    const hoje = new Date().toISOString().slice(0, 10);
    if (status === 'pago') return <Check className="h-4 w-4 text-emerald-500" />;
    if (status === 'cancelado') return <span className="text-xs text-slate-400">Cancelado</span>;
    if (vencimento < hoje) return <AlertCircle className="h-4 w-4 text-rose-500" />;
    return <Clock className="h-4 w-4 text-amber-500" />;
  };

  const EmptyState = () => (
    <div className="py-12 text-center border-2 border-dashed rounded-lg bg-slate-50/50">
      <p className="text-sm text-muted-foreground">Este contrato ainda não possui lançamentos financeiros vinculados.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-5">
        <Card className="bg-emerald-50/50 border-emerald-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Total Recebido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-emerald-700">{formatBRL(totalRecebido)}</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50/50 border-amber-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Saldo a Receber</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-amber-700">{formatBRL(totalReceber - totalRecebido)}</p>
          </CardContent>
        </Card>
        <Card className="bg-rose-50/50 border-rose-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Total Atrasado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-rose-700">{formatBRL(totalAtrasado)}</p>
          </CardContent>
        </Card>
        <Card className="bg-rose-50/50 border-rose-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Total Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-rose-700">{formatBRL(totalPago)}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-50 border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Margem Realizada</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-slate-900">
              {totalRecebido > 0 
                ? `${(((totalRecebido - totalPago) / totalRecebido) * 100).toFixed(1).replace('.', ',')}%`
                : "Sem recebimentos"
              }
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Contas a Receber</CardTitle>
          </CardHeader>
          <CardContent>
            {(!receber || receber.length === 0) ? <EmptyState /> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parcela</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receber.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs font-medium">{r.descricao}</TableCell>
                      <TableCell className="text-xs text-slate-500">{new Date(r.vencimento).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right text-xs font-bold">{formatBRL(Number(r.valor))}</TableCell>
                      <TableCell><StatusIcon status={r.status} vencimento={r.vencimento} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Contas a Pagar</CardTitle>
          </CardHeader>
          <CardContent>
            {(!pagar || pagar.length === 0) ? <EmptyState /> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagar.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs font-medium">{p.categoria}</TableCell>
                      <TableCell className="text-xs text-slate-500">{new Date(p.vencimento).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right text-xs font-bold text-rose-600">{formatBRL(Number(p.valor))}</TableCell>
                      <TableCell><StatusIcon status={p.status} vencimento={p.vencimento} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
