import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

export default function FrotaPostos() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: postos } = useQuery({
    queryKey: ["postos"],
    queryFn: async () => (await (supabase as any).from("frota_postos").select("*").order("nome")).data || [],
  });

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload: any = {
      nome: f.get("nome"),
      cnpj: f.get("cnpj"),
      bandeira: f.get("bandeira"),
      endereco: f.get("endereco"),
      telefone: f.get("telefone"),
      ativo: true,
    };
    const q = editing
      ? (supabase as any).from("frota_postos").update(payload).eq("id", editing.id)
      : (supabase as any).from("frota_postos").insert(payload);
    const { error } = await q;
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    setOpen(false);
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["postos"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />Novo posto</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} posto</DialogTitle></DialogHeader>
            <form onSubmit={save} className="grid gap-3">
              <div><Label>Nome *</Label><Input name="nome" defaultValue={editing?.nome} required /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>CNPJ</Label><Input name="cnpj" defaultValue={editing?.cnpj} /></div>
                <div><Label>Bandeira</Label><Input name="bandeira" defaultValue={editing?.bandeira} placeholder="Petrobras, Shell..." /></div>
              </div>
              <div><Label>Endereço</Label><Input name="endereco" defaultValue={editing?.endereco} /></div>
              <div><Label>Telefone</Label><Input name="telefone" defaultValue={editing?.telefone} /></div>
              <DialogFooter><Button type="submit">Salvar</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Bandeira</TableHead><TableHead>CNPJ</TableHead><TableHead>Endereço</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {(postos || []).map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nome}</TableCell>
                  <TableCell>{p.bandeira}</TableCell>
                  <TableCell className="text-xs">{p.cnpj}</TableCell>
                  <TableCell className="text-xs">{p.endereco}</TableCell>
                  <TableCell><Badge variant={p.ativo ? "default" : "secondary"}>{p.ativo ? "ativo" : "inativo"}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {(postos || []).length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-slate-500">Nenhum posto.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
