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
import { Plus } from "lucide-react";
import { toast } from "sonner";

export default function FrotaMultas() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: multas } = useQuery({
    queryKey: ["multas"],
    queryFn: async () => (await (supabase as any).from("frota_multas").select("*, veiculo:veiculos(placa), pessoa:pessoas(nome)").order("data_infracao", { ascending: false })).data || [],
  });
  const { data: veiculos } = useQuery({
    queryKey: ["veiculos_m"],
    queryFn: async () => (await (supabase as any).from("veiculos").select("id,placa")).data || [],
  });
  const { data: pessoas } = useQuery({
    queryKey: ["pessoas_m"],
    queryFn: async () => (await (supabase as any).from("pessoas").select("id,nome").order("nome")).data || [],
  });

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload: any = {
      veiculo_id: f.get("veiculo_id"),
      pessoa_id: f.get("pessoa_id") || null,
      numero_auto: f.get("numero_auto"),
      data_infracao: f.get("data_infracao"),
      local_infracao: f.get("local_infracao"),
      tipo_infracao: f.get("tipo_infracao"),
      gravidade: f.get("gravidade"),
      valor: Number(f.get("valor")) || null,
      pontos: Number(f.get("pontos")) || null,
      status: f.get("status"),
    };
    const { error } = await (supabase as any).from("frota_multas").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Multa registrada");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["multas"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />Nova multa</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nova multa</DialogTitle></DialogHeader>
            <form onSubmit={save} className="grid gap-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Veículo</Label>
                  <Select name="veiculo_id" required>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{(veiculos || []).map((v: any) => <SelectItem key={v.id} value={v.id}>{v.placa}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Condutor</Label>
                  <Select name="pessoa_id">
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>{(pessoas || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Nº auto</Label><Input name="numero_auto" /></div>
                <div><Label>Data</Label><Input name="data_infracao" type="date" required /></div>
              </div>
              <div><Label>Local</Label><Input name="local_infracao" /></div>
              <div><Label>Tipo infração</Label><Input name="tipo_infracao" /></div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Gravidade</Label>
                  <Select name="gravidade" defaultValue="media">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="leve">Leve</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="grave">Grave</SelectItem>
                      <SelectItem value="gravissima">Gravíssima</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Valor</Label><Input name="valor" type="number" step="0.01" /></div>
                <div><Label>Pontos</Label><Input name="pontos" type="number" /></div>
              </div>
              <div>
                <Label>Status</Label>
                <Select name="status" defaultValue="pendente">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="recorrida">Recorrida</SelectItem>
                    <SelectItem value="paga">Paga</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter><Button type="submit">Salvar</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Data</TableHead><TableHead>Veículo</TableHead><TableHead>Condutor</TableHead>
              <TableHead>Infração</TableHead><TableHead>Gravidade</TableHead><TableHead>Valor</TableHead><TableHead>Pts</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(multas || []).map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell className="text-xs">{m.data_infracao}</TableCell>
                  <TableCell>{m.veiculo?.placa}</TableCell>
                  <TableCell>{m.pessoa?.nome || "—"}</TableCell>
                  <TableCell>{m.tipo_infracao}</TableCell>
                  <TableCell className="capitalize">{m.gravidade}</TableCell>
                  <TableCell>{m.valor ? `R$ ${Number(m.valor).toFixed(2)}` : "—"}</TableCell>
                  <TableCell>{m.pontos || 0}</TableCell>
                  <TableCell><Badge variant={m.status === "paga" ? "default" : "secondary"}>{m.status}</Badge></TableCell>
                </TableRow>
              ))}
              {(multas || []).length === 0 && <TableRow><TableCell colSpan={8} className="py-8 text-center text-slate-500">Nenhuma multa.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
