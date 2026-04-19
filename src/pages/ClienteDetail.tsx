import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
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
  loja_id: string;
};

type Orcamento = {
  id: string;
  status: string | null;
  valor_negociado: number | null;
  total_pedido: number | null;
  contrato_id: string | null;
  vendedor_id: string | null;
};

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const initials = (nome: string) =>
  nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

export default function ClienteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [contratoStatus, setContratoStatus] = useState<string | null>(null);
  const [vendedorNome, setVendedorNome] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    if (!id) return;
    setLoading(true);
    const { data: cli, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error || !cli) {
      toast.error("Cliente não encontrado");
      navigate("/clientes");
      return;
    }
    setCliente(cli as Cliente);

    const { data: orcs } = await supabase
      .from("orcamentos")
      .select("id,status,valor_negociado,total_pedido,contrato_id,vendedor_id")
      .eq("cliente_id", id);
    const list = (orcs ?? []) as Orcamento[];
    setOrcamentos(list);

    const contratoId = list.find((o) => o.contrato_id)?.contrato_id;
    if (contratoId) {
      const { data: c } = await supabase
        .from("contratos")
        .select("status,vendedor_id")
        .eq("id", contratoId)
        .maybeSingle();
      setContratoStatus(c?.status ?? null);
      if (c?.vendedor_id) {
        const { data: u } = await supabase
          .from("usuarios_publico")
          .select("nome")
          .eq("id", c.vendedor_id)
          .maybeSingle();
        setVendedorNome(u?.nome ?? null);
      }
    } else {
      const vendedorId = list.find((o) => o.vendedor_id)?.vendedor_id;
      if (vendedorId) {
        const { data: u } = await supabase
          .from("usuarios_publico")
          .select("nome")
          .eq("id", vendedorId)
          .maybeSingle();
        setVendedorNome(u?.nome ?? null);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const totals = useMemo(() => {
    const totalOrcado = orcamentos.reduce(
      (s, o) => s + Number(o.valor_negociado || o.total_pedido || 0),
      0,
    );
    const totalAprovado = orcamentos
      .filter((o) => o.status === "aprovado" || o.contrato_id)
      .reduce((s, o) => s + Number(o.valor_negociado || o.total_pedido || 0), 0);
    return { totalOrcado, totalAprovado };
  }, [orcamentos]);

  if (loading || !cliente) {
    return <div className="p-8 text-muted-foreground">Carregando...</div>;
  }

  const Field = ({ label, value }: { label: string; value?: string | null }) => (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value || "—"}</p>
    </div>
  );

  return (
    <div className="space-y-6 p-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/clientes")}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
      </Button>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {initials(cliente.nome)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-[22px] font-medium leading-tight">{cliente.nome}</h1>
            <p className="text-[13px] text-muted-foreground">
              {[cliente.telefone || cliente.celular, cliente.email].filter(Boolean).join(" · ") ||
                "—"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Editar
          </Button>
          <Button onClick={() => navigate("/comercial")}>
            <Plus className="mr-2 h-4 w-4" /> Novo orçamento
          </Button>
        </div>
      </div>

      {/* 2 colunas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados do cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nome" value={cliente.nome} />
              <Field label="CPF / CNPJ" value={cliente.cpf_cnpj} />
              <Field label="Telefone" value={cliente.telefone} />
              <Field label="Celular" value={cliente.celular} />
              <Field label="E-mail" value={cliente.email} />
              <Field label="CEP" value={cliente.cep} />
              <Field label="Endereço" value={cliente.endereco} />
              <Field label="Cidade" value={cliente.cidade} />
              <Field label="Estado" value={cliente.estado} />
            </div>
            {cliente.observacoes && (
              <div>
                <p className="text-xs text-muted-foreground">Observações</p>
                <p className="text-sm whitespace-pre-wrap">{cliente.observacoes}</p>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" /> Editar dados
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total orçado</span>
              <span className="text-base font-medium">{formatBRL(totals.totalOrcado)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total aprovado</span>
              <span className="text-base font-medium">{formatBRL(totals.totalAprovado)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Orçamentos</span>
              <Badge variant="secondary">{orcamentos.length}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Contrato ativo</span>
              {contratoStatus ? (
                <Badge>{contratoStatus}</Badge>
              ) : (
                <span className="text-sm">—</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Vendedor</span>
              <span className="text-sm">{vendedorNome || "—"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <ClienteFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        cliente={cliente}
        onSaved={() => {
          setEditOpen(false);
          fetchAll();
        }}
      />
    </div>
  );
}
