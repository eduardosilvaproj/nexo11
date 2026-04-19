import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pencil, Plus, Eye, Send, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { ClienteFormDialog } from "@/components/clientes/ClienteFormDialog";
import { NovoOrcamentoClienteDialog } from "@/components/clientes/NovoOrcamentoClienteDialog";
import { GerarContratoDialog } from "@/components/clientes/GerarContratoDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
      .select(
        "id,nome,status,valor_negociado,total_pedido,total_tabela,contrato_id,vendedor_id,ordem_compra,categorias,created_at",
      )
      .eq("cliente_id", id)
      .order("created_at", { ascending: false });
    const list = (orcs ?? []) as Orcamento[];
    setOrcamentos(list);

    const contratoIds = Array.from(
      new Set(list.map((o) => o.contrato_id).filter(Boolean) as string[]),
    );
    if (contratoIds.length > 0) {
      const { data: cs } = await supabase
        .from("contratos")
        .select("id,cliente_nome,status,valor_venda,data_criacao")
        .in("id", contratoIds)
        .order("data_criacao", { ascending: false });
      const list = (cs ?? []) as ContratoRow[];
      setContratos(list);

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
      const histContratos: HistoricoItem[] = list.map((c) => ({
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
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Clientes
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
            <p className="text-[13px]" style={{ color: "#6B7A90" }}>
              {[cliente.telefone || cliente.celular, cliente.email].filter(Boolean).join(" · ") ||
                "—"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setEditOpen(true)}
            style={{ borderColor: "#1E6FBF", color: "#1E6FBF" }}
          >
            <Pencil className="mr-2 h-4 w-4" /> Editar cliente
          </Button>
          <Button onClick={() => setImportOpen(true)} style={{ backgroundColor: "#1E6FBF" }}>
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
              <span className="text-sm text-muted-foreground">Total em contratos</span>
              <span className="text-base font-medium">{formatBRL(contratosResumo.total)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Nº de orçamentos</span>
              <Badge variant="secondary">{orcamentos.length}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Nº de contratos</span>
              <Badge variant="secondary">{contratosResumo.count}</Badge>
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
          {orcamentos.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Nenhum orçamento cadastrado
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
                    .join(" · ")
                : "";

              return (
                <Card key={o.id}>
                  <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
                    <div>
                      <p className="font-medium">{o.nome || "Orçamento"}</p>
                      <p className="text-[12px] text-muted-foreground mt-0.5">
                        {o.created_at
                          ? new Date(o.created_at).toLocaleDateString("pt-BR")
                          : ""}
                      </p>
                    </div>
                    <StatusBadge status={o.status} hasContrato={!!o.contrato_id} />
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-muted-foreground">Ordem Promob:</div>
                      <div>{o.ordem_compra || "—"}</div>
                      <div className="text-muted-foreground">Tabela:</div>
                      <div>{formatBRL(tabela)}</div>
                      <div className="text-muted-foreground">Negociado:</div>
                      <div className="font-medium">{formatBRL(negociado)}</div>
                      <div className="text-muted-foreground">Margem:</div>
                      <div className={margemColor}>{margem.toFixed(1)}%</div>
                      {cats && (
                        <>
                          <div className="text-muted-foreground">Categorias:</div>
                          <div className="truncate">{cats}</div>
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button size="sm" variant="outline">
                        <Eye className="mr-1.5 h-3.5 w-3.5" /> Ver detalhes
                      </Button>
                      <Button size="sm" variant="outline">
                        <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                      </Button>
                      <Button size="sm" variant="outline">
                        <Send className="mr-1.5 h-3.5 w-3.5" /> Enviar para cliente
                      </Button>
                      {o.status === "aprovado" && !o.contrato_id && (
                        <Button
                          size="sm"
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

          <Button
            variant="outline"
            className="border-primary text-primary"
            onClick={() => setImportOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" /> Importar XML Promob
          </Button>
        </TabsContent>

        <TabsContent value="contratos" className="space-y-3">
          {contratos.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Nenhum contrato gerado
              </CardContent>
            </Card>
          ) : (
            contratos.map((c) => (
              <Card key={c.id}>
                <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
                  <div>
                    <p className="font-medium">{c.cliente_nome}</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      {new Date(c.data_criacao).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <Badge variant="secondary">{c.status}</Badge>
                </CardHeader>
                <CardContent className="flex items-center justify-between pt-0">
                  <span className="text-sm text-muted-foreground">Valor</span>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{formatBRL(Number(c.valor_venda || 0))}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/contratos/${c.id}`)}
                    >
                      Abrir <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="historico" className="space-y-3">
          {historico.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Sem histórico
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-4 space-y-3">
                {historico.map((h) => (
                  <div key={h.id} className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0">
                    <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{h.titulo}</p>
                      {h.descricao && (
                        <p className="text-xs text-muted-foreground">{h.descricao}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {new Date(h.data).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                ))}
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

      <NovoOrcamentoClienteDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        clienteId={cliente.id}
        clienteNome={cliente.nome}
        lojaId={cliente.loja_id}
        onSaved={fetchAll}
      />

      <GerarContratoDialog
        open={gerarOpen}
        onOpenChange={(v) => {
          setGerarOpen(v);
          if (!v) setGerarPreselect(undefined);
        }}
        clienteId={cliente.id}
        clienteNome={cliente.nome}
        lojaId={cliente.loja_id}
        preselectedOrcamentoId={gerarPreselect}
        onCreated={fetchAll}
      />
    </div>
  );
}

function StatusBadge({
  status,
  hasContrato,
}: {
  status: string | null;
  hasContrato: boolean;
}) {
  if (hasContrato || status === "convertido") {
    return (
      <Badge className="bg-emerald-700 hover:bg-emerald-700 text-white">
        Virou contrato
      </Badge>
    );
  }
  const map: Record<string, { label: string; cls: string }> = {
    rascunho: { label: "Rascunho", cls: "bg-muted text-muted-foreground hover:bg-muted" },
    enviado: { label: "Enviado", cls: "bg-primary text-primary-foreground hover:bg-primary" },
    aprovado: { label: "Aprovado", cls: "bg-emerald-500 hover:bg-emerald-500 text-white" },
    recusado: {
      label: "Recusado",
      cls: "bg-destructive text-destructive-foreground hover:bg-destructive",
    },
  };
  const s = map[status || "rascunho"] ?? map.rascunho;
  return <Badge className={s.cls}>{s.label}</Badge>;
}
