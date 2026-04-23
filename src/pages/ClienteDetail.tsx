import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pencil, Plus, Eye, ArrowRight, CheckCircle2, FileText, FileSignature, Activity, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { ClienteFormDialog } from "@/components/clientes/ClienteFormDialog";
import { NovoOrcamentoClienteDialog } from "@/components/clientes/NovoOrcamentoClienteDialog";
import { ImportXmlPromobDialog } from "@/components/comercial/ImportXmlPromobDialog";
import { GerarContratoDialog } from "@/components/clientes/GerarContratoDialog";
import { EnviarPortalDialog } from "@/components/clientes/EnviarPortalDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  nome: string;
  status: string | null;
  valor_negociado: number | null;
  total_pedido: number | null;
  total_tabela: number | null;
  contrato_id: string | null;
  vendedor_id: string | null;
  ordem_compra: string | null;
  categorias: unknown;
  created_at: string | null;
};

type ContratoRow = {
  id: string;
  cliente_nome: string;
  status: string;
  valor_venda: number;
  data_criacao: string;
  margem_prevista?: number | null;
  margem_realizada?: number | null;
  descricao?: string | null;
};

type HistoricoItem = {
  id: string;
  tipo: "orcamento" | "contrato" | "log";
  titulo: string;
  descricao?: string | null;
  data: string;
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
  const [contratos, setContratos] = useState<ContratoRow[]>([]);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const contratosResumo = useMemo(() => {
    const ativos = contratos.filter((c) => c.status !== "finalizado");
    return {
      count: ativos.length,
      total: ativos.reduce((s, c) => s + Number(c.valor_venda || 0), 0),
    };
  }, [contratos]);
  const [editOpen, setEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [gerarOpen, setGerarOpen] = useState(false);
  const [gerarPreselect, setGerarPreselect] = useState<string | undefined>(undefined);
  const [portalOpen, setPortalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const aprovarOrcamento = async (orcId: string) => {
    const { error } = await supabase
      .from("orcamentos")
      .update({ status: "aprovado" })
      .eq("id", orcId);
    if (error) {
      toast.error("Não foi possível aprovar o orçamento");
      return;
    }
    toast.success("Orçamento aprovado");
    fetchAll();
  };

  const fetchAll = async () => {
    if (!id) return;
    setLoading(true);
    // Aguarda sessão estar pronta para RLS funcionar corretamente
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Sessão expirada, faça login novamente");
      navigate("/auth");
      return;
    }
    const { data: cli, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      toast.error(`Erro ao carregar cliente: ${error.message}`);
      setCliente(null);
      setLoading(false);
      return;
    }
    if (!cli) {
      setCliente(null);
      setLoading(false);
      return;
    }
    setCliente(cli as Cliente);

    const orcRes = await supabase
      .from("orcamentos")
      .select(
        "id,nome,status,valor_negociado,total_pedido,total_tabela,contrato_id,vendedor_id,ordem_compra,categorias,created_at",
      )
      .eq("cliente_id", id)
      .order("created_at", { ascending: false });
    const orcs = orcRes.error ? [] : orcRes.data;
    const list = (orcs ?? []) as Orcamento[];
    setOrcamentos(list);

    const { data: contratosByCliente } = await supabase
      .from("contratos")
      .select("id, cliente_nome, status, valor_venda, data_criacao, dre_contrato(margem_prevista, margem_realizada)")
      .eq("cliente_id", id)
      .order("data_criacao", { ascending: false });
    const cs = (contratosByCliente ?? []).map((c) => {
      const dre = Array.isArray(c.dre_contrato) ? c.dre_contrato[0] : c.dre_contrato;
      return {
        id: c.id,
        cliente_nome: c.cliente_nome,
        status: c.status,
        valor_venda: c.valor_venda,
        data_criacao: c.data_criacao,
        margem_prevista: (dre?.margem_prevista ?? null) as number | null,
        margem_realizada: (dre?.margem_realizada ?? null) as number | null,
      };
    });
    const contratoIds = Array.from(
      new Set([
        ...cs.map((c) => c.id as string).filter(Boolean),
        ...(list.map((o) => o.contrato_id).filter(Boolean) as string[]),
      ]),
    );
    if (contratoIds.length > 0) {
      const orcsByContrato = new Map<string, string[]>();
      list.forEach((o) => {
        if (o.contrato_id) {
          const arr = orcsByContrato.get(o.contrato_id) ?? [];
          arr.push(o.nome);
          orcsByContrato.set(o.contrato_id, arr);
        }
      });
      const contratosList: ContratoRow[] = (cs ?? []).map((c) => ({
        id: c.id as string,
        cliente_nome: (c.cliente_nome as string) ?? "",
        status: (c.status as string) ?? "comercial",
        valor_venda: Number(c.valor_venda || 0),
        data_criacao: (c.data_criacao as string) ?? new Date().toISOString(),
        margem_prevista: c.margem_prevista as number | null,
        margem_realizada: c.margem_realizada as number | null,
        descricao: orcsByContrato.get(c.id as string)?.join(", ") ?? null,
      }));
      setContratos(contratosList);

      const { data: logs } = await supabase
        .from("contrato_logs")
        .select("id,titulo,descricao,created_at,contrato_id")
        .in("contrato_id", contratoIds)
        .order("created_at", { ascending: false })
        .limit(50);
      const histLogs: HistoricoItem[] = (logs ?? []).map((l) => ({
        id: l.id,
        tipo: "log",
        titulo: l.titulo,
        descricao: l.descricao,
        data: l.created_at,
      }));
      const histOrcs: HistoricoItem[] = list.length > 0 || true
        ? (orcs ?? []).map((o) => ({
            id: `o-${o.id}`,
            tipo: "orcamento",
            titulo: `Orçamento criado: ${o.nome}`,
            descricao: o.ordem_compra ? `OC ${o.ordem_compra}` : null,
            data: o.created_at || new Date().toISOString(),
          }))
        : [];
      const histContratos: HistoricoItem[] = contratosList.map((c) => ({
        id: `c-${c.id}`,
        tipo: "contrato",
        titulo: `Contrato gerado · ${c.status}`,
        descricao: formatBRL(Number(c.valor_venda || 0)),
        data: c.data_criacao,
      }));
      setHistorico(
        [...histLogs, ...histOrcs, ...histContratos].sort(
          (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime(),
        ),
      );
    } else {
      setContratos([]);
      setHistorico(
        (orcs ?? []).map((o) => ({
          id: `o-${o.id}`,
          tipo: "orcamento",
          titulo: `Orçamento criado: ${o.nome}`,
          descricao: o.ordem_compra ? `OC ${o.ordem_compra}` : null,
          data: o.created_at || new Date().toISOString(),
        })),
      );
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

  if (loading) {
    return <div className="p-8 text-muted-foreground">Carregando...</div>;
  }

  if (!cliente) {
    return (
      <div className="p-8 space-y-4">
        <p className="text-base font-medium">Cliente não encontrado</p>
        <Button variant="outline" onClick={() => navigate("/clientes")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Clientes
        </Button>
      </div>
    );
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
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Clientes
      </Button>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-[52px] w-[52px]">
            <AvatarFallback
              className="font-medium text-white"
              style={{ backgroundColor: "#1E6FBF" }}
            >
              {initials(cliente.nome)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-[22px] font-medium leading-tight" style={{ color: "#0D1117" }}>
              {cliente.nome}
            </h1>
            <p className="text-[13px]" style={{ color: "#6B7A90" }}>
              {[cliente.telefone || cliente.celular, cliente.email].filter(Boolean).join(" · ") ||
                "—"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setPortalOpen(true)}
            style={{ borderColor: "#1E6FBF", color: "#1E6FBF" }}
          >
            <Smartphone className="mr-2 h-4 w-4" /> 📲 Enviar Portal
          </Button>
          <Button
            variant="outline"
            onClick={() => setEditOpen(true)}
            style={{ borderColor: "#1E6FBF", color: "#1E6FBF" }}
          >
            <Pencil className="mr-2 h-4 w-4" /> Editar cliente
          </Button>
        </div>
      </div>

      {/* 2 colunas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="bg-white" style={{ border: "1px solid #E8ECF2" }}>
          <CardHeader>
            <CardTitle className="text-base">Dados cadastrais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nome" value={cliente.nome} />
              <Field label="E-mail" value={cliente.email} />
              <Field label="Telefone" value={cliente.telefone} />
              <Field label="Celular" value={cliente.celular} />
              <Field label="CPF / CNPJ" value={cliente.cpf_cnpj} />
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
            <div className="pt-2 border-t" style={{ borderColor: "#E8ECF2" }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
                style={{ borderColor: "#1E6FBF", color: "#1E6FBF" }}
              >
                <Pencil className="mr-2 h-4 w-4" /> Editar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white" style={{ border: "1px solid #E8ECF2" }}>
          <CardHeader>
            <CardTitle className="text-base">Resumo financeiro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total orçado</span>
              <span className="text-[18px] font-medium tabular-nums" style={{ color: "#0D1117" }}>
                {formatBRL(totals.totalOrcado)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total em contratos</span>
              <span className="text-[18px] font-medium tabular-nums" style={{ color: "#0D1117" }}>
                {formatBRL(contratosResumo.total)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Orçamentos</span>
              <span className="text-[18px] font-medium tabular-nums" style={{ color: "#0D1117" }}>
                {orcamentos.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Contratos</span>
              <span className="text-[18px] font-medium tabular-nums" style={{ color: "#0D1117" }}>
                {contratosResumo.count}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Abas */}
      <Tabs defaultValue="orcamentos" className="space-y-3">
        <TabsList>
          <TabsTrigger value="orcamentos">Orçamentos</TabsTrigger>
          <TabsTrigger value="contratos">Contratos</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="orcamentos" className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setImportOpen(true)} style={{ backgroundColor: "#1E6FBF" }}>
              <Plus className="mr-2 h-4 w-4" /> Importar XML Promob
            </Button>
          </div>

          {orcamentos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center space-y-3">
                <p className="text-base font-medium">Nenhum orçamento ainda</p>
                <p className="text-sm text-muted-foreground">
                  Importe um XML do Promob para criar o primeiro orçamento
                </p>
                <Button
                  onClick={() => setImportOpen(true)}
                  style={{ backgroundColor: "#1E6FBF" }}
                >
                  <Plus className="mr-2 h-4 w-4" /> Importar XML Promob
                </Button>
              </CardContent>
            </Card>
          ) : (
            orcamentos.map((o) => {
              const tabela = Number(o.total_tabela || 0);
              const negociado = Number(o.valor_negociado || o.total_pedido || 0);
              const margem = negociado > 0 ? ((negociado - tabela) / negociado) * 100 : 0;
              const margemColor =
                margem >= 30
                  ? "text-emerald-600"
                  : margem >= 15
                  ? "text-amber-600"
                  : "text-destructive";
              const cats = Array.isArray(o.categorias)
                ? (o.categorias as Array<{ descricao?: string }>)
                    .map((c) => c?.descricao)
                    .filter(Boolean)
                : [];

              const podeAprovar =
                !o.contrato_id && (o.status === "rascunho" || o.status === "enviado" || !o.status);

              return (
                <Card key={o.id}>
                  <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
                    <div>
                      <p className="font-medium">{o.nome || "Orçamento"}</p>
                      <p className="text-[12px] mt-0.5" style={{ color: "#6B7A90" }}>
                        {o.created_at
                          ? new Date(o.created_at).toLocaleDateString("pt-BR")
                          : ""}
                      </p>
                    </div>
                    <StatusBadge
                      status={o.status}
                      hasContrato={!!o.contrato_id}
                      contratoId={o.contrato_id}
                    />
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-muted-foreground">Ordem Promob:</div>
                      <div>{o.ordem_compra || "—"}</div>
                      <div className="text-muted-foreground">Tabela fábrica:</div>
                      <div>{formatBRL(tabela)}</div>
                      <div className="text-muted-foreground">Valor negociado:</div>
                      <div className="font-medium">{formatBRL(negociado)}</div>
                      <div className="text-muted-foreground">Margem prevista:</div>
                      <div className={margemColor}>{margem.toFixed(1)}%</div>
                    </div>

                    {cats.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {cats.map((c, i) => (
                          <Badge key={i} variant="secondary" className="font-normal">
                            {c}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button size="sm" variant="outline">
                        <Eye className="mr-1.5 h-3.5 w-3.5" /> Ver detalhes
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/orcamentos/${o.id}/negociacao`)}
                      >
                        <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar descontos
                      </Button>
                      {podeAprovar && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                          onClick={() => aprovarOrcamento(o.id)}
                        >
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Marcar como aprovado
                        </Button>
                      )}
                      {o.status === "aprovado" && !o.contrato_id && (
                        <Button
                          size="sm"
                          style={{ backgroundColor: "#12B76A" }}
                          className="text-white hover:opacity-90"
                          onClick={() => {
                            setGerarPreselect(o.id);
                            setGerarOpen(true);
                          }}
                        >
                          Gerar contrato <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                        </Button>
                      )}
                      {o.contrato_id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/contratos/${o.contrato_id}`)}
                        >
                          Ver contrato <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="contratos" className="space-y-3">
          {contratos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center space-y-2">
                <p className="text-base font-medium">Nenhum contrato ainda</p>
                <p className="text-sm text-muted-foreground">
                  Aprove um orçamento para gerar o primeiro contrato
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº contrato</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Margem</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contratos.map((c) => {
                    const margem = c.margem_realizada ?? c.margem_prevista ?? 0;
                    const margemColor =
                      Number(margem) >= 30
                        ? "text-emerald-600"
                        : Number(margem) >= 15
                        ? "text-amber-600"
                        : "text-destructive";
                    return (
                      <TableRow
                        key={c.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/contratos/${c.id}`)}
                      >
                        <TableCell className="font-mono text-xs">
                          #{c.id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="max-w-[260px] truncate">
                          {c.descricao || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatBRL(Number(c.valor_venda || 0))}
                        </TableCell>
                        <TableCell className={`text-right tabular-nums ${margemColor}`}>
                          {Number(margem).toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(c.data_criacao).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/contratos/${c.id}`);
                            }}
                          >
                            Ver <ArrowRight className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="historico" className="space-y-3">
          {historico.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center space-y-2">
                <p className="text-base font-medium">Sem histórico ainda</p>
                <p className="text-sm text-muted-foreground">
                  As atividades do cliente aparecerão aqui
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-6">
                <div className="relative">
                  <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
                  <div className="space-y-5">
                    {historico.map((h) => {
                      const meta =
                        h.tipo === "contrato"
                          ? { Icon: FileSignature, bg: "#D1FAE5", color: "#05873C" }
                          : h.tipo === "orcamento"
                          ? { Icon: FileText, bg: "#E6F3FF", color: "#1E6FBF" }
                          : { Icon: Activity, bg: "#F5F7FA", color: "#6B7A90" };
                      const { Icon } = meta;
                      return (
                        <div key={h.id} className="relative flex items-start gap-3">
                          <div
                            className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                            style={{ backgroundColor: meta.bg, border: "2px solid hsl(var(--background))" }}
                          >
                            <Icon size={14} color={meta.color} strokeWidth={2.5} />
                          </div>
                          <div className="flex-1 pt-1">
                            <p className="text-sm font-medium leading-tight">{h.titulo}</p>
                            {h.descricao && (
                              <p className="text-xs text-muted-foreground mt-0.5">{h.descricao}</p>
                            )}
                            <p className="text-[11px] text-muted-foreground mt-1">
                              {new Date(h.data).toLocaleString("pt-BR")}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <ClienteFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        cliente={cliente}
        onSaved={() => {
          setEditOpen(false);
          fetchAll();
        }}
      />

      <ImportXmlPromobDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        clienteId={cliente.id}
        clienteNome={cliente.nome}
      />

      <GerarContratoDialog
        open={gerarOpen}
        onOpenChange={(v) => {
          setGerarOpen(v);
          if (!v) setGerarPreselect(undefined);
        }}
        clienteId={cliente.id}
        clienteNome={cliente.nome}
        clienteContato={cliente.celular || cliente.telefone}
        lojaId={cliente.loja_id}
        preselectedOrcamentoId={gerarPreselect}
        onCreated={fetchAll}
      />

      <EnviarPortalDialog
        open={portalOpen}
        onOpenChange={setPortalOpen}
        clienteId={cliente.id}
        clienteNome={cliente.nome}
        lojaId={cliente.loja_id}
      />
    </div>
  );
}

function StatusBadge({
  status,
  hasContrato,
  contratoId,
}: {
  status: string | null;
  hasContrato: boolean;
  contratoId?: string | null;
}) {
  if (hasContrato || status === "convertido") {
    const short = contratoId ? contratoId.slice(0, 6).toUpperCase() : "";
    return (
      <Badge style={{ backgroundColor: "#05873C", color: "#fff" }} className="hover:opacity-90">
        Contrato{short ? ` #${short}` : ""}
      </Badge>
    );
  }
  const map: Record<string, { label: string; bg: string; fg: string }> = {
    rascunho: { label: "Rascunho", bg: "#E8ECF2", fg: "#6B7A90" },
    enviado: { label: "Enviado", bg: "#E6F3FF", fg: "#1E6FBF" },
    aprovado: { label: "Aprovado", bg: "#D1FAE5", fg: "#05873C" },
    recusado: { label: "Recusado", bg: "#FDECEA", fg: "#E53935" },
  };
  const s = map[status || "rascunho"] ?? map.rascunho;
  return (
    <Badge style={{ backgroundColor: s.bg, color: s.fg }} className="hover:opacity-90">
      {s.label}
    </Badge>
  );
}
