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
  Calendar, 
  Camera, 
  Home, 
  User, 
  ChevronDown,
  X,
  FileSignature,
  Eraser,
  Printer
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

async function gerarHash(contratoId: string, nome: string, timestamp: string) {
  const dados = `${contratoId}-${nome}-${timestamp}`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(dados);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
function trimCanvas(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;
  let top = height, bottom = 0, left = width, right = 0;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 0) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }

  // Se não houver nada desenhado, retorna o original ou um canvas vazio de 1x1
  if (bottom < top || right < left) {
    return canvas;
  }

  const trimmed = document.createElement('canvas');
  trimmed.width = right - left + 1;
  trimmed.height = bottom - top + 1;
  const trimmedCtx = trimmed.getContext('2d');
  if (trimmedCtx) {
    trimmedCtx.putImageData(
      ctx.getImageData(left, top, trimmed.width, trimmed.height), 0, 0
    );
  }
  return trimmed;
}


export default function PortalCliente() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [contracts, setContracts] = useState<any[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<"inicio" | "chat" | "agenda" | "conta">("inicio");
  const [unreadMessages, setUnreadMessages] = useState(0);

  // States for the selected contract
  const [logs, setLogs] = useState<any[]>([]);
  const [ambientes, setAmbientes] = useState<any[]>([]);
  const [orcamentos, setOrcamentos] = useState<any[]>([]);
  const [entregaPrevista, setEntregaPrevista] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [nomeAssinatura, setNomeAssinatura] = useState("");
  const [isModalAssinaturaOpen, setIsModalAssinaturaOpen] = useState(false);
  const [assinaturaPasso, setAssinaturaPasso] = useState<1 | 2 | 3>(1);
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [dadosAssinaturaFinal, setDadosAssinaturaFinal] = useState<any>(null);
  const [mostrandoContratoCompleto, setMostrandoContratoCompleto] = useState(false);
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
      // Obter o ID do contrato original vinculado ao token
      const { data: originalIdData } = await portalClient.rpc('portal_token_contrato_id');
      const originalId = typeof originalIdData === 'string' ? originalIdData : null;

      const { data: c, error: cErr } = await portalClient
        .from("contratos")
        .select("*, lojas(*), contrato_ambientes(nome)")
        .order("created_at", { ascending: false });

      if (cErr || !c || c.length === 0) {
        setError("Link inválido ou expirado.");
        return;
      }

      setContracts(c);
      
      // Define o contrato selecionado: o original do token ou o mais recente
      const initialContract = c.find(item => item.id === originalId) || c[0];
      setSelectedContractId(initialContract.id);
      
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
        { data: ambs }
      ] = await Promise.all([
        portalClient
          .from("contrato_logs")
          .select("*")
          .eq("contrato_id", contractId)
          .order("created_at", { ascending: false }),
        portalClient
          .from("entregas")
          .select("data_prevista")
          .eq("contrato_id", contractId)
          .not("data_prevista", "is", null)
          .order("data_prevista", { ascending: true })
          .limit(1),
        portalClient
          .from("orcamentos")
          .select("*")
          .eq("contrato_id", contractId)
          .order("created_at", { ascending: false }),
        portalClient
          .from("contrato_ambientes")
          .select("*")
          .eq("contrato_id", contractId),
      ]);

      setLogs(l ?? []);
      setOrcamentos(orcs ?? []);
      setAmbientes(ambs ?? []);
      setEntregaPrevista((ents?.[0] as any)?.data_prevista ?? null);
    } catch (e: any) {
      console.error("Erro ao carregar detalhes do contrato:", e);
    }
  }

  useEffect(() => {
    loadInitial();
  }, [token]);

  useEffect(() => {
    if (selectedContractId) {
      loadContractDetails(selectedContractId);
    }
  }, [selectedContractId]);

  // Real-time for unread messages
  useEffect(() => {
    if (!token) return;
    const channel = portalClient
      .channel("portal_unread_global")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_mensagens",
        },
        (payload: any) => {
          const msg = payload.new;
          if (msg.remetente_tipo === "equipe") {
            setUnreadMessages(prev => prev + 1);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_mensagens",
        },
        () => {
          // Re-fetch count on update (read)
          portalClient
            .from("chat_mensagens")
            .select("*", { count: 'exact', head: true })
            .eq("remetente_tipo", "equipe")
            .eq("lida", false)
            .then(({ count }) => setUnreadMessages(count || 0));
        }
      )
      .subscribe();

    return () => {
      portalClient.removeChannel(channel);
    };
  }, [token, portalClient]);

  async function handleAssinarContrato() {
    if (!token || !contrato) return;
    
    const nomeDigitado = nomeAssinatura.trim().toLowerCase();
    const nomeCliente = contrato.cliente_nome.trim().toLowerCase();
    
    if (nomeDigitado !== nomeCliente) {
      toast.error(`O nome digitado deve ser idêntico ao cadastrado: ${contrato.cliente_nome}`);
      return;
    }
    
    if (!aceitouTermos) {
      toast.error("Você deve aceitar os termos do contrato.");
      return;
    }

    if (sigCanvas.current?.isEmpty()) {
      toast.error("Por favor, faça sua assinatura no campo indicado.");
      return;
    }

    setSigning(true);
    try {
      const rawCanvas = sigCanvas.current?.getCanvas();
      const assinaturaBase64 = rawCanvas ? trimCanvas(rawCanvas).toDataURL('image/png') : null;

      let ip = "0.0.0.0";
      try {
        const resp = await fetch("https://api.ipify.org?format=json");
        const json = await resp.json();
        ip = json.ip;
      } catch (err) {
        console.warn("Não foi possível obter IP:", err);
      }

      const timestamp = new Date().toISOString();
      const hash = await gerarHash(contrato.id, nomeAssinatura.trim(), timestamp);

      // 1. Upload da imagem da assinatura para o Storage
      const signatureFileName = `sig_${contrato.id}_${Date.now()}.png`;
      const signatureFilePath = `assinaturas/${signatureFileName}`;
      
      // Converter base64 para blob
      const res = await fetch(assinaturaBase64!);
      const blobSig = await res.blob();

      // Corrigindo para usar o bucket correto 'assinaturas' conforme a estrutura do portal
      const { error: uploadSigError } = await portalClient.storage
        .from('assinaturas')
        .upload(signatureFilePath, blobSig, {
          contentType: 'image/png',
          upsert: true
        });

      if (uploadSigError) throw uploadSigError;

      const { data: { publicUrl: signatureUrl } } = portalClient.storage
        .from('assinaturas')
        .getPublicUrl(signatureFilePath);

      // 2. Chamar RPC para registrar assinatura
      const { data, error } = await portalClient.rpc(
        "portal_assinar_contrato" as any,
        { 
          _token: token,
          _nome: nomeAssinatura.trim(),
          _ip: ip,
          _user_agent: navigator.userAgent,
          _assinatura_imagem_url: signatureUrl,
          _hash: hash,
          _data_assinatura: timestamp
        }
      );
      if (error) throw error;
      const r = data as { ok: boolean; erro?: string; hash: string; data_assinatura: string; contrato_id: string };
      if (!r?.ok) throw new Error(r?.erro ?? "Erro ao assinar");

      const contratoComAssinatura = {
        ...contrato,
        assinado: true,
        data_assinatura: r.data_assinatura,
        assinatura_nome: nomeAssinatura.trim(),
        assinatura_ip: ip,
        assinatura_hash: r.hash,
        assinatura_imagem_url: signatureUrl
      };

      // 3. Gerar PDF e fazer upload
      const doc = (
        <ContractPDF
          contrato={contratoComAssinatura}
          loja={contrato.lojas}
          ambientes={ambientes}
          orcamentos={orcamentos}
        />
      );
      const blob = await pdf(doc).toBlob();
      const fileName = `contrato_${r.contrato_id}_assinado.pdf`;
      const filePath = `${r.contrato_id}/${fileName}`;

      const { error: uploadError } = await portalClient.storage
        .from('contratos-assinados')
        .upload(filePath, blob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = portalClient.storage
        .from('contratos-assinados')
        .getPublicUrl(filePath);

      await portalClient
        .from('contratos')
        .update({ url_contrato_assinado: publicUrl })
        .eq('id', r.contrato_id);

      toast.success("Contrato assinado com sucesso!");
      
      setDadosAssinaturaFinal({
        hash: r.hash,
        data: r.data_assinatura,
        ip: ip,
        nome: nomeAssinatura.trim(),
        url_pdf: publicUrl
      });
      
      setAssinaturaPasso(3);
      
      // Update local state
      setContracts(prev => prev.map(c => c.id === r.contrato_id ? { 
        ...c, 
        assinado: true, 
        data_assinatura: r.data_assinatura, 
        assinado_em: r.data_assinatura,
        assinado_nome: nomeAssinatura.trim(),
        assinatura_hash: r.hash,
        assinatura_imagem_url: signatureUrl,
        url_contrato_assinado: publicUrl,
        status: 'tecnico'
      } : c));
      
      // Force refresh logs
      loadContractDetails(r.contrato_id);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message ?? "Não foi possível assinar o contrato");
    } finally {
      setSigning(false);
    }
  }

  const handleDownloadContrato = async () => {
    try {
      const doc = (
        <ContractPDF
          contrato={contrato}
          loja={contrato.lojas}
          ambientes={ambientes}
          orcamentos={orcamentos}
        />
      );
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `contrato_${contrato.id.slice(0, 8)}_${contrato.cliente_nome.replace(/\s+/g, '_')}.pdf`;
      link.click();
    } catch (e: any) {
      toast.error("Erro ao gerar PDF");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#00d4aa] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-slate-500">Carregando portal...</span>
        </div>
      </div>
    );
  }

  if (error || !contrato) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] px-6">
        <LogoNexo size="lg" xColor="#00d4aa" className="mb-8" />
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center w-full max-w-[400px]">
          <Link2Off className="mx-auto mb-4 text-slate-300" size={48} />
          <h1 className="text-xl font-bold text-slate-900">Link expirado</h1>
          <p className="text-sm text-slate-500 mt-2">
            Este link de acesso não é mais válido. Entre em contato com a equipe NEXO para receber um novo código.
          </p>
          <Button 
            className="w-full mt-6 bg-[#0a1628] hover:bg-[#112240]"
            onClick={() => window.location.href = '/portal'}
          >
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  }

  const stageLabel = STAGE_LABELS[contrato.status] ?? contrato.status;

  const renderContent = () => {
    switch (currentTab) {
      case "chat":
        return (
          <div className="flex-1 flex flex-col">
            <PortalChat 
              contractId={contrato.id} 
              clientName={contrato.cliente_nome} 
              portalClient={portalClient} 
            />
          </div>
        );
      case "agenda":
        return (
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
            <Calendar size={64} className="text-slate-200 mb-4" />
            <h2 className="text-lg font-bold text-slate-900">Agenda de Serviços</h2>
            <p className="text-sm text-slate-500 mt-2">
              Aqui você poderá acompanhar as datas de medição, entrega e montagem.
            </p>
            {entregaPrevista && (
              <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100 w-full">
                <p className="text-xs font-bold text-amber-600 uppercase">Previsão de Entrega</p>
                <p className="text-lg font-bold text-slate-900 mt-1">
                  {new Date(entregaPrevista).toLocaleDateString("pt-BR", { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
            )}
          </div>
        );
      case "conta":
        return (
          <div className="flex-1 p-6 space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <User size={32} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{contrato.cliente_nome}</h2>
                  <p className="text-sm text-slate-500">{contrato.cliente_contato || 'NEXO Cliente'}</p>
                </div>
              </div>
              <div className="space-y-4 pt-4 border-t border-slate-50">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Loja de Origem</label>
                  <p className="text-sm font-medium text-slate-900">{contrato.lojas?.nome || 'NEXO Centro'}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Endereço da Loja</label>
                  <p className="text-sm font-medium text-slate-900">
                    {contrato.lojas?.cidade ? `${contrato.lojas.cidade} - ${contrato.lojas.estado || ''}` : 'NEXO Centro'}
                  </p>
                </div>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full py-6 text-red-500 border-red-100 hover:bg-red-50 hover:text-red-600 rounded-2xl"
              onClick={() => window.location.href = '/portal'}
            >
              Sair do Portal
            </Button>
          </div>
        );
      default:
        return (
          <div className="flex-1 p-5 space-y-5 pb-24">
            {/* Saudação */}
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Olá, {contrato.cliente_nome.split(' ')[0]} 👋</h1>
              <p className="text-slate-500 font-medium">Seu pedido está em andamento</p>
            </div>

            {/* Banner Amarelo de Assinatura ou Card Verde de Sucesso */}
            {!contrato.assinado ? (
              <div className="bg-[#fff9e6] border border-[#ffe082] rounded-2xl p-4 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-3">
                  <div className="bg-[#ffd700] p-2 rounded-full">
                    <FileText size={18} className="text-[#856404]" />
                  </div>
                  <span className="text-sm font-bold text-[#856404]">Contrato aguardando sua assinatura</span>
                </div>
                <Button 
                  size="sm"
                  onClick={() => {
                    setAssinaturaPasso(1);
                    setIsModalAssinaturaOpen(true);
                  }}
                  className="bg-[#ff8c00] hover:bg-[#e67e00] text-white font-bold rounded-xl px-4"
                >
                  Assinar
                </Button>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500 p-2 rounded-full">
                    <Check size={18} className="text-white" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-emerald-800 block">Contrato Assinado ✓</span>
                    <span className="text-[10px] text-emerald-600 font-medium">
                      Assinado em {new Date(contrato.data_assinatura).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
                <Button 
                  size="sm"
                  variant="ghost"
                  onClick={handleDownloadContrato}
                  className="text-emerald-700 hover:bg-emerald-100 font-bold rounded-xl"
                >
                  <Download size={16} className="mr-1" /> PDF
                </Button>
              </div>
            )}

            {/* Card de Status Verde */}
            <div className="bg-[#00d4aa] rounded-3xl p-6 text-white shadow-lg shadow-[#00d4aa]/20 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider opacity-90">Etapa Atual</span>
                </div>
                <h2 className="text-2xl font-black">{stageLabel}</h2>
                {entregaPrevista && (
                  <div className="mt-4 pt-4 border-t border-white/20">
                    <p className="text-xs font-bold uppercase opacity-80">Previsão de Entrega</p>
                    <p className="text-lg font-bold">
                      {new Date(entregaPrevista).toLocaleDateString("pt-BR", { day: '2-digit', month: 'long' })}
                    </p>
                  </div>
                )}
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-10">
                <CheckCircle2 size={120} />
              </div>
            </div>

            {/* Grid 2x2 de Botões */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-1">O que você precisa?</h3>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setCurrentTab("chat")}
                  className="bg-[#0a1628] rounded-3xl p-5 text-left flex flex-col gap-3 relative overflow-hidden transition-transform active:scale-95 shadow-md h-32"
                >
                  <MessageCircle size={28} className="text-[#00d4aa]" />
                  <span className="text-white font-bold text-sm leading-tight">Chat com a equipe</span>
                  {unreadMessages > 0 && (
                    <Badge className="absolute top-4 right-4 bg-red-500 hover:bg-red-500 text-white border-none px-2 min-w-[20px] h-5 flex items-center justify-center font-bold">
                      {unreadMessages}
                    </Badge>
                  )}
                </button>
                
                <button 
                  onClick={() => setCurrentTab("agenda")}
                  className="bg-[#fff4e6] rounded-3xl p-5 text-left flex flex-col gap-3 transition-transform active:scale-95 shadow-sm border border-[#ffe8cc] h-32"
                >
                  <Calendar size={28} className="text-[#ff922b]" />
                  <span className="text-[#862e08] font-bold text-sm leading-tight">Agenda</span>
                </button>
                
                <button 
                  onClick={() => toast.info("Em breve!")}
                  className="bg-[#e6fcf5] rounded-3xl p-5 text-left flex flex-col gap-3 transition-transform active:scale-95 shadow-sm border border-[#c3fae8] h-32"
                >
                  <Camera size={28} className="text-[#099268]" />
                  <span className="text-[#084c3e] font-bold text-sm leading-tight">Fotos da montagem</span>
                </button>
                
                <button 
                  onClick={handleDownloadContrato}
                  className="bg-[#f3f0ff] rounded-3xl p-5 text-left flex flex-col gap-3 transition-transform active:scale-95 shadow-sm border border-[#e5dbff] h-32"
                >
                  <FileText size={28} className="text-[#7950f2]" />
                  <span className="text-[#3b1c9b] font-bold text-sm leading-tight">2ª via do contrato</span>
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="bg-[#f8fafc] min-h-screen flex flex-col items-center">
      {/* Container mobile-first */}
      <div className="w-full max-w-[390px] min-h-screen bg-white shadow-xl flex flex-col relative">
        
        {/* Header Escuro */}
        <header className="bg-[#0a1628] p-5 pt-8 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
              <LogoNexo size="md" xColor="#00d4aa" className="text-white" />
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                Portal do Cliente · NEXO Centro
              </span>
            </div>
            
            {/* Seletor de Contrato */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="bg-white/5 hover:bg-white/10 text-white p-2 px-3 rounded-2xl flex items-center gap-2 border border-white/10 transition-colors">
                  <div className="text-left leading-tight">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Ambiente</p>
                    <p className="text-xs font-bold truncate max-w-[100px]">
                      {ambientes[0]?.nome || contrato.lojas?.nome || 'Principal'}
                    </p>
                  </div>
                  <div className="relative">
                    <ChevronDown size={16} className="text-slate-400" />
                    {contracts.length > 1 && (
                      <Badge className="absolute -top-4 -right-2 bg-[#00d4aa] text-[#0a1628] border-none text-[10px] h-4 w-4 p-0 flex items-center justify-center font-black">
                        {contracts.length}
                      </Badge>
                    )}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[200px] bg-[#0a1628] border-white/10 p-2 text-white">
                <p className="text-[10px] font-bold text-slate-400 uppercase p-2 border-b border-white/5 mb-1">Seus Contratos</p>
                {contracts.map((c) => (
                  <DropdownMenuItem 
                    key={c.id} 
                    className={cn(
                      "flex flex-col items-start gap-1 p-3 rounded-xl cursor-pointer focus:bg-white/5 focus:text-white",
                      selectedContractId === c.id && "bg-white/10"
                    )}
                    onClick={() => setSelectedContractId(c.id)}
                  >
                    <span className="font-bold text-sm">Contrato #{c.id.slice(0, 8).toUpperCase()}</span>
                    <span className="text-[10px] text-slate-300 font-medium">
                      {(c.contrato_ambientes || []).map((a: any) => a.nome).join(' + ') || 'Sem ambientes'} · criado em {new Date(c.created_at).toLocaleDateString("pt-BR")}
                    </span>
                    <Badge variant="outline" className="text-[9px] uppercase tracking-tighter h-4 px-1.5 border-white/20 text-slate-400 font-bold mt-1">
                      {STAGE_LABELS[c.status] || c.status}
                    </Badge>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Conteúdo Principal */}
        <main className="flex-1 flex flex-col bg-[#f8fafc]">
          {renderContent()}
        </main>

        {/* Bottom Nav */}
        <nav className="fixed bottom-0 w-full max-w-[390px] bg-white border-t border-slate-100 flex items-center justify-around p-3 pb-6 z-50">
          {[
            { id: "inicio", icon: Home, label: "Início" },
            { id: "chat", icon: MessageCircle, label: "Chat", badge: unreadMessages },
            { id: "agenda", icon: Calendar, label: "Agenda" },
            { id: "conta", icon: User, label: "Conta" }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id as any)}
              className={cn(
                "flex flex-col items-center gap-1 p-2 min-w-[64px] transition-all rounded-2xl relative",
                currentTab === item.id ? "text-[#0a1628]" : "text-slate-400"
              )}
            >
              <div className={cn(
                "p-2 rounded-xl transition-colors",
                currentTab === item.id ? "bg-slate-50" : "bg-transparent"
              )}>
                <item.icon size={22} strokeWidth={currentTab === item.id ? 2.5 : 2} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
              {item.badge ? (
                <Badge className="absolute top-2 right-4 bg-red-500 text-white border-none h-4 min-w-[16px] p-0 flex items-center justify-center text-[9px] font-black">
                  {item.badge}
                </Badge>
              ) : null}
            </button>
          ))}
        </nav>

        {/* Modal de Assinatura Redesenhado (Fluxo de 3 Telas) */}
        <Dialog open={isModalAssinaturaOpen} onOpenChange={(open) => {
          if (!open) {
            setIsModalAssinaturaOpen(false);
            setMostrandoContratoCompleto(false);
          }
        }}>
          <DialogContent className={cn(
            "rounded-t-[32px] sm:rounded-3xl p-0 overflow-hidden border-none gap-0",
            mostrandoContratoCompleto ? "max-w-[100vw] h-[100vh] sm:max-w-[800px] sm:h-[90vh]" : "max-w-[100vw] sm:max-w-[400px]"
          )}>
            {mostrandoContratoCompleto ? (
              <div className="flex flex-col h-full bg-white">
                <header className="bg-[#0a1628] p-4 flex items-center justify-between text-white">
                  <h3 className="font-bold">Contrato Completo</h3>
                  <button onClick={() => setMostrandoContratoCompleto(false)} className="p-2">
                    <X size={24} />
                  </button>
                </header>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 text-[13px] leading-relaxed text-slate-800 font-serif bg-slate-50">
                  <div className="bg-white p-8 shadow-sm rounded-sm max-w-2xl mx-auto border border-slate-200">
                    <h1 className="text-center font-bold text-base mb-6">CONTRATO DE PRESTAÇÃO DE SERVIÇOS E FORNECIMENTO DE MÓVEIS PLANEJADOS SOB MEDIDA</h1>
                    <p className="mb-4 text-justify">
                      Pelo presente instrumento particular, de um lado, <strong>{contrato.lojas?.nome || 'DIAS & DIAS'}</strong>... doravante denominada CONTRATADA; e de outro lado, <strong>{contrato.cliente_nome}</strong>... doravante denominado(a) CONTRATANTE...
                    </p>
                    <div className="space-y-6">
                      <div>
                        <p className="font-bold">CLÁUSULA PRIMEIRA - DO OBJETO</p>
                        <p>O presente contrato tem por objeto a prestação de serviços de projeto, fabricação e instalação de móveis planejados sob medida...</p>
                      </div>
                      <div>
                        <p className="font-bold">CLÁUSULA SÉTIMA - DO PREÇO E DO PAGAMENTO</p>
                        <p>Pelo objeto deste contrato, o CONTRATANTE pagará o valor total de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contrato.valor_venda || 0)}...</p>
                      </div>
                      <p className="text-center italic mt-12 opacity-50 text-[10px]">As demais 17 cláusulas estão disponíveis no documento PDF para download.</p>
                    </div>
                  </div>
                </div>
                <footer className="p-4 bg-white border-t border-slate-100">
                  <Button 
                    className="w-full bg-[#0a1628] rounded-2xl h-12"
                    onClick={() => setMostrandoContratoCompleto(false)}
                  >
                    Voltar para Assinatura
                  </Button>
                </footer>
              </div>
            ) : (
              <>
                {/* TELA 1: REVISÃO */}
                {assinaturaPasso === 1 && (
                  <div className="flex flex-col bg-white">
                    <header className="bg-[#0a1628] p-6 text-white">
                      <div className="flex items-center gap-3 mb-1">
                        <FileSignature className="text-[#00d4aa]" size={20} />
                        <h3 className="text-xl font-bold">Assinatura de Contrato</h3>
                      </div>
                      <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Passo 1 de 3: Revisão</p>
                    </header>
                    
                    <div className="p-6 space-y-6">
                      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Contrato</p>
                            <p className="font-bold text-slate-900">#{contrato.id.slice(0, 8).toUpperCase()}</p>
                          </div>
                          <Badge className="bg-[#00d4aa] text-[#0a1628] border-none font-bold">Aguardando</Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3 pt-2">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Cliente</p>
                            <p className="text-sm font-semibold text-slate-700">{contrato.cliente_nome}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Ambientes</p>
                            <p className="text-sm font-semibold text-slate-700">
                              {(contrato.contrato_ambientes || []).map((a: any) => a.nome).join(' + ')}
                            </p>
                          </div>
                          <div className="flex justify-between border-t border-slate-200 pt-3 mt-1">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Valor Total</p>
                              <p className="text-lg font-black text-[#00d4aa]">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contrato.valor_venda || 0)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Parcelas</p>
                              <p className="text-sm font-bold text-slate-700">
                                {Array.isArray(contrato.parcelas_datas) ? contrato.parcelas_datas.length : 0}x
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <Button 
                          variant="outline" 
                          className="w-full h-12 rounded-2xl border-slate-200 text-slate-600 font-bold flex items-center justify-between px-6 group"
                          onClick={() => setMostrandoContratoCompleto(true)}
                        >
                          Ler contrato completo
                          <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                        </Button>
                        
                        <Button 
                          className="w-full h-14 bg-[#00d4aa] hover:bg-[#00c29b] text-[#0a1628] font-black text-base rounded-2xl shadow-lg shadow-[#00d4aa]/20"
                          onClick={() => setAssinaturaPasso(2)}
                        >
                          Avançar para assinar
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TELA 2: ASSINATURA */}
                {assinaturaPasso === 2 && (
                  <div className="flex flex-col bg-white">
                    <header className="bg-[#0a1628] p-6 text-white">
                      <div className="flex items-center gap-3 mb-1">
                        <ShieldCheck className="text-[#00d4aa]" size={20} />
                        <h3 className="text-xl font-bold">Assinar digitalmente</h3>
                      </div>
                      <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Passo 2 de 3: Assinatura Manuscrítica</p>
                    </header>
                    
                    <div className="p-6 space-y-5">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase">Seu nome completo</Label>
                        <Input 
                          placeholder={contrato.cliente_nome}
                          value={nomeAssinatura}
                          onChange={(e) => setNomeAssinatura(e.target.value)}
                          className="h-12 rounded-xl border-slate-200 focus:ring-[#00d4aa]"
                        />
                        <p className="text-[9px] text-slate-400 italic">Deve ser exatamente como no contrato</p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase">Assine no quadro abaixo</Label>
                          <button 
                            onClick={() => sigCanvas.current?.clear()}
                            className="text-[10px] font-bold text-red-400 uppercase flex items-center gap-1"
                          >
                            <Eraser size={12} /> Limpar
                          </button>
                        </div>
                        <div className="border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 relative h-40 overflow-hidden">
                          <SignatureCanvas 
                            ref={sigCanvas}
                            penColor="#0a1628"
                            canvasProps={{
                              className: "w-full h-full cursor-crosshair"
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                            <span className="text-xs font-medium text-slate-400">Toque aqui para assinar</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <Checkbox 
                          id="terms-check" 
                          checked={aceitouTermos}
                          onCheckedChange={(v) => setAceitouTermos(!!v)}
                          className="mt-0.5"
                        />
                        <label htmlFor="terms-check" className="text-[11px] leading-relaxed text-slate-500 font-medium">
                          Li e aceito todos os termos do contrato e estou ciente da validade jurídica desta assinatura.
                        </label>
                      </div>
                      
                      <div className="flex flex-col gap-2 pt-2">
                        <Button 
                          className="w-full h-14 bg-[#00d4aa] hover:bg-[#00c29b] text-[#0a1628] font-black text-base rounded-2xl shadow-lg shadow-[#00d4aa]/20 disabled:opacity-50 disabled:bg-slate-200 disabled:shadow-none"
                          onClick={handleAssinarContrato}
                          disabled={signing || !aceitouTermos || !nomeAssinatura || nomeAssinatura.trim().toLowerCase() !== contrato.cliente_nome.trim().toLowerCase()}
                        >
                          {signing ? "Registrando assinatura..." : "Assinar digitalmente"}
                        </Button>
                        <Button 
                          variant="ghost" 
                          className="w-full h-12 rounded-2xl text-slate-400 font-bold"
                          onClick={() => setAssinaturaPasso(1)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TELA 3: CONFIRMAÇÃO */}
                {assinaturaPasso === 3 && dadosAssinaturaFinal && (
                  <div className="flex flex-col bg-white">
                    <div className="flex-1 p-8 text-center flex flex-col items-center">
                      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 animate-in zoom-in-50 duration-500">
                        <CheckCircle2 className="text-emerald-500" size={48} />
                      </div>
                      
                      <h3 className="text-2xl font-black text-slate-900 mb-1">Contrato assinado!</h3>
                      <p className="text-sm font-medium text-slate-500 mb-8">Documento com validade jurídica</p>
                      
                      <div className="w-full bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-6 text-left space-y-4">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Código de Autenticidade</p>
                          <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-600 break-all">
                            {dadosAssinaturaFinal.hash.slice(0, 32)}...
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Assinado por</p>
                            <p className="text-xs font-bold text-slate-700">{dadosAssinaturaFinal.nome}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Data/Hora</p>
                            <p className="text-xs font-bold text-slate-700">{formatDateTime(dadosAssinaturaFinal.data)}</p>
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">IP Registrado</p>
                          <p className="text-xs font-bold text-slate-700">{dadosAssinaturaFinal.ip}</p>
                        </div>
                      </div>
                      
                      <div className="w-full space-y-3">
                        <Button 
                          variant="outline"
                          className="w-full h-14 rounded-2xl border-slate-200 text-[#0a1628] font-black group"
                          onClick={() => window.open(dadosAssinaturaFinal.url_pdf, '_blank')}
                        >
                          <Download size={18} className="mr-2" /> Baixar PDF assinado
                        </Button>
                        
                        <Button 
                          className="w-full h-14 bg-[#0a1628] hover:bg-[#112240] text-white font-black text-base rounded-2xl"
                          onClick={() => setIsModalAssinaturaOpen(false)}
                        >
                          Voltar ao início
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>

      </div>
      
      {/* Footer minimalista fora do container mobile para desktop */}
      <footer className="py-8 text-center hidden md:block">
        <p className="text-slate-400 text-xs font-medium uppercase tracking-[0.2em]">
          NEXO · Gestão de Planejados
        </p>
      </footer>
    </div>
  );
}
