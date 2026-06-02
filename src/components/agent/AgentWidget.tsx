import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, X, Send } from "lucide-react";

interface Message {
  id: string;
  role: "bot" | "user";
  text: string;
  buttons?: { label: string; action: string }[];
  showForm?: "bug" | "sugestao";
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export function AgentWidget() {
  const { user, perfil } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showPulse, setShowPulse] = useState(true);
  const [formTitulo, setFormTitulo] = useState("");
  const [formDescricao, setFormDescricao] = useState("");
  const [activeForm, setActiveForm] = useState<"bug" | "sugestao" | null>(null);
  const [conversaId, setConversaId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowPulse(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Create or load conversation
  useEffect(() => {
    if (!open || !user) return;
    if (conversaId) return;

    (async () => {
      const { data } = await (supabase as any)
        .from("agent_conversas")
        .select("id, mensagens")
        .eq("user_id", user.id)
        .order("criado_em", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setConversaId(data.id);
        if (data.mensagens && Array.isArray(data.mensagens) && data.mensagens.length > 0) {
          setMessages(data.mensagens);
          return;
        }
      }

      // Create new conversation
      const welcomeMsg: Message = {
        id: generateId(),
        role: "bot",
        text: "Olá! Sou o assistente NEXO. Posso ajudar com dúvidas, reportar bugs ou registrar sugestões. Digite sua pergunta!",
      };
      setMessages([welcomeMsg]);

      const { data: newConv } = await (supabase as any)
        .from("agent_conversas")
        .insert({ user_id: user.id, mensagens: [welcomeMsg] })
        .select("id")
        .single();

      if (newConv) setConversaId(newConv.id);
    })();
  }, [open, user, conversaId]);

  const saveMessages = async (msgs: Message[]) => {
    if (!conversaId) return;
    await (supabase as any)
      .from("agent_conversas")
      .update({ mensagens: msgs })
      .eq("id", conversaId);
  };

  const searchFAQ = async (query: string): Promise<string | null> => {
    const keywords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const { data } = await (supabase as any)
      .from("agent_faq")
      .select("pergunta, resposta, keywords");

    if (!data || data.length === 0) return null;

    for (const faq of data) {
      const perguntaLower = (faq.pergunta || "").toLowerCase();
      if (perguntaLower.includes(query.toLowerCase())) return faq.resposta;
      const faqKeywords: string[] = faq.keywords || [];
      const overlap = keywords.filter((k) =>
        perguntaLower.includes(k) || faqKeywords.some((fk: string) => fk.toLowerCase().includes(k))
      );
      if (overlap.length >= 2 || (keywords.length === 1 && overlap.length === 1)) {
        return faq.resposta;
      }
    }
    return null;
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: generateId(), role: "user", text: input.trim() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");

    const answer = await searchFAQ(userMsg.text);
    let botMsg: Message;

    if (answer) {
      botMsg = { id: generateId(), role: "bot", text: answer };
    } else {
      botMsg = {
        id: generateId(),
        role: "bot",
        text: "Não encontrei uma resposta exata. Quer registrar isso como feedback?",
        buttons: [
          { label: "Reportar Bug", action: "bug" },
          { label: "Sugestão", action: "sugestao" },
          { label: "Não, obrigado", action: "dismiss" },
        ],
      };
    }

    const finalMsgs = [...newMsgs, botMsg];
    setMessages(finalMsgs);
    await saveMessages(finalMsgs);
  };

  const handleButtonAction = (action: string) => {
    if (action === "bug" || action === "sugestao") {
      setActiveForm(action);
    } else {
      const msg: Message = { id: generateId(), role: "bot", text: "Tudo bem! Se precisar de algo, estou aqui." };
      const newMsgs = [...messages, msg];
      setMessages(newMsgs);
      saveMessages(newMsgs);
    }
  };

  const submitFeedback = useMutation({
    mutationFn: async () => {
      if (!formTitulo.trim() || !formDescricao.trim()) return;
      const { error } = await (supabase as any).from("feedbacks").insert({
        tipo: activeForm,
        titulo: formTitulo,
        descricao: formDescricao,
        modulo: "geral",
        prioridade: "media",
        status: "aberto",
        votos: 0,
        autor_id: user?.id,
        autor_nome: perfil?.nome || "Usuário",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      const msg: Message = {
        id: generateId(),
        role: "bot",
        text: `${activeForm === "bug" ? "Bug" : "Sugestão"} registrado(a) com sucesso! Obrigado pelo feedback.`,
      };
      const newMsgs = [...messages, msg];
      setMessages(newMsgs);
      saveMessages(newMsgs);
      setActiveForm(null);
      setFormTitulo("");
      setFormDescricao("");
      toast.success("Feedback registrado!");
    },
    onError: () => toast.error("Erro ao registrar feedback"),
  });

  const handleQuickAction = (action: string) => {
    if (action === "bug") setActiveForm("bug");
    else if (action === "sugestao") setActiveForm("sugestao");
    else if (action === "ajuda") {
      const msg: Message = {
        id: generateId(),
        role: "bot",
        text: "Posso ajudar com:\n• Dúvidas sobre módulos\n• Reportar bugs\n• Registrar sugestões\n• Iniciar tour guiado\n\nDigite sua pergunta ou use os botões rápidos!",
      };
      const newMsgs = [...messages, msg];
      setMessages(newMsgs);
      saveMessages(newMsgs);
    } else if (action === "tour") {
      const msg: Message = {
        id: generateId(),
        role: "bot",
        text: "Para iniciar um tour guiado, acesse a Central de Ajuda e clique em 'Iniciar Tour' na página desejada.",
      };
      const newMsgs = [...messages, msg];
      setMessages(newMsgs);
      saveMessages(newMsgs);
    }
  };

  const widget = (
    <>
      {/* Float Button */}
      <button
        onClick={() => { setOpen(!open); setShowPulse(false); }}
        className={`fixed right-5 bottom-5 md:right-20 md:bottom-20 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 ${showPulse ? "animate-pulse" : ""}`}
        style={{ backgroundColor: "#1E6FBF" }}
        aria-label="Abrir assistente"
      >
        {open ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="fixed z-50 right-5 bottom-24 md:right-20 md:bottom-36 w-[calc(100vw-2.5rem)] md:w-[400px] h-[calc(100vh-8rem)] md:h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border" style={{ borderColor: "#E8ECF2" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#E8ECF2" }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "#1E6FBF" }}>
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium text-sm" style={{ color: "#0D1117" }}>Assistente NEXO</span>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-gray-100">
              <X className="w-4 h-4" style={{ color: "#6B7A90" }} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${
                    msg.role === "user" ? "text-white" : ""
                  }`}
                  style={{
                    backgroundColor: msg.role === "user" ? "#1E6FBF" : "#F3F4F6",
                    color: msg.role === "user" ? "#fff" : "#0D1117",
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Buttons from last bot message */}
            {messages.length > 0 && messages[messages.length - 1].buttons && (
              <div className="flex flex-wrap gap-2">
                {messages[messages.length - 1].buttons!.map((btn) => (
                  <Button
                    key={btn.action}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleButtonAction(btn.action)}
                  >
                    {btn.label}
                  </Button>
                ))}
              </div>
            )}

            {/* Inline form */}
            {activeForm && (
              <div className="p-3 rounded-xl space-y-2" style={{ backgroundColor: "#F9FAFB", border: "1px solid #E8ECF2" }}>
                <p className="text-xs font-medium" style={{ color: "#0D1117" }}>
                  {activeForm === "bug" ? "Reportar Bug" : "Nova Sugestão"}
                </p>
                <Input
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  placeholder="Título"
                  className="h-8 text-xs"
                />
                <Textarea
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  placeholder="Descrição..."
                  rows={3}
                  className="text-xs"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="text-xs text-white"
                    style={{ backgroundColor: "#1E6FBF" }}
                    onClick={() => submitFeedback.mutate()}
                    disabled={!formTitulo.trim() || !formDescricao.trim()}
                  >
                    Enviar
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => setActiveForm(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-1 px-3 py-2 border-t" style={{ borderColor: "#E8ECF2" }}>
            <button onClick={() => handleQuickAction("bug")} className="text-xs px-2 py-1 rounded-full hover:bg-gray-100">🐛 Bug</button>
            <button onClick={() => handleQuickAction("sugestao")} className="text-xs px-2 py-1 rounded-full hover:bg-gray-100">💡 Sugestão</button>
            <button onClick={() => handleQuickAction("ajuda")} className="text-xs px-2 py-1 rounded-full hover:bg-gray-100">❓ Ajuda</button>
            <button onClick={() => handleQuickAction("tour")} className="text-xs px-2 py-1 rounded-full hover:bg-gray-100">📖 Tour</button>
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 px-3 py-3 border-t" style={{ borderColor: "#E8ECF2" }}>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Digite sua mensagem..."
              className="flex-1 h-9 text-sm"
            />
            <Button
              size="sm"
              className="h-9 w-9 p-0 text-white"
              style={{ backgroundColor: "#1E6FBF" }}
              onClick={handleSend}
              disabled={!input.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );

  return createPortal(widget, document.body);
}
