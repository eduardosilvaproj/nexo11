import { useState, useEffect, useRef } from "react";
import { Send, User, ShieldCheck, Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Message {
  id: string;
  contract_id: string;
  sender_type: "cliente" | "equipe";
  sender_name: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

interface PortalChatProps {
  contractId: string;
  clientName: string;
  portalClient: any;
}

export function PortalChat({ contractId, clientName, portalClient }: PortalChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    
    // Subscribe to real-time updates
    const channel = portalClient
      .channel("chat_mensagens")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_mensagens",
          filter: `contrato_id=eq.${contractId}`,
        },
        (payload: any) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      portalClient.removeChannel(channel);
    };
  }, [contractId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  async function loadMessages() {
    try {
      const { data, error } = await portalClient
        .from("chat_mensagens")
        .select("*")
        .eq("contrato_id", contractId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages((data as any[]) || []);
    } catch (e: any) {
      console.error("Erro ao carregar mensagens:", e);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const { error } = await portalClient.from("contract_messages").insert({
        contract_id: contractId,
        sender_type: "cliente",
        sender_name: clientName,
        mensagem: newMessage.trim(),
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
    <div className="flex flex-col h-[600px] md:h-[700px] bg-[#E5DDD5] rounded-xl border border-[#E8ECF2] overflow-hidden relative shadow-sm">
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.05] pointer-events-none" 
        style={{ 
          backgroundImage: `url("https://www.transparenttextures.com/patterns/cubes.png")`,
        }} 
      />

      {/* Header do Chat */}
      <div className="p-4 border-b border-[#E8ECF2] bg-[#F0F2F5] flex items-center justify-between relative z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#1E6FBF] flex items-center justify-center text-white shadow-sm">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#0D1117]">Suporte Nexo</h3>
            <p className="text-[11px] text-[#6B7A90]">Equipe Interna</p>
          </div>
        </div>
      </div>
 
      {/* Área de Mensagens */}
      <ScrollArea className="flex-1 p-4 relative z-10">
        <div className="space-y-2 pb-4">
          {messages.length === 0 ? (
            <div className="text-center py-10">
              <span className="bg-[#D1E4F3] text-[#4A5568] text-xs px-3 py-1 rounded-lg shadow-sm">
                Nenhuma mensagem ainda. Inicie a conversa abaixo.
              </span>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMine = msg.sender_type === "cliente";
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
        className="p-3 bg-[#F0F2F5] flex gap-2 items-center relative z-10 shrink-0"
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
