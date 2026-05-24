import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, UserPlus, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";

type Cliente = {
  id: string;
  nome_empresa: string;
  email_contato: string;
  cnpj?: string | null;
  telefone?: string | null;
  responsavel?: string | null;
  status: string;
  created_at: string;
};

export default function MasterClientes() {
  const { isAdmin } = usePlatformAdmin();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ 
    nome_empresa: "", 
    email_contato: "", 
    cnpj: "", 
    telefone: "", 
    responsavel: "",
    status: "active" // Default para disparar provisionamento
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("saas_clients")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      toast.error("Erro ao carregar clientes: " + error.message);
    } else {
      setClientes(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.nome_empresa || !form.email_contato) {
      return toast.error("Preencha os campos obrigatórios");
    }
    
    setSubmitting(true);
    try {
      // 1. Criar o cliente (Trigger irá criar a loja matriz e assinatura inicial)
      const { data: clientData, error: clientError } = await supabase
        .from("saas_clients")
        .insert(form)
        .select()
        .single();

      if (clientError) throw clientError;

      toast.success("Cliente cadastrado e provisionado com sucesso!");
      setOpen(false);
      setForm({ nome_empresa: "", email_contato: "", cnpj: "", telefone: "", responsavel: "", status: "active" });
      load();
    } catch (error: any) {
      toast.error("Erro no provisionamento: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes SaaS</h1>
          <p className="text-muted-foreground">Gerenciamento de assinantes e provisionamento</p>
        </div>
        
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Novo cliente</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Provisionar Novo Cliente</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="empresa">Nome da Empresa/Loja *</Label>
                  <Input id="empresa" placeholder="Ex: Matriz Design" value={form.nome_empresa} onChange={e => setForm({ ...form, nome_empresa: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">E-mail Administrativo *</Label>
                  <Input id="email" type="email" placeholder="admin@empresa.com" value={form.email_contato} onChange={e => setForm({ ...form, email_contato: e.target.value })} />
                  <p className="text-[10px] text-muted-foreground">Este e-mail será usado para o primeiro acesso administrativo do cliente.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input id="cnpj" placeholder="00.000.000/0000-00" value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input id="telefone" placeholder="(00) 00000-0000" value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="resp">Responsável Legal</Label>
                  <Input id="resp" placeholder="Nome completo" value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} />
                </div>
                
                <div className="bg-amber-50 p-3 rounded-md border border-amber-200 flex gap-3">
                  <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-800">
                    Ao confirmar, o sistema criará automaticamente a <strong>Loja Matriz</strong> e aplicará o plano <strong>Starter</strong> por padrão.
                  </p>
                </div>

                <Button onClick={create} className="w-full" disabled={submitting}>
                  {submitting ? "Provisionando..." : "Confirmar e Provisionar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>E-mail / Responsável</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data Cadastro</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Carregando...</TableCell></TableRow>
            ) : clientes.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum cliente cadastrado</TableCell></TableRow>
            ) : (
              clientes.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome_empresa}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{c.email_contato}</span>
                      <span className="text-xs text-muted-foreground">{c.responsavel || "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell>{c.cnpj || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === "active" ? "default" : "secondary"}>
                      {c.status === "active" ? "Ativo" : "Pendente/Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {new Date(c.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" title="Convidar Admin">
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
