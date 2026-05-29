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

const TIPOS = ["revisao", "troca_oleo", "pneu", "freio", "sinistro", "outro"];
const STATUS = ["agendado", "em_andamento", "concluido"];

export default function FrotaManutencoes() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: manut } = useQuery({
    queryKey: ["manutencoes"],
    queryFn: async () => (await (supabase as any).from("frota_manutencoes").select("*, veiculo:veiculos(placa,modelo)").order("data_prevista", { ascending: false })).data || [],
  });
  const { data: veiculos } = useQuery({
    queryKey: ["veiculos_min2"],
    queryFn: async () => (await (supabase as any).from("veiculos").select("id,placa,modelo")).data || [],
  });

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload: any = {
      veiculo_id: f.get("veiculo_id"),
      tipo: f.get("tipo"),
      descricao: f.get("descricao"),
      km_atual: Number(f.get("km_atual")) || null,
      data_prevista: f.get("data_prevista") || null,
      data_realizada: f.get("data_realizada") || null,
      valor: Number(f.get("valor")) || null,
      oficina: f.get("oficina"),
      status: f.get("status"),
    };
    const { error } = await (supabase as any).from("frota_manutencoes").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Manutenção registrada");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["manutencoes"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />Nova manutenção</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova manutenção</DialogTitle></DialogHeader>
            <form onSubmit={save} className="grid gap-3">
              <div>
                <Label>Veículo</Label>
                <Select name="veiculo_id" required>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(veiculos || []).map((v: any) => (<SelectItem key={v.id} value={v.id}>{v.placa} — {v.modelo}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Tipo</Label>
                  <Select name="tipo" defaultValue="revisao">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select name="status" defaultValue="agendado">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Descrição</Label><Input name="descricao" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Data prevista</Label><Input name="data_prevista" type="date" /></div>
                <div><Label>Data realizada</Label><Input name="data_realizada" type="date" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>KM</Label><Input name="km_atual" type="number" /></div>
                <div><Label>Valor (R$)</Label><Input name="valor" type="number" step="0.01" /></div>
              </div>
              <div><Label>Oficina</Label><Input name="oficina" /></div>
              <DialogFooter><Button type="submit">Salvar</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Veículo</TableHead><TableHead>Tipo</TableHead><TableHead>Descrição</TableHead>
              <TableHead>Prevista</TableHead><TableHead>Realizada</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(manut || []).map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell>{m.veiculo?.placa}</TableCell>
                  <TableCell className="capitalize">{m.tipo}</TableCell>
                  <TableCell>{m.descricao}</TableCell>
                  <TableCell className="text-xs">{m.data_prevista || "—"}</TableCell>
                  <TableCell className="text-xs">{m.data_realizada || "—"}</TableCell>
                  <TableCell>{m.valor ? `R$ ${Number(m.valor).toFixed(2)}` : "—"}</TableCell>
                  <TableCell><Badge variant={m.status === "concluido" ? "default" : "secondary"}>{m.status}</Badge></TableCell>
                </TableRow>
              ))}
              {(manut || []).length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-slate-500">Nenhuma manutenção.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
