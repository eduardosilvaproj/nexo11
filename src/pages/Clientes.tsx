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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="text-sm text-muted-foreground">Cadastro e orçamentos</p>
        </div>
        <Button onClick={abrirNovo} className="w-full sm:w-auto" style={{ backgroundColor: "#1E6FBF" }}>
          <Plus className="h-4 w-4 mr-2" /> Novo cliente
        </Button>
      </div>

      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email ou telefone..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        {loading ? (
          <div className="p-10 text-center text-muted-foreground">Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <UserRound className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              {clientes.length === 0 ? "Nenhum cliente cadastrado" : "Nenhum cliente encontrado"}
            </p>
            {clientes.length === 0 && (
              <Button onClick={abrirNovo} style={{ backgroundColor: "#1E6FBF" }}>
                <Plus className="h-4 w-4 mr-2" /> Cadastrar primeiro cliente
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Orçamentos</TableHead>
                <TableHead>Contratos ativos</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell>{c.telefone || c.celular || "—"}</TableCell>
                  <TableCell>
                    {c.cidade ? `${c.cidade}${c.estado ? ` / ${c.estado}` : ""}` : "—"}
                  </TableCell>
                  <TableCell>
                    {c.orcamentos_count > 0 ? (
                      <Badge style={{ backgroundColor: "#E6F3FF", color: "#1E6FBF" }} className="hover:opacity-90">
                        {c.orcamentos_count}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {c.contratos_ativos > 0 ? (
                      <Badge style={{ backgroundColor: "#DCFCE7", color: "#15803D" }} className="hover:opacity-90">
                        {c.contratos_ativos}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" onClick={() => navigate(`/clientes/${c.id}`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => abrirEditar(c)}>
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
