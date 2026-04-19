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
  contrato_status: string | null;
};

const statusColor: Record<string, string> = {
  comercial: "bg-blue-100 text-blue-700",
  tecnico: "bg-purple-100 text-purple-700",
  producao: "bg-amber-100 text-amber-700",
  logistica: "bg-cyan-100 text-cyan-700",
  montagem: "bg-orange-100 text-orange-700",
  pos_venda: "bg-pink-100 text-pink-700",
  finalizado: "bg-green-100 text-green-700",
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

    // Buscar orçamentos e contratos vinculados
    const ids = list.map((c) => c.id);
    const orcCounts: Record<string, number> = {};
    const contratoStatus: Record<string, string> = {};

    if (ids.length > 0) {
      const { data: orcs } = await supabase
        .from("orcamentos")
        .select("cliente_id,contrato_id")
        .in("cliente_id", ids);

      (orcs ?? []).forEach((o) => {
        if (o.cliente_id) orcCounts[o.cliente_id] = (orcCounts[o.cliente_id] ?? 0) + 1;
      });

      const contratoIds = Array.from(new Set((orcs ?? []).map((o) => o.contrato_id).filter(Boolean) as string[]));
      if (contratoIds.length > 0) {
        const { data: contratos } = await supabase
          .from("contratos")
          .select("id,status")
          .in("id", contratoIds);
        const statusMap: Record<string, string> = {};
        (contratos ?? []).forEach((c) => (statusMap[c.id] = c.status));
        (orcs ?? []).forEach((o) => {
          if (o.cliente_id && o.contrato_id && statusMap[o.contrato_id]) {
            contratoStatus[o.cliente_id] = statusMap[o.contrato_id];
          }
        });
      }
    }

    setClientes(
      list.map((c) => ({
        ...c,
        orcamentos_count: orcCounts[c.id] ?? 0,
        contrato_status: contratoStatus[c.id] ?? null,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="text-sm text-muted-foreground">Cadastro e orçamentos</p>
        </div>
        <Button onClick={abrirNovo} style={{ backgroundColor: "#1E6FBF" }}>
          <Plus className="h-4 w-4 mr-2" /> Novo cliente
        </Button>
      </div>

      <div className="relative max-w-md">
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Orçamentos</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell>{c.telefone || c.celular || "—"}</TableCell>
                  <TableCell>{c.email || "—"}</TableCell>
                  <TableCell>
                    {c.orcamentos_count > 0 ? (
                      <Badge style={{ backgroundColor: "#E6F3FF", color: "#1E6FBF" }} className="hover:opacity-90">
                        {c.orcamentos_count} {c.orcamentos_count === 1 ? "orçamento" : "orçamentos"}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {c.contrato_status ? (
                      <Badge variant="outline" className={statusColor[c.contrato_status] ?? ""}>
                        {c.contrato_status}
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
