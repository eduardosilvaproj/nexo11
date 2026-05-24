import { useEffect, useState, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Link2Off, 
  ArrowRight, 
  CheckCircle2, 
  FileText, 
  Download, 
  Check, 
  AlertCircle, 
  ShieldCheck, 
  MessageCircle, 
  Star,
  Calendar, 
  Camera, 
  Home, 
  User, 
  ChevronDown,
  X,
  FileSignature,
  Eraser,
  Printer,
  History,
  AlertTriangle,
  Upload,
  Truck,
  Wrench
} from "lucide-react";
import { LogoNexo } from "@/components/LogoNexo";
import { pdf } from "@react-pdf/renderer";
import { ContractPDF } from "@/components/contrato/ContractPDF";
import { Button } from "@/components/ui/button";
import { PortalChat } from "@/components/portal/PortalChat";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import SignatureCanvas from "react-signature-canvas";

const STAGE_LABELS: Record<string, string> = {
  comercial: "Comercial",
  tecnico: "Revisão Técnica",
  producao: "Produção",
  logistica: "Logística",
  montagem: "Montagem",
  pos_venda: "Pós-venda",
  finalizado: "Finalizado",
};

const formatDateTime = (date: any) => {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleString("pt-BR");
};

export default function PortalCliente() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [contracts, setContracts] = useState<any[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<"inicio" | "chat" | "agenda" | "documentos" | "pos-venda" | "satisfacao">("inicio");
  const [unreadMessages, setUnreadMessages] = useState(0);

  const [logs, setLogs] = useState<any[]>([]);
  const [ambientes, setAmbientes] = useState<any[]>([]);
  const [orcamentos, setOrcamentos] = useState<any[]>([]);
  const [entregaPrevista, setEntregaPrevista] = useState<string | null>(null);
  const [docsPortal, setDocsPortal] = useState<any[]>([]);
  const [chamados, setChamados] = useState<any[]>([]);
  const [isAbrirChamadoOpen, setIsAbrirChamadoOpen] = useState(false);
  const [chamadoForm, setChamadoForm] = useState({ tipo: "assistencia", ambiente: "", descricao: "" });
  const [pesquisasPendentes, setPesquisasPendentes] = useState<any[]>([]);
  const [pesquisaSelecionada, setPesquisaSelecionada] = useState<any | null>(null);
  const [npsForm, setNpsForm] = useState<{ nota: number | null, comentario: string, motivos: string[] }>({ nota: null, comentario: "", motivos: [] });

  const [signing, setSigning] = useState(false);
  const [nomeAssinatura, setNomeAssinatura] = useState("");
  const [isModalAssinaturaOpen, setIsModalAssinaturaOpen] = useState(false);
  const [assinaturaPasso, setAssinaturaPasso] = useState<1 | 2 | 3>(1);
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [dadosAssinaturaFinal, setDadosAssinaturaFinal] = useState<any>(null);
  const sigCanvas = useRef<SignatureCanvas>(null);

  const portalClient = useMemo(() => createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    {
      global: {
        headers: token ? { "x-portal-token": token } : {},
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    },
  ), [token]);

  const contrato = useMemo(() => 
    contracts.find(c => c.id === selectedContractId) || contracts[0]
  , [contracts, selectedContractId]);

  async function loadInitial() {
    if (!token) return;
    setLoading(true);
    try {
      const { data: originalId } = await portalClient.rpc('portal_token_contrato_id');

      if (!originalId) {
        setError("Link inválido ou expirado.");
        return;
      }

      const { data: c, error: cErr } = await portalClient
        .from("contratos")
        .select("*, lojas(*)")
        .eq("id", originalId)
        .maybeSingle();

      if (cErr || !c) {
        setError("Erro ao carregar dados do contrato.");
        return;
      }

      setContracts([c]);
      setSelectedContractId(c.id);
      
      const { count } = await portalClient
        .from("chat_mensagens")
        .select("*", { count: 'exact', head: true })
        .eq("remetente_tipo", "equipe")
        .eq("lida", false);
      
      setUnreadMessages(count || 0);
    } catch (e: any) {
      setError(e.message ?? "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }

  async function loadContractDetails(contractId: string) {
    if (!contractId) return;
    try {
      const [
        { data: l }, 
        { data: ents }, 
        { data: orcs }, 
        { data: ambs },
        { data: dp },
        { data: ch },
        { data: ps }
      ] = await Promise.all([
        portalClient.from("contrato_eventos").select("*").eq("contrato_id", contractId).eq("visivel_cliente", true).order("created_at", { ascending: false }),
        portalClient.from("entregas").select("*").eq("contrato_id", contractId).not("data_prevista", "is", null).limit(1),
        portalClient.from("orcamentos").select("*").eq("contrato_id", contractId),
        portalClient.from("contrato_ambientes").select("*").eq("contrato_id", contractId),
        portalClient.from("documentos_emitidos").select("*").eq("contrato_id", contractId).eq("visivel_cliente", true),
        portalClient.from("chamados_pos_venda").select("*").eq("contrato_id", contractId).order("created_at", { ascending: false }),
        portalClient.rpc('portal_cliente_obter_pesquisas')
      ]);

      setLogs(l ?? []);
      setOrcamentos(orcs ?? []);
      setAmbientes(ambs ?? []);
      setEntregaPrevista(ents?.[0]?.data_prevista ?? null);
      setDocsPortal(dp ?? []);
      setChamados(ch ?? []);
      setPesquisasPendentes(ps ?? []);
    } catch (e: any) {
      console.error("Erro ao carregar detalhes:", e);
    }
  }

  useEffect(() => { loadInitial(); }, [token]);
  useEffect(() => { if (selectedContractId) loadContractDetails(selectedContractId); }, [selectedContractId]);

  async function handleAbrirChamado() {
    if (!token || !contrato) return;
    setLoading(true);
    try {
      const { error } = await portalClient.from("chamados_pos_venda").insert({
        contrato_id: contrato.id,
        tipo: chamadoForm.tipo as any,
        descricao: chamadoForm.descricao,
        status: 'aberto',
      });
      if (error) throw error;

      // Registrar evento visível na timeline do cliente
      await portalClient.from("contrato_eventos").insert({
        contrato_id: contrato.id,
        loja_id: contrato.loja_id,
        tipo: 'chamado_aberto',
        modulo: 'pos_venda',
        titulo: 'Novo chamado aberto',
        descricao: chamadoForm.descricao.slice(0, 200),
        visivel_cliente: true,
      });
      toast.success("Chamado aberto com sucesso!");
      setIsAbrirChamadoOpen(false);
      loadContractDetails(contrato.id);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResponderPesquisa() {
    if (!token || !pesquisaSelecionada || npsForm.nota === null) return;
    setLoading(true);
    try {
      const { data, error } = await portalClient.rpc('portal_cliente_responder_pesquisa', {
        p_pesquisa_id: pesquisaSelecionada.id,
        p_nota: npsForm.nota,
        p_comentario: npsForm.comentario,
        p_motivos: npsForm.motivos
      });
      
      if (error) throw error;
      if (!(data as any).success) throw new Error((data as any).error);

      toast.success("Obrigado pela sua avaliação!");
      setPesquisaSelecionada(null);
      setNpsForm({ nota: null, comentario: "", motivos: [] });
      loadContractDetails(contrato.id);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  const stageLabel = STAGE_LABELS[contrato?.status] ?? contrato?.status;

  const renderContent = () => {
    if (!contrato) return null;
    switch (currentTab) {
      case "inicio":
        return (
          <div className="flex-1 p-6 space-y-6">
            <div className="bg-[#0a1628] rounded-[28px] p-6 text-white shadow-xl overflow-hidden relative">
               <div className="relative z-10">
                <p className="text-[10px] font-black uppercase text-[#00d4aa] mb-1">Status do Projeto</p>
                <h2 className="text-3xl font-black mb-4">{stageLabel}</h2>
                <div className="space-y-2">
                  <p className="text-sm font-bold opacity-70">{contrato.cliente_nome}</p>
                  <p className="text-xs font-medium opacity-50">Contrato #{contrato.id.slice(0, 8).toUpperCase()}</p>
                </div>
               </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase text-slate-400 pl-1">Linha do Tempo</h3>
              {logs.map((log) => (
                <div key={log.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex gap-4">
                  <div className="bg-blue-50 p-2 rounded-xl text-blue-600 h-fit"><Check size={18} /></div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{log.titulo}</h4>
                    <p className="text-xs text-slate-500">{log.descricao}</p>
                    <p className="text-[9px] font-bold text-slate-300 mt-2 uppercase">{formatDateTime(log.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case "agenda":
        return (
          <div className="flex-1 p-6 space-y-6">
            <div className="text-center mb-8">
              <Calendar size={48} className="text-blue-600 mx-auto mb-2" />
              <h2 className="text-2xl font-black text-slate-900">Agenda</h2>
            </div>
            {entregaPrevista ? (
              <div className="bg-[#0a1628] rounded-[32px] p-6 text-white shadow-xl">
                <Truck size={40} className="mb-4 text-[#00d4aa]" />
                <p className="text-xs font-bold opacity-50 uppercase mb-1">Previsão de Entrega</p>
                <h3 className="text-2xl font-black">{new Date(entregaPrevista).toLocaleDateString("pt-BR")}</h3>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-10 text-center border-dashed border-2 border-slate-200">
                <p className="text-sm font-medium text-slate-400">As datas de entrega e montagem serão confirmadas em breve.</p>
              </div>
            )}
          </div>
        );
      case "documentos":
        return (
          <div className="flex-1 p-6 space-y-6">
            <h2 className="text-xl font-black">Documentos</h2>
            {docsPortal.map((doc) => (
              <div key={doc.id} className="bg-white rounded-2xl p-4 shadow-sm border flex items-center gap-4">
                <FileText size={24} className="text-slate-400" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold truncate">{doc.titulo}</h4>
                  <p className="text-[10px] text-slate-500 uppercase">{doc.tipo}</p>
                </div>
                <Button variant="ghost" size="icon"><Download size={20} /></Button>
              </div>
            ))}
          </div>
        );
      case "pos-venda":
        return (
          <div className="flex-1 p-6 space-y-6 pb-32">
            <h2 className="text-xl font-black">Suporte</h2>
            <Button className="w-full h-16 bg-slate-900 rounded-2xl" onClick={() => setIsAbrirChamadoOpen(true)}>
              <Upload className="mr-2" /> Abrir Chamado
            </Button>
            {chamados.map((ch) => (
              <div key={ch.id} className="bg-white rounded-2xl p-5 shadow-sm border">
                <Badge className="mb-2">{ch.status.toUpperCase()}</Badge>
                <h4 className="text-sm font-bold">{ch.tipo}</h4>
                <p className="text-xs text-slate-600 line-clamp-2">{ch.descricao}</p>
              </div>
            ))}
          </div>
        );
      case "chat":
        return <PortalChat contractId={contrato.id} clientName={contrato.cliente_nome} portalClient={portalClient} />;
      case "satisfacao":
        return (
          <div className="flex-1 p-6 space-y-6">
            <h2 className="text-xl font-black">Satisfação</h2>
            {pesquisasPendentes.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border-dashed border-2 border-slate-200">
                <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
                <p className="text-sm font-medium text-slate-500">Nenhuma pesquisa pendente. Obrigado por estar conosco!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pesquisasPendentes.map((p) => (
                  <div key={p.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-purple-50 p-2 rounded-xl text-purple-600"><Star size={20} /></div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Avalie nossa etapa: {p.etapa.toUpperCase()}</h4>
                        <p className="text-xs text-slate-500">Sua opinião nos ajuda a melhorar.</p>
                      </div>
                    </div>
                    <Button 
                      className="w-full bg-[#0a1628]" 
                      onClick={() => {
                        setPesquisaSelecionada(p);
                        setNpsForm({ nota: null, comentario: "", motivos: [] });
                      }}
                    >
                      Responder agora
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      default: return null;
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center p-6 text-center">{error}</div>;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] items-center">
      <div className="w-full max-w-[390px] min-h-screen bg-white shadow-2xl flex flex-col relative overflow-hidden">
        <header className="px-6 py-8 flex flex-col gap-4">
          <LogoNexo size="sm" xColor="#00d4aa" />
        </header>
        <main className="flex-1 flex flex-col pb-24">{renderContent()}</main>
        <nav className="fixed bottom-0 w-full max-w-[390px] bg-white border-t flex justify-around p-3 pb-6 z-50">
          {[
            { id: "inicio", icon: Home, label: "Início" },
            { id: "agenda", icon: Calendar, label: "Agenda" },
            { id: "documentos", icon: FileText, label: "Docs" },
            { id: "satisfacao", icon: Star, label: "Avaliar", badge: pesquisasPendentes.length },
            { id: "chat", icon: MessageCircle, label: "Chat", badge: unreadMessages },
          ].map((item) => (
            <button key={item.id} onClick={() => setCurrentTab(item.id as any)} className={cn("flex flex-col items-center gap-1", currentTab === item.id ? "text-[#0a1628]" : "text-slate-400")}>
              <item.icon size={22} />
              <span className="text-[10px] font-bold uppercase">{item.label}</span>
            </button>
          ))}
        </nav>

        <Dialog open={isAbrirChamadoOpen} onOpenChange={setIsAbrirChamadoOpen}>
          <DialogContent className="max-w-[90vw] rounded-3xl">
            <DialogHeader><DialogTitle>Abrir Chamado</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={chamadoForm.tipo} onValueChange={(v) => setChamadoForm({...chamadoForm, tipo: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assistencia">Assistência</SelectItem>
                    <SelectItem value="duvida">Dúvida</SelectItem>
                    <SelectItem value="ajuste">Ajuste</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={chamadoForm.descricao} onChange={(e) => setChamadoForm({...chamadoForm, descricao: e.target.value})} placeholder="Descreva sua solicitação..." />
              </div>
            </div>
            <DialogFooter>
              <Button className="w-full bg-[#0a1628]" onClick={handleAbrirChamado}>Enviar Solicitação</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!pesquisaSelecionada} onOpenChange={(open) => !open && setPesquisaSelecionada(null)}>
          <DialogContent className="max-w-[95vw] rounded-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Pesquisa de Satisfação</DialogTitle>
              <DialogDescription>
                Em uma escala de 0 a 10, o quanto você recomendaria a nossa empresa para um amigo ou familiar?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="flex flex-wrap justify-center gap-2">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setNpsForm({ ...npsForm, nota: n })}
                    className={cn(
                      "w-10 h-10 rounded-xl font-black text-sm border-2 transition-all",
                      npsForm.nota === n 
                        ? "bg-[#0a1628] text-white border-[#0a1628]" 
                        : "bg-white text-slate-600 border-slate-100 hover:border-slate-300"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
              
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase px-2">
                <span>Pouco provável</span>
                <span>Muito provável</span>
              </div>

              {npsForm.nota !== null && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500">O que motivou sua nota?</Label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'atendimento', label: 'Atendimento' },
                        { id: 'prazo', label: 'Prazo' },
                        { id: 'qualidade_produto', label: 'Qualidade Produto' },
                        { id: 'qualidade_montagem', label: 'Montagem' },
                        { id: 'comunicacao', label: 'Comunicação' },
                        { id: 'limpeza_organizacao', label: 'Limpeza' },
                        { id: 'pos_venda', label: 'Pós-venda' },
                        { id: 'outro', label: 'Outro' }
                      ].map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            const newMotivos = npsForm.motivos.includes(m.id)
                              ? npsForm.motivos.filter(i => i !== m.id)
                              : [...npsForm.motivos, m.id];
                            setNpsForm({ ...npsForm, motivos: newMotivos });
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all",
                            npsForm.motivos.includes(m.id)
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-slate-50 text-slate-500 border-slate-100"
                          )}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500">Conte-nos mais (opcional)</Label>
                    <Textarea 
                      placeholder="Sua mensagem..."
                      className="rounded-2xl border-slate-100 text-sm h-24"
                      value={npsForm.comentario}
                      onChange={(e) => setNpsForm({ ...npsForm, comentario: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                className="w-full bg-[#0a1628] h-12 rounded-2xl font-bold" 
                disabled={npsForm.nota === null || loading}
                onClick={handleResponderPesquisa}
              >
                Enviar Avaliação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
