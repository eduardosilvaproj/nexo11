import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const STATUS_COLORS: Record<string, string> = {
  solicitado: "bg-amber-100 text-amber-700",
  aprovado: "bg-green-100 text-green-700",
  reprovado: "bg-red-100 text-red-700",
  liquidado: "bg-slate-100 text-slate-700",
};

export default function FrotaAbastecimentos() {
  const qc = useQueryClient();
  const { roles } = useAuth();
  const canApprove = roles.some((r) => ["admin", "admin_master", "gerente", "financeiro"].includes(r));
  const [open, setOpen] = useState(false);

  const { data: abast } = useQuery({
    queryKey: ["abastecimentos"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("frota_abastecimentos")
        .select("*, veiculo:veiculos(placa,modelo), posto:frota_postos(nome,bandeira), pessoa:pessoas(nome)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: veiculos } = useQuery({
    queryKey: ["veiculos_min"],
    queryFn: async () => (await (supabase as any).from("veiculos").select("id,placa,modelo,tipo_combustivel")).data || [],
  });

  const { data: postos } = useQuery({
    queryKey: ["postos_min"],
    queryFn: async () => (await (supabase as any).from("frota_postos").select("id,nome,bandeira").eq("ativo", true)).data || [],
  });

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const litros = Number(f.get("litros"));
    const valor = Number(f.get("valor_total"));
    const { data: me } = await (supabase as any).from("pessoas").select("id,loja_id").eq("auth_user_id", (await supabase.auth.getUser()).data.user?.id).single();
    const payload = {
      veiculo_id: f.get("veiculo_id"),
      posto_id: f.get("posto_id") || null,
      litros,
      valor_total: valor,
      preco_por_litro: litros > 0 ? valor / litros : null,
      km_atual: Number(f.get("km_atual")) || null,
      combustivel_tipo: f.get("combustivel_tipo"),
      observacao: f.get("observacao"),
      pessoa_id: me?.id,
      loja_id: me?.loja_id,
      status: "solicitado",
    };
    const { error } = await (supabase as any).from("frota_abastecimentos").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Solicitação enviada");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["abastecimentos"] });
  };

  const decide = async (id: string, status: "aprovado" | "reprovado", motivo?: string) => {
    const { data: me } = await (supabase as any).from("pessoas").select("id").eq("auth_user_id", (await supabase.auth.getUser()).data.user?.id).single();
    const { error } = await (supabase as any)
      .from("frota_abastecimentos")
      .update({
        status,
        aprovado_por: me?.id,
        data_aprovacao: new Date().toISOString(),
        motivo_reprovacao: motivo,
        codigo_autorizacao: status === "aprovado" ? `AUT-${Date.now().toString(36).toUpperCase()}` : null,
      })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Abastecimento ${status}`);
    qc.invalidateQueries({ queryKey: ["abastecimentos"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-1 h-4 w-4" />Solicitar abastecimento</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Solicitar abastecimento</DialogTitle></DialogHeader>
            <form onSubmit={save} className="grid gap-3">
              <div>
                <Label>Veículo</Label>
                <Select name="veiculo_id" required>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(veiculos || []).map((v: any) => (
                      <SelectItem key={v.id} value={v.id}>{v.placa} — {v.modelo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Posto</Label>
                <Select name="posto_id">
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(postos || []).map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome} ({p.bandeira})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Litros</Label><Input name="litros" type="number" step="0.01" required /></div>
                <div><Label>Valor total (R$)</Label><Input name="valor_total" type="number" step="0.01" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>KM atual</Label><Input name="km_atual" type="number" /></div>
                <div>
                  <Label>Combustível</Label>
                  <Select name="combustivel_tipo" defaultValue="gasolina">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gasolina">Gasolina</SelectItem>
                      <SelectItem value="etanol">Etanol</SelectItem>
                      <SelectItem value="diesel">Diesel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Observação</Label><Input name="observacao" /></div>
              <DialogFooter><Button type="submit">Enviar</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Veículo</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead>Posto</TableHead>
                <TableHead>L</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(abast || []).map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="text-xs">{a.data_abastecimento}</TableCell>
                  <TableCell>{a.veiculo?.placa}</TableCell>
                  <TableCell>{a.pessoa?.nome || "—"}</TableCell>
                  <TableCell>{a.posto?.nome || "—"}</TableCell>
                  <TableCell>{Number(a.litros).toFixed(1)}</TableCell>
                  <TableCell>R$ {Number(a.valor_total).toFixed(2)}</TableCell>
                  <TableCell><Badge className={STATUS_COLORS[a.status]}>{a.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    {canApprove && a.status === "solicitado" && (
                      <>
                        <Button size="icon" variant="ghost" onClick={() => decide(a.id, "aprovado")}>
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => {
                          const m = prompt("Motivo da reprovação:");
                          if (m) decide(a.id, "reprovado", m);
                        }}>
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </>
                    )}
                    {a.codigo_autorizacao && (
                      <span className="text-xs font-mono text-green-700">{a.codigo_autorizacao}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(abast || []).length === 0 && (
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-slate-500">Nenhum abastecimento.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
