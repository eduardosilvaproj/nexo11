import { useState, useEffect, useRef } from "react";
import { Send, User, ShieldCheck } from "lucide-react";
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
      .channel("contract_messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "contract_messages",
          filter: `contract_id=eq.${contractId}`,
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
        .from("contract_messages")
        .select("*")
        .eq("contract_id", contractId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
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
    <div className="flex flex-col h-[600px] bg-white rounded-xl border border-[#E8ECF2] overflow-hidden">
      {/* Header do Chat */}
      <div className="p-4 border-b border-[#E8ECF2] bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#1E6FBF] flex items-center justify-center text-white">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#0D1117]">Suporte Nexo</h3>
            <p className="text-xs text-[#6B7A90]">Equipe Interna</p>
          </div>
        </div>
      </div>

      {/* Área de Mensagens */}
      <ScrollArea className="flex-1 p-4 bg-[#F5F7FA]">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-[#6B7A90]">
                Nenhuma mensagem ainda. Inicie a conversa abaixo.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_type === "cliente";
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-sm ${
                      isMine
                        ? "bg-[#1E6FBF] text-white rounded-tr-none"
                        : "bg-white text-[#0D1117] border border-[#E8ECF2] rounded-tl-none"
                    }`}
                  >
                    {!isMine && (
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">
                        {msg.sender_name}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {msg.message}
                    </p>
                    <p
                      className={`text-[10px] mt-1 text-right ${
                        isMine ? "text-white/70" : "text-[#6B7A90]"
                      }`}
                    >
                      {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                    </p>
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
        className="p-4 border-t border-[#E8ECF2] bg-white flex gap-2 items-end"
      >
        <Textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Digite sua mensagem..."
          className="min-h-[44px] max-h-[120px] resize-none border-[#E8ECF2] focus-visible:ring-[#1E6FBF]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage(e);
            }
          }}
        />
        <Button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="bg-[#1E6FBF] hover:bg-[#155ca1] h-11 w-11 shrink-0 p-0 rounded-full"
        >
          <Send size={18} />
        </Button>
      </form>
    </div>
  );
}
