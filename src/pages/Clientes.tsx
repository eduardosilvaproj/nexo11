import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Pencil, Plus, Search, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClienteFormDialog } from "@/components/clientes/ClienteFormDialog";

type Cliente = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  celular: string | null;
  cpf_cnpj: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  observacoes: string | null;
  orcamentos_count: number;
  contratos_ativos: number;
};

export default function Clientes() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: cliData, error } = await supabase
      .from("clientes")
      .select("id,nome,email,telefone,celular,cpf_cnpj,endereco,cidade,estado,cep,observacoes")
      .order("nome");

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const list = cliData ?? [];

    const ids = list.map((c) => c.id);
    const orcCounts: Record<string, number> = {};
    const contratosAtivos: Record<string, number> = {};

    if (ids.length > 0) {
      const [{ data: orcs }, { data: contratos }] = await Promise.all([
        supabase.from("orcamentos").select("cliente_id").in("cliente_id", ids),
        supabase
          .from("contratos")
          .select("cliente_id,status")
          .in("cliente_id", ids)
          .neq("status", "finalizado"),
      ]);

      (orcs ?? []).forEach((o) => {
        if (o.cliente_id) orcCounts[o.cliente_id] = (orcCounts[o.cliente_id] ?? 0) + 1;
      });

      (contratos ?? []).forEach((c) => {
        if (c.cliente_id)
          contratosAtivos[c.cliente_id] = (contratosAtivos[c.cliente_id] ?? 0) + 1;
      });
    }

    setClientes(
      list.map((c) => ({
        ...c,
        orcamentos_count: orcCounts[c.id] ?? 0,
        contratos_ativos: contratosAtivos[c.id] ?? 0,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase().trim();
    if (!q) return clientes;
    return clientes.filter(
      (c) =>
        c.nome?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.telefone?.toLowerCase().includes(q) ||
        c.celular?.toLowerCase().includes(q),
    );
  }, [clientes, busca]);

  const abrirNovo = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const abrirEditar = (c: Cliente) => {
    setEditing(c);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-7">
      <div className="relative overflow-hidden rounded-[28px] border border-sky-100 bg-gradient-to-br from-white via-sky-50/80 to-emerald-50/60 p-6 shadow-sm shadow-slate-200/70">
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute bottom-0 right-28 h-28 w-28 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex rounded-full border border-sky-200 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-sky-700">
              CRM
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-[-0.03em] text-slate-950">Clientes</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Cadastro, histórico comercial e contratos ativos em uma visão limpa.</p>
          </div>
          <Button onClick={abrirNovo} className="w-full rounded-2xl shadow-sm sm:w-auto" style={{ backgroundColor: "#1E6FBF" }}>
            <Plus className="mr-2 h-4 w-4" /> Novo cliente
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200/80 bg-white/95 p-4 shadow-sm shadow-slate-200/70 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por nome, email ou telefone..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-11 rounded-2xl border-slate-200 bg-slate-50 pl-10 shadow-none focus-visible:ring-sky-100"
          />
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-700">{filtrados.length} encontrados</span>
          <span className="rounded-full bg-slate-100 px-3 py-1">{clientes.length} total</span>
        </div>
      </div>

      <Card className="overflow-hidden border-slate-200/80 bg-white/95 shadow-sm shadow-slate-200/70">
        {loading ? (
          <div className="p-10 text-center text-sm font-medium text-slate-500">Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div className="space-y-4 p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-50 text-slate-400">
              <UserRound className="h-8 w-8" />
            </div>
            <p className="font-medium text-slate-500">
              {clientes.length === 0 ? "Nenhum cliente cadastrado" : "Nenhum cliente encontrado"}
            </p>
            {clientes.length === 0 && (
              <Button onClick={abrirNovo} className="rounded-2xl" style={{ backgroundColor: "#1E6FBF" }}>
                <Plus className="mr-2 h-4 w-4" /> Cadastrar primeiro cliente
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="border-slate-100 hover:bg-transparent">
                <TableHead className="font-bold text-slate-500">Nome</TableHead>
                <TableHead className="font-bold text-slate-500">Telefone</TableHead>
                <TableHead className="font-bold text-slate-500">Cidade</TableHead>
                <TableHead className="font-bold text-slate-500">Orçamentos</TableHead>
                <TableHead className="font-bold text-slate-500">Contratos ativos</TableHead>
                <TableHead className="text-right font-bold text-slate-500">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((c) => (
                <TableRow key={c.id} className="border-slate-100 transition-colors hover:bg-sky-50/40">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-emerald-100 text-sm font-bold text-sky-800">
                        {c.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{c.nome}</p>
                        <p className="text-xs text-slate-500">{c.email || c.cpf_cnpj || "Sem email informado"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-slate-600">{c.telefone || c.celular || "—"}</TableCell>
                  <TableCell className="text-slate-600">
                    {c.cidade ? `${c.cidade}${c.estado ? ` / ${c.estado}` : ""}` : "—"}
                  </TableCell>
                  <TableCell>
                    {c.orcamentos_count > 0 ? (
                      <Badge className="rounded-full bg-sky-50 px-2.5 py-1 font-bold text-sky-700 hover:bg-sky-50">
                        {c.orcamentos_count}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {c.contratos_ativos > 0 ? (
                      <Badge className="rounded-full bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700 hover:bg-emerald-50">
                        {c.contratos_ativos}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="space-x-1 text-right">
                    <Button size="icon" variant="ghost" className="rounded-xl text-slate-500 hover:bg-sky-50 hover:text-sky-700" onClick={() => navigate(`/clientes/${c.id}`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="rounded-xl text-slate-500 hover:bg-emerald-50 hover:text-emerald-700" onClick={() => abrirEditar(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <ClienteFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        cliente={editing}
        onSaved={load}
      />
    </div>
  );
}
