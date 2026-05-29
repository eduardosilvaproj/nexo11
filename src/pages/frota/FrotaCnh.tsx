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

export default function FrotaCnh() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: cnhs } = useQuery({
    queryKey: ["cnhs"],
    queryFn: async () => (await (supabase as any).from("pessoas_cnh").select("*, pessoa:pessoas(nome,email)").order("data_validade")).data || [],
  });
  const { data: pessoas } = useQuery({
    queryKey: ["pessoas_cnh"],
    queryFn: async () => (await (supabase as any).from("pessoas").select("id,nome").order("nome")).data || [],
  });

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload: any = {
      pessoa_id: f.get("pessoa_id"),
      numero_cnh: f.get("numero_cnh"),
      categoria: f.get("categoria"),
      data_validade: f.get("data_validade"),
      data_validade_reciclagem: f.get("data_validade_reciclagem") || null,
    };
    const { error } = await (supabase as any).from("pessoas_cnh").upsert(payload, { onConflict: "pessoa_id" });
    if (error) return toast.error(error.message);
    toast.success("CNH salva");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["cnhs"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />Cadastrar CNH</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cadastrar CNH</DialogTitle></DialogHeader>
            <form onSubmit={save} className="grid gap-3">
              <div>
                <Label>Pessoa</Label>
                <Select name="pessoa_id" required>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{(pessoas || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Nº CNH</Label><Input name="numero_cnh" required /></div>
                <div>
                  <Label>Categoria</Label>
                  <Select name="categoria" defaultValue="B">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["A", "B", "AB", "C", "D", "E", "ACC"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Validade *</Label><Input name="data_validade" type="date" required /></div>
                <div><Label>Reciclagem</Label><Input name="data_validade_reciclagem" type="date" /></div>
              </div>
              <DialogFooter><Button type="submit">Salvar</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Pessoa</TableHead><TableHead>CNH</TableHead><TableHead>Cat.</TableHead><TableHead>Validade</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {(cnhs || []).map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>{c.pessoa?.nome}</TableCell>
                  <TableCell className="font-mono text-xs">{c.numero_cnh}</TableCell>
                  <TableCell>{c.categoria}</TableCell>
                  <TableCell>{c.data_validade}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === "valida" ? "default" : c.status === "vencendo" ? "secondary" : "destructive"}>
                      {c.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {(cnhs || []).length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-slate-500">Nenhuma CNH cadastrada.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
