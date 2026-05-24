import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { toast } from "sonner";

type Cliente = {
  id: string;
  nome_empresa: string;
  email_contato: string;
  cnpj?: string | null;
  telefone?: string | null;
  responsavel?: string | null;
  status: string;
};

export default function MasterClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome_empresa: "", email_contato: "", cnpj: "", telefone: "", responsavel: "" });

  const load = async () => {
    const { data, error } = await supabase.from("saas_clients" as any).select("*").order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    setClientes((data as any) || []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.nome_empresa || !form.email_contato) return toast.error("Preencha os campos obrigatórios");
    const { error } = await supabase.from("saas_clients" as any).insert(form);
    if (error) return toast.error(error.message);
    toast.success("Cliente cadastrado");
    setOpen(false);
    setForm({ nome_empresa: "", email_contato: "", cnpj: "", telefone: "", responsavel: "" });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Assinantes da plataforma</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Novo cliente</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cadastrar cliente assinante</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Empresa *</Label><Input value={form.nome_empresa} onChange={e => setForm({ ...form, nome_empresa: e.target.value })} /></div>
              <div><Label>E-mail *</Label><Input value={form.email_contato} onChange={e => setForm({ ...form, email_contato: e.target.value })} /></div>
              <div><Label>CNPJ</Label><Input value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} /></div>
              <div><Label>Telefone</Label><Input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} /></div>
              <div><Label>Responsável</Label><Input value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} /></div>
              <Button onClick={create} className="w-full">Cadastrar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientes.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum cliente cadastrado</TableCell></TableRow>
            )}
            {clientes.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nome_empresa}</TableCell>
                <TableCell>{c.email_contato}</TableCell>
                <TableCell>{c.cnpj || "-"}</TableCell>
                <TableCell>{c.responsavel || "-"}</TableCell>
                <TableCell><Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
