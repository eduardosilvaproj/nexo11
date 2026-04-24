import { useState, useEffect, useRef } from "react";
import { Send, User, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  contract_id: string;
  sender_type: "cliente" | "equipe";
  sender_name: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

interface ContratoChatTabProps {
  contratoId: string;
}

export function ContratoChatTab({ contratoId }: ContratoChatTabProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [userName, setUserName] = useState("Equipe");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUser();
    loadMessages();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel(`chat-${contratoId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "contract_messages",
          filter: `contract_id=eq.${contratoId}`,
        },
        (payload: any) => {
          setMessages((prev) => {
            if (prev.find(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as Message];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contratoId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  async function loadUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("usuarios")
          .select("nome")
          .eq("id", user.id)
          .maybeSingle();
        
        if (profile?.nome) {
          setUserName(profile.nome);
        }
      }
    } catch (e) {
      console.error("Erro ao carregar usuário:", e);
    }
  }

  async function loadMessages() {
    try {
      const { data, error } = await supabase
        .from("contract_messages")
        .select("*")
        .eq("contract_id", contratoId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages((data as any[]) || []);
      
      // Mark as read
      await supabase
        .from("contract_messages")
        .update({ is_read: true })
        .eq("contract_id", contratoId)
        .eq("sender_type", "cliente")
        .eq("is_read", false);

    } catch (e: any) {
      console.error("Erro ao carregar mensagens:", e);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const { error } = await supabase.from("contract_messages").insert({
        contract_id: contratoId,
        sender_type: "equipe",
        sender_name: userName,
        message: newMessage.trim(),
      });

      if (error) throw error;
      setNewMessage("");
    } catch (e: any) {
      toast.error("Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#E5DDD5] overflow-hidden relative">
      {/* Background Pattern - Optional WhatsApp-like pattern */}
      <div 
        className="absolute inset-0 opacity-[0.05] pointer-events-none" 
        style={{ 
          backgroundImage: `url("https://www.transparenttextures.com/patterns/cubes.png")`,
        }} 
      />

      {/* Área de Mensagens */}
      <ScrollArea className="flex-1 p-4 relative z-10">
        <div className="space-y-2 pb-4">
          {messages.length === 0 ? (
            <div className="text-center py-10">
              <span className="bg-[#D1E4F3] text-[#4A5568] text-xs px-3 py-1 rounded-lg shadow-sm">
                Nenhuma mensagem ainda.
              </span>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMine = msg.sender_type === "equipe";
              const showDate = index === 0 || 
                format(new Date(messages[index-1].created_at), 'yyyy-MM-dd') !== format(new Date(msg.created_at), 'yyyy-MM-dd');
              
              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex justify-center my-4">
                      <span className="bg-[#D1E4F3] text-[#4A5568] text-[11px] font-medium px-3 py-1 rounded-lg shadow-sm uppercase">
                        {format(new Date(msg.created_at), "d 'de' MMMM", { locale: ptBR })}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1`}>
                    <div
                      className={cn(
                        "max-w-[85%] md:max-w-[70%] px-3 py-1.5 shadow-sm relative",
                        isMine
                          ? "bg-[#DCF8C6] text-[#0D1117] rounded-l-lg rounded-br-lg"
                          : "bg-white text-[#0D1117] rounded-r-lg rounded-bl-lg"
                      )}
                    >
                      {/* Bubble Tail */}
                      <div className={cn(
                        "absolute top-0 w-2 h-2",
                        isMine 
                          ? "right-[-8px] border-l-[8px] border-l-[#DCF8C6] border-b-[8px] border-b-transparent" 
                          : "left-[-8px] border-r-[8px] border-r-white border-b-[8px] border-b-transparent"
                      )} />

                      {!isMine && (
                        <p className="text-[11px] font-bold text-[#1E6FBF] mb-0.5">
                          {msg.sender_name}
                        </p>
                      )}
                      <div className="flex flex-col">
                        <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">
                          {msg.message}
                        </p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-[10px] text-[#64748B]">
                            {format(new Date(msg.created_at), "HH:mm")}
                          </span>
                          {isMine && (
                            <span className="text-[#34B7F1]">
                              {msg.is_read ? <CheckCheck size={14} /> : <Check size={14} />}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input de Mensagem */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 bg-[#F0F2F5] flex gap-2 items-center relative z-10"
      >
        <div className="flex-1 bg-white rounded-lg flex items-center px-3 py-1 shadow-sm">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="min-h-[40px] max-h-[120px] resize-none border-none focus-visible:ring-0 p-0 shadow-none bg-transparent text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
          />
        </div>
        <Button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="bg-[#00A884] hover:bg-[#008F6F] h-10 w-10 shrink-0 p-0 rounded-full shadow-sm"
        >
          <Send size={18} className="text-white" />
        </Button>
      </form>
    </div>
  );
}
