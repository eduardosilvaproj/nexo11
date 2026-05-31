import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Play, Pause, Send, Sparkles, Image, Loader2, Trash2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Anotacao {
  id: string;
  tipo: string;
  conteudo: string | null;
  audio_url: string | null;
  audio_duracao_seg: number | null;
  resumo_ia: string | null;
  imagem_url: string | null;
  imagem_prompt: string | null;
  created_by: string | null;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  leadId: string;
  leadNome: string;
}

export function BriefingLeadDialog({ open, onOpenChange, leadId, leadNome }: Props) {
  const [anotacoes, setAnotacoes] = useState<Anotacao[]>([]);
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [tempoGravacao, setTempoGravacao] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [gerandoResumo, setGerandoResumo] = useState(false);
  const [gerandoImagem, setGerandoImagem] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { user, perfil } = useAuth();

  useEffect(() => {
    if (open && leadId) carregar();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [open, leadId]);

  async function carregar() {
    const { data, error } = await supabase
      .from("lead_anotacoes")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setAnotacoes(data as any ?? []);
  }

  // === TEXTO ===
  async function salvarTexto() {
    if (!texto.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("lead_anotacoes").insert({
      lead_id: leadId,
      loja_id: perfil?.loja_id,
      tipo: "texto",
      conteudo: texto.trim(),
      created_by: user?.id,
    });
    if (error) toast.error(error.message);
    else { toast.success("Anotação salva"); setTexto(""); carregar(); }
    setLoading(false);
  }

  // === ÁUDIO ===
  async function iniciarGravacao() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setGravando(true);
      setTempoGravacao(0);
      timerRef.current = setInterval(() => setTempoGravacao(t => t + 1), 1000);
    } catch (err) {
      toast.error("Não foi possível acessar o microfone");
    }
  }

  function pararGravacao() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setGravando(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  async function salvarAudio() {
    if (!audioBlob) return;
    setLoading(true);
    const fileName = `${leadId}/${Date.now()}.webm`;
    const { error: upErr } = await supabase.storage.from("lead-audios").upload(fileName, audioBlob, { contentType: "audio/webm" });
    if (upErr) { toast.error("Erro ao salvar áudio: " + upErr.message); setLoading(false); return; }

    // Usar signed URL pois o bucket é privado
    const { data: urlData } = await supabase.storage.from("lead-audios").createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 ano

    const { error } = await supabase.from("lead_anotacoes").insert({
      lead_id: leadId,
      loja_id: perfil?.loja_id,
      tipo: "audio",
      audio_url: urlData?.signedUrl || fileName,
      audio_duracao_seg: tempoGravacao,
      created_by: user?.id,
    });
    if (error) toast.error(error.message);
    else { toast.success("Áudio salvo"); setAudioBlob(null); setTempoGravacao(0); carregar(); }
    setLoading(false);
  }

  function playAudio(url: string, id: string) {
    if (audioRef.current) { audioRef.current.pause(); }
    if (playingId === id) { setPlayingId(null); return; }
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.play();
    audio.onended = () => setPlayingId(null);
    setPlayingId(id);
  }

  // === IA: Transcrição + Resumo ===
  async function gerarResumoIA() {
    const audios = anotacoes.filter(a => a.tipo === "audio" && a.audio_url);
    const textos = anotacoes.filter(a => a.tipo === "texto" && a.conteudo);
    if (audios.length === 0 && textos.length === 0) {
      toast.error("Adicione anotações ou áudios antes de gerar resumo");
      return;
    }
    setGerandoResumo(true);
    try {
      const resp = await supabase.functions.invoke("lead-briefing-ia", {
        body: { action: "resumo", lead_id: leadId, lead_nome: leadNome },
      });
      if (resp.error) throw new Error(resp.error.message || "Erro na Edge Function");
      if (resp.data?.error) throw new Error(resp.data.error);
      toast.success("Resumo gerado!");
      carregar();
    } catch (err: any) {
      toast.error("Erro: " + (err.message || "Verifique a Edge Function e OPENAI_API_KEY"));
    }
    setGerandoResumo(false);
  }

  // === IA: Geração de Imagem ===
  async function gerarImagemIA() {
    const resumos = anotacoes.filter(a => a.tipo === "resumo_ia" || a.tipo === "texto");
    if (resumos.length === 0) {
      toast.error("Gere um resumo primeiro ou adicione anotações");
      return;
    }
    setGerandoImagem(true);
    try {
      const resp = await supabase.functions.invoke("lead-briefing-ia", {
        body: { action: "imagem", lead_id: leadId, lead_nome: leadNome },
      });
      if (resp.error) throw new Error(resp.error.message || "Erro na Edge Function");
      if (resp.data?.error) throw new Error(resp.data.error);
      toast.success("Imagem gerada!");
      carregar();
    } catch (err: any) {
      toast.error("Erro: " + (err.message || "Verifique a Edge Function e OPENAI_API_KEY"));
    }
    setGerandoImagem(false);
  }

  async function excluirAnotacao(id: string) {
    if (!window.confirm("Excluir esta anotação?")) return;
    const { error } = await supabase.from("lead_anotacoes").delete().eq("id", id);
    if (error) toast.error(error.message);
    else carregar();
  }

  function fmtTempo(seg: number) {
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function fmtData(s: string) {
    return new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            Briefing — {leadNome}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Input de texto */}
          <div className="space-y-2">
            <Textarea
              placeholder="Anote detalhes do cliente: ambientes, medidas, preferências, materiais..."
              value={texto}
              onChange={e => setTexto(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Gravação de áudio */}
                {!gravando && !audioBlob && (
                  <Button size="sm" variant="outline" onClick={iniciarGravacao} className="gap-1">
                    <Mic className="h-3.5 w-3.5 text-red-500" /> Gravar
                  </Button>
                )}
                {gravando && (
                  <Button size="sm" variant="destructive" onClick={pararGravacao} className="gap-1 animate-pulse">
                    <MicOff className="h-3.5 w-3.5" /> {fmtTempo(tempoGravacao)} — Parar
                  </Button>
                )}
                {audioBlob && !gravando && (
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">Áudio {fmtTempo(tempoGravacao)}</Badge>
                    <Button size="sm" variant="outline" onClick={salvarAudio} disabled={loading} className="gap-1">
                      <Send className="h-3 w-3" /> Salvar áudio
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setAudioBlob(null); setTempoGravacao(0); }} className="h-7 w-7 p-0">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              <Button size="sm" onClick={salvarTexto} disabled={!texto.trim() || loading} className="bg-[#1E6FBF] hover:bg-[#1E6FBF]/90 text-white gap-1">
                <Send className="h-3 w-3" /> Salvar nota
              </Button>
            </div>
          </div>

          {/* Ações IA */}
          <div className="flex items-center gap-2 border-t pt-3">
            <Button size="sm" variant="outline" onClick={gerarResumoIA} disabled={gerandoResumo} className="gap-1 border-purple-200 text-purple-700 hover:bg-purple-50">
              {gerandoResumo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Gerar Resumo IA
            </Button>
            <Button size="sm" variant="outline" onClick={gerarImagemIA} disabled={gerandoImagem} className="gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
              {gerandoImagem ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Image className="h-3.5 w-3.5" />}
              Gerar Imagem IA
            </Button>
          </div>

          {/* Lista de anotações */}
          <div className="space-y-3 border-t pt-3">
            <p className="text-xs font-semibold text-slate-500 uppercase">Histórico ({anotacoes.length})</p>
            {anotacoes.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Nenhuma anotação ainda</p>
            )}
            {anotacoes.map(a => (
              <div key={a.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]" style={{
                      color: a.tipo === "texto" ? "#1E6FBF"
                        : a.tipo === "audio" ? "#DC2626"
                        : a.tipo === "resumo_ia" ? "#7C3AED"
                        : "#059669",
                    }}>
                      {a.tipo === "texto" ? "Nota" : a.tipo === "audio" ? "Áudio" : a.tipo === "resumo_ia" ? "Resumo IA" : "Imagem IA"}
                    </Badge>
                    <span className="text-[10px] text-slate-400">{fmtData(a.created_at)}</span>
                  </div>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => excluirAnotacao(a.id)}>
                    <Trash2 className="h-3 w-3 text-slate-400" />
                  </Button>
                </div>

                {/* Conteúdo por tipo */}
                {a.tipo === "texto" && (
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{a.conteudo}</p>
                )}

                {a.tipo === "audio" && (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => a.audio_url && playAudio(a.audio_url, a.id)}>
                      {playingId === a.id ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                      {playingId === a.id ? "Pausar" : "Ouvir"}
                    </Button>
                    <span className="text-xs text-slate-400">{a.audio_duracao_seg ? fmtTempo(a.audio_duracao_seg) : ""}</span>
                    {a.conteudo && (
                      <div className="mt-1 text-xs text-slate-600 bg-slate-50 rounded p-2 w-full">
                        <p className="font-medium text-[10px] text-purple-600 mb-0.5">Transcrição:</p>
                        {a.conteudo}
                      </div>
                    )}
                  </div>
                )}

                {a.tipo === "resumo_ia" && (
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-sm text-purple-900 whitespace-pre-wrap">{a.resumo_ia || a.conteudo}</p>
                  </div>
                )}

                {a.tipo === "imagem_ia" && (
                  <div className="space-y-2">
                    {a.imagem_prompt && (
                      <p className="text-[10px] text-slate-500 italic">Prompt: {a.imagem_prompt}</p>
                    )}
                    {a.imagem_url && (
                      <img src={a.imagem_url} alt="Imagem gerada" className="rounded-lg max-h-64 object-cover" />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}