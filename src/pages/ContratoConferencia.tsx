import { useState, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  ChevronLeft, Loader2, AlertTriangle, CheckCircle2, 
  Clock, AlertCircle, ChevronDown, ChevronUp, 
  Upload, FileText, Package, CheckSquare, 
  Save, ArrowRight, User, Trash2, Plus, 
  Info, ShieldCheck, Send
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { parsePromobXml } from "@/lib/promob-xml";
import { cn } from "@/lib/utils";
import { useParams, useNavigate } from "react-router-dom";
import { BotaoAjudaTecnica } from "@/components/ajuda/BotaoAjudaTecnica";

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

type ConferenciaStatus = "pendente" | "aprovada" | "bloqueada" | "liberada";

interface Ambiente {
  id: string;
  nome: string;
  loja_id: string;
  contrato_id: string;
  valor_liquido: number;
  custo_original: number | null;
  custo_conferencia: number | null;
  variacao_pct: number | null;
  conferencia_status: ConferenciaStatus;
  conferente_id: string | null;
  percentual_conferente: number;
  valor_conferente: number;
  itens_original_json: any[];
  itens_conferencia_json: any[];
  aprovacao_solicitada_em: string | null;
  status_medicao: string;
  checklist_json?: any;
  conferencia_xml_raw?: string;
  observacoes_conferencia?: string;
  inclui_ferragens?: boolean;
}

interface ItemExtra {
  id: string;
  ambiente_id: string;
  descricao: string;
  quantidade: number;
  unidade: string | null;
  origem: "comprar" | "almoxarifado";
  status_compra: string;
}

const CHECKLIST_ITEMS = [
  "Implantação dos móveis na fábrica",
  "Lista extra de ferragens",
  "Confirmação do cliente de alterações no projeto",
  "Prints das imagens alteradas na conferência",
  "Projeto hidráulico (foto, planta ou marcação)",
  "Pontos elétricos e LED ao cliente/eletricista",
  "Planta de base",
  "Planta de pedra",
  "Metalon",
  "Portas de vidro",
  "Implantação de pedidos de terceiros"
];

export default function ContratoConferenciaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { perfil, hasRole } = useAuth();
  const canApprove = hasRole("admin") || hasRole("gerente");

  const { data: contrato, isLoading: loadingContrato } = useQuery({
    queryKey: ["contrato-conferencia-full", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select(`
          id, 
          cliente_nome, 
          loja_id, 
          status,
          contrato_ambientes(*)
        `)
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: orcamento } = useQuery({
    queryKey: ["orcamento-do-contrato", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from("orcamentos")
        .select("id, xml_raw, total_pedido, categorias, itens")
        .eq("contrato_id", id!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: conferentes = [] } = useQuery({
    queryKey: ["conferentes-list", contrato?.loja_id],
    enabled: !!contrato?.loja_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("usuarios")
        .select("id, nome")
        .contains("funcoes", ["conferente"])
        .order("nome");
      return data ?? [];
    },
  });

  const ambientes = (contrato?.contrato_ambientes || []) as Ambiente[];
  
  const stats = useMemo(() => {
    const total = ambientes.length;
    const disponiveis = ambientes.filter(a => a.status_medicao === 'liberado_conferencia' && a.conferencia_status === 'pendente' && !a.conferente_id).length;
    const emConferencia = ambientes.filter(a => a.conferente_id && (a.conferencia_status === 'pendente' || a.conferencia_status === 'bloqueada')).length;
    const aprovados = ambientes.filter(a => a.conferencia_status === 'aprovada' || a.conferencia_status === 'liberada').length;
    const comDivergencia = ambientes.filter(a => a.conferencia_status === 'bloqueada').length;
    const aguardMedicao = ambientes.filter(a => a.status_medicao !== 'liberado_conferencia' && a.status_medicao !== 'concluido').length;
    const todosAprovados = total > 0 && aprovados === total;

    return { total, disponiveis, emConferencia, aprovados, comDivergencia, aguardMedicao, todosAprovados };
  }, [ambientes]);

  const handleFinalizarConferencia = async () => {
    if (!stats.todosAprovados) {
      toast.error("Todos os ambientes precisam estar aprovados para encaminhar à fabricação.");
      return;
    }

    const { error } = await supabase
      .from("contratos")
      .update({ 
        status: 'producao',
        trava_producao_ok: true 
      })
      .eq("id", id!);

    if (error) {
      toast.error("Erro ao encaminhar para produção: " + error.message);
      return;
    }

    toast.success("Contrato encaminhado para produção! ✓");
    navigate("/tecnico");
  };

  if (loadingContrato) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!contrato) return <div className="p-8">Contrato não encontrado</div>;

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8 max-w-7xl mx-auto w-full pb-32">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <button
          onClick={() => navigate(`/contratos/${id}`)}
          className="flex items-center gap-1 text-[#6B7A90] hover:text-[#0D1117] transition-colors text-sm mb-1"
        >
          <ChevronLeft size={16} />
          Voltar ao contrato
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-[#0D1117]">
              Conferência — {contrato.cliente_nome} <span className="text-[#6B7A90] font-normal">#{id?.slice(0, 6).toUpperCase()}</span>
            </h1>
            <BotaoAjudaTecnica inline />
          </div>
          <div className="flex gap-2">
            {/* Removido o BotaoAjudaTecnica que estava aqui */}
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {stats.disponiveis} ambiente(s) disponível(is)
            </span>
            {stats.aguardMedicao > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                {stats.aguardMedicao} ainda em medição
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Disponíveis", value: stats.disponiveis, color: "bg-blue-500", icon: CheckCircle2 },
          { label: "Em conferência", value: stats.emConferencia, color: "bg-indigo-500", icon: Clock },
          { label: "Aprovados", value: stats.aprovados, color: "bg-emerald-500", icon: CheckSquare },
          { label: "Com divergência", value: stats.comDivergencia, color: "bg-rose-500", icon: AlertTriangle },
          { label: "Aguard. medição", value: stats.aguardMedicao, color: "bg-amber-500", icon: Loader2 },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-[#E8ECF2] p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#6B7A90] uppercase tracking-wider">{c.label}</span>
              <c.icon size={14} className={c.color.replace('bg-', 'text-')} />
            </div>
            <span className="text-2xl font-bold text-[#0D1117]">{c.value}</span>
          </div>
        ))}
      </div>

      {/* Ambientes List */}
      <div className="flex flex-col gap-4">
        {ambientes.map((amb) => (
          <AmbienteCard 
            key={amb.id} 
            ambiente={amb} 
            conferentes={conferentes}
            canApprove={canApprove}
            orcamento={orcamento}
            onUpdate={() => qc.invalidateQueries({ queryKey: ["contrato-conferencia-full", id] })}
          />
        ))}
      </div>

      {/* Footer Sticky */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8ECF2] p-4 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 md:px-8">
          <div className="flex items-center gap-2 text-sm text-[#6B7A90]">
            <Info size={16} />
            {stats.todosAprovados 
              ? <span className="text-emerald-600 font-medium">Todos os ambientes aprovados! Pronto para fabricação.</span>
              : <span>Faltam {ambientes.length - stats.aprovados} ambientes para encaminhar à fabricação</span>
            }
          </div>
          <Button 
            disabled={!stats.todosAprovados}
            className={cn("gap-2 px-8", stats.todosAprovados ? "bg-emerald-600 hover:bg-emerald-700" : "bg-neutral-300")}
            onClick={handleFinalizarConferencia}
          >
            Encaminhar à fabricação <ArrowRight size={16} />
          </Button>
        </div>
      </div>
      <BotaoAjudaTecnica />
    </div>
  );
}

function AmbienteCard({ ambiente, conferentes, canApprove, orcamento, onUpdate }: { 
  ambiente: Ambiente; 
  conferentes: any[];
  canApprove: boolean;
  orcamento: any;
  onUpdate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { perfil } = useAuth();
  
  console.log('Ambiente:', ambiente.nome, 'Status:', ambiente.conferencia_status, 'ID:', ambiente.id);

  const isLiberado = ambiente.status_medicao === 'liberado_conferencia';
  const isBloqueado = !isLiberado;
  const inProgress = !!ambiente.conferente_id;
  const isAprovado = ambiente.conferencia_status === 'aprovada';
  const hasDivergencia = ambiente.conferencia_status === 'bloqueada' || (ambiente.variacao_pct !== null && ambiente.variacao_pct > 10);
  const aguardandoAprovGerente = hasDivergencia && !!ambiente.aprovacao_solicitada_em;

  const handleIniciar = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("contrato_ambientes")
      .update({ 
        conferente_id: perfil?.id,
        conferencia_status: 'pendente'
      })
      .eq("id", ambiente.id);
    
    if (error) toast.error(error.message);
    else {
      toast.success("Conferência iniciada!");
      setExpanded(true);
      onUpdate();
    }
    setLoading(false);
  };

  const handleImportXml = async (file: File) => {
    setUploading(true);
    try {
      const text = await file.text();
      const parsed = parsePromobXml(text);

      const target = norm(ambiente.nome);
      let cat = parsed.categorias.find((c) => norm(c.description) === target);
      if (!cat) cat = parsed.categorias.find((c) => norm(c.description).includes(target) || target.includes(norm(c.description)));

      const custoConferencia = cat?.pedido ?? parsed.total_pedido ?? 0;
      const itensConfer = cat?.itens ?? parsed.itens;

      let custoOriginal = Number(ambiente.custo_original) || 0;
      let itensOriginais: any[] = (ambiente.itens_original_json as any[]) || [];
      
      if ((!custoOriginal || itensOriginais.length === 0) && orcamento?.xml_raw) {
        try {
          const origParsed = parsePromobXml(orcamento.xml_raw);
          let oc = origParsed.categorias.find((c) => norm(c.description) === target);
          if (!oc) oc = origParsed.categorias.find((c) => norm(c.description).includes(target) || target.includes(norm(c.description)));
          if (oc) {
            custoOriginal = oc.pedido;
            itensOriginais = oc.itens as any[];
          }
        } catch {}
      }

      if (!custoOriginal && orcamento?.total_pedido) {
        custoOriginal = Number(orcamento.total_pedido) / Math.max(1, 1); 
      }

      if (!custoOriginal || custoOriginal <= 0) {
        toast.error("Não foi possível determinar o custo original. Vincule um orçamento.");
        return;
      }

      const variacao = ((custoConferencia - custoOriginal) / custoOriginal) * 100;
      const novoStatus: ConferenciaStatus = "pendente";

      const { error: error1 } = await supabase
        .from("contrato_ambientes")
        .update({
          custo_original: custoOriginal,
          custo_conferencia: custoConferencia,
          variacao_pct: Number(variacao.toFixed(2)),
          conferencia_status: novoStatus,
          conferencia_xml_raw: text,
          itens_original_json: itensOriginais as any,
          itens_conferencia_json: itensConfer as any,
          conferencia_aprovada_em: null,
          aprovacao_solicitada_em: null,
        } as any)
        .eq("id", ambiente.id);

      if (error1) throw error1;

      const { error: error2 } = await supabase
        .from("conferencia_ambientes")
        .upsert({
          contrato_id: ambiente.contrato_id,
          ambiente_id: ambiente.id,
          loja_id: ambiente.loja_id,
          custo_original: custoOriginal,
          custo_conferencia: custoConferencia,
          variacao_percentual: Number(variacao.toFixed(2)),
          status: 'em_conferencia',
          xml_conferencia_raw: text
        }, { onConflict: 'contrato_id,ambiente_id' });

      if (error2) throw error2;

      toast.success("XML importado com sucesso!");
      onUpdate();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao importar XML");
    } finally {
      setUploading(false);
    }
  };

  const aprovarAmbiente = async () => {
    const checklist = ambiente.checklist_json || {};
    const checklistComplete = CHECKLIST_ITEMS.every(item => !!checklist[item]);
    
    if (!checklistComplete) {
      toast.error("O checklist técnico precisa estar 100% preenchido.");
      return;
    }

    if (hasDivergencia && !canApprove) {
      toast.error("Ambiente com divergência crítica. Solicite aprovação do gerente.");
      return;
    }
    
    setLoading(true);
    try {
      const { error: error1 } = await supabase
        .from("contrato_ambientes")
        .update({ 
          conferencia_status: 'aprovada',
          conferencia_aprovada_em: new Date().toISOString()
        })
        .eq("id", ambiente.id);
      
      if (error1) throw error1;

      const { error: error2 } = await supabase
        .from("conferencia_ambientes")
        .update({ 
          status: 'aprovado',
          aprovado_por: perfil?.id,
          data_aprovacao: new Date().toISOString()
        })
        .eq('contrato_id', ambiente.contrato_id)
        .eq('ambiente_id', ambiente.id);

      if (error2) throw error2;

      toast.success("Ambiente aprovado! ✓");
      onUpdate();
    } catch (e: any) {
      toast.error(e.message || "Erro ao aprovar ambiente");
    } finally {
      setLoading(false);
    }
  };

  const solicitarAprovacao = async () => {
    const { error } = await supabase
      .from("contrato_ambientes")
      .update({
        aprovacao_solicitada_em: new Date().toISOString(),
        aprovacao_solicitada_por: perfil?.id
      })
      .eq("id", ambiente.id);
    
    if (error) toast.error(error.message);
    else {
      toast.success("Aprovação solicitada ao gerente");
      onUpdate();
    }
  };

  const aprovarComoGerente = async () => {
    const { data, error } = await supabase.rpc("aprovar_conferencia_ambiente", { _ambiente_id: ambiente.id });
    if (error) toast.error(error.message);
    else {
      toast.success("Conferência aprovada pelo gerente");
      onUpdate();
    }
  };

  return (
    <div className={cn(
      "bg-white rounded-xl border transition-all overflow-hidden",
      isBloqueado ? "opacity-60 border-neutral-200" : "border-[#E8ECF2] shadow-sm",
      expanded && "ring-2 ring-blue-500 ring-offset-2"
    )}>
      {/* Header do Card */}
      <div 
        className={cn(
          "p-4 flex items-center justify-between cursor-pointer",
          isBloqueado && "cursor-not-allowed"
        )}
        onClick={() => !isBloqueado && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="font-semibold text-[#0D1117]">{ambiente.nome}</span>
            <span className="text-xs text-[#6B7A90]">{fmtBRL(ambiente.valor_liquido)}</span>
          </div>
          
          <div className="flex gap-2">
            {isBloqueado ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-100 text-neutral-500 uppercase">
                <AlertCircle size={10} /> Bloqueado
              </span>
            ) : ambiente.conferencia_status === 'aprovada' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase">
                <CheckCircle2 size={10} /> Aprovado
              </span>
            ) : hasDivergencia ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700 uppercase">
                <AlertTriangle size={10} /> Divergência
              </span>
            ) : (ambiente.conferente_id || ambiente.conferencia_xml_raw) ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-700 uppercase">
                <Clock size={10} /> Em conferência
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700 uppercase">
                <CheckCircle2 size={10} /> Disponível
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!inProgress && isLiberado && (
            <Button size="sm" onClick={(e) => { e.stopPropagation(); handleIniciar(); }} disabled={loading}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : "Iniciar conferência"}
            </Button>
          )}
          {isLiberado && (
            expanded ? <ChevronUp size={20} className="text-[#6B7A90]" /> : <ChevronDown size={20} className="text-[#6B7A90]" />
          )}
        </div>
      </div>

      {/* Conteúdo Expandido */}
      {expanded && !isBloqueado && (
        <div className="border-t border-[#E8ECF2] p-6 bg-neutral-50 flex flex-col gap-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Esquerda: Atribuição e XML */}
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-[#6B7A90] uppercase">Conferente Responsável</label>
                <Select 
                  value={ambiente.conferente_id || ""} 
                  onValueChange={async (val) => {
                    const { error } = await supabase.from('contrato_ambientes').update({ conferente_id: val }).eq('id', ambiente.id);
                    if (error) toast.error(error.message);
                    else onUpdate();
                  }}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Selecionar conferente" />
                  </SelectTrigger>
                  <SelectContent>
                    {conferentes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-white rounded-lg border border-[#E8ECF2] p-4 flex flex-col gap-4">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <FileText size={16} className="text-blue-500" /> Comparativo XML
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1 p-3 rounded bg-neutral-50 border border-neutral-100">
                    <span className="text-[10px] text-[#6B7A90] uppercase font-bold">XML Original</span>
                    <span className="text-sm font-medium">{ambiente.nome}</span>
                    <span className="text-xs font-semibold text-blue-600">{fmtBRL(ambiente.custo_original || 0)}</span>
                  </div>
                  
                  {ambiente.conferencia_xml_raw ? (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col gap-1 p-3 rounded bg-neutral-50 border border-neutral-100 cursor-pointer hover:bg-neutral-100 transition-colors"
                    >
                      <span className="text-[10px] text-[#6B7A90] uppercase font-bold">XML Conferido</span>
                      <span className="text-sm font-medium">{ambiente.nome}</span>
                      <span className="text-xs font-semibold text-indigo-600">{fmtBRL(ambiente.custo_conferencia || 0)}</span>
                    </div>
                  ) : (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center border-2 border-dashed border-[#B0BAC9] rounded p-2 hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".xml" 
                        onChange={(e) => e.target.files?.[0] && handleImportXml(e.target.files[0])}
                      />
                      {uploading ? <Loader2 size={20} className="animate-spin text-blue-500" /> : (
                        <>
                          <Upload size={20} className="text-blue-500 mb-1" />
                          <span className="text-[10px] font-semibold text-blue-600">
                            Upload XML Conferido
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {ambiente.conferencia_xml_raw && (
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".xml" 
                    onChange={(e) => e.target.files?.[0] && handleImportXml(e.target.files[0])}
                  />
                )}

                {ambiente.variacao_pct !== null && (
                  <div className={cn(
                    "p-3 rounded-md flex flex-col gap-2",
                    ambiente.variacao_pct > 10 ? "bg-[#FCEBEB] border border-[#F9D7D7]" : 
                    ambiente.variacao_pct > 0 ? "bg-[#FAEEDA] border border-[#F5E1C1]" :
                    "bg-[#EAF3DE] border border-[#D9E9C3]"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-neutral-500">Variação de Custo</span>
                        <div className="flex items-baseline gap-2">
                          <span className={cn(
                            "text-sm font-semibold", 
                            ambiente.variacao_pct > 10 ? "text-[#791F1F]" : 
                            ambiente.variacao_pct > 0 ? "text-[#633806]" :
                            "text-[#27500A]"
                          )}>
                            {ambiente.variacao_pct > 10 ? '✕ Divergência crítica' : 
                             ambiente.variacao_pct > 0 ? '⚠ Atenção' : 
                             '✓ Dentro do esperado'}
                          </span>
                          <span className={cn(
                            "text-lg font-bold", 
                            ambiente.variacao_pct > 10 ? "text-[#791F1F]" : 
                            ambiente.variacao_pct > 0 ? "text-[#633806]" :
                            "text-[#27500A]"
                          )}>
                            {ambiente.variacao_pct > 0 ? '+' : ''}{ambiente.variacao_pct}%
                          </span>
                        </div>
                        <div className="text-[10px] font-medium text-neutral-600 mt-0.5">
                          {fmtBRL(ambiente.custo_original || 0)} → {fmtBRL(ambiente.custo_conferencia || 0)}
                        </div>
                      </div>
                      {ambiente.variacao_pct > 10 && (
                        <AlertTriangle size={18} className="text-[#791F1F]" />
                      )}
                    </div>

                    {ambiente.variacao_pct > 10 && !isAprovado && (
                      <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-rose-200">
                        <span className="text-[10px] text-rose-800 font-semibold uppercase">Ações necessárias:</span>
                        <div className="flex gap-2">
                          {!aguardandoAprovGerente ? (
                            <Button size="sm" variant="outline" className="h-7 text-[10px] bg-white border-rose-200 text-rose-700 hover:bg-rose-50" onClick={solicitarAprovacao}>
                              Solicitar aprovação do gestor
                            </Button>
                          ) : (
                            <span className="text-[9px] text-rose-600 font-bold bg-rose-100/50 px-2 py-1 rounded">Aprovação solicitada</span>
                          )}
                          <Button size="sm" variant="outline" className="h-7 text-[10px] bg-white border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => toast.info("Funcionalidade de cobrar diferença será implementada em breve.")}>
                            Cobrar diferença ao cliente
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 mt-2">
                  <input 
                    type="checkbox" 
                    id={`ferragens-${ambiente.id}`}
                    checked={ambiente.inclui_ferragens}
                    onChange={async (e) => {
                      await supabase.from('contrato_ambientes').update({ inclui_ferragens: e.target.checked }).eq('id', ambiente.id);
                      onUpdate();
                    }}
                    className="rounded border-[#B0BAC9] text-blue-600"
                  />
                  <label htmlFor={`ferragens-${ambiente.id}`} className="text-xs text-[#6B7A90]">XML inclui ferragens</label>
                </div>
              </div>
            </div>

            {/* Direita: Checklist */}
            <div className="bg-white rounded-lg border border-[#E8ECF2] p-5 flex flex-col gap-4">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <CheckSquare size={16} className="text-emerald-500" /> Checklist Técnico
              </h4>
              
              <div className="flex flex-col gap-3">
                {CHECKLIST_ITEMS.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      checked={!!(ambiente.checklist_json || {})[item]}
                      onChange={async (e) => {
                        const current = ambiente.checklist_json || {};
                        const next = { ...current, [item]: e.target.checked };
                        await supabase.from('contrato_ambientes').update({ checklist_json: next }).eq('id', ambiente.id);
                        onUpdate();
                      }}
                      className="rounded border-[#B0BAC9] h-4 w-4 text-emerald-600" 
                    />
                    <span className="text-xs text-[#4A5568]">{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-2 flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#6B7A90]">Obs:</label>
                <Textarea 
                  placeholder="Observações do ambiente..."
                  className="text-xs min-h-[80px]"
                  defaultValue={ambiente.observacoes_conferencia || ""}
                  onBlur={async (e) => {
                    if (e.target.value !== ambiente.observacoes_conferencia) {
                      await supabase.from('contrato_ambientes').update({ observacoes_conferencia: e.target.value }).eq('id', ambiente.id);
                      onUpdate();
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Itens Terceiros */}
          <div className="bg-white rounded-lg border border-[#E8ECF2] p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Package size={16} className="text-amber-500" /> Itens Terceiros / Extras
              </h4>
              <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 border-amber-500 text-amber-600 hover:bg-amber-50">
                <Plus size={12} /> Adicionar item terceiro
              </Button>
            </div>
            
            <div className="text-center py-6 text-neutral-400 text-xs italic bg-neutral-50 rounded border border-dashed">
              Nenhum item extra cadastrado.
            </div>
          </div>

          {/* Ações do Ambiente */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
             <div className="flex gap-2">
               {hasDivergencia && canApprove && (
                 <Button onClick={aprovarComoGerente} className="bg-rose-600 hover:bg-rose-700 text-xs gap-2">
                   <ShieldCheck size={14} /> Forçar Aprovação (Gerente)
                 </Button>
               )}
               {hasDivergencia && !canApprove && !aguardandoAprovGerente && (
                 <Button onClick={solicitarAprovacao} variant="outline" className="text-xs gap-2 border-rose-200 text-rose-600">
                   <Send size={14} /> Solicitar Aprovação Gerente
                 </Button>
               )}
               {aguardandoAprovGerente && (
                 <span className="text-xs text-rose-600 font-medium bg-rose-50 px-3 py-1.5 rounded-md flex items-center gap-2">
                   <Clock size={14} /> Aprovação solicitada ao gerente
                 </span>
               )}
             </div>
             
             <div className="flex gap-3">
               <Button variant="outline" className="text-xs gap-2" onClick={() => toast.success("Rascunho salvo!")}>
                 <Save size={14} /> Salvar rascunho
               </Button>
               <Button 
                onClick={aprovarAmbiente}
                disabled={
                  loading || 
                  !ambiente.conferencia_xml_raw || 
                  (ambiente.variacao_pct !== null && ambiente.variacao_pct > 10 && !canApprove && !isAprovado) ||
                  !CHECKLIST_ITEMS.every(item => !!(ambiente.checklist_json || {})[item])
                }
                className="bg-emerald-600 hover:bg-emerald-700 text-xs gap-2"
               >
                 {loading ? <Loader2 size={14} className="animate-spin" /> : "Aprovar ambiente"} <ArrowRight size={14} />
               </Button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
