import { useState, useEffect, useRef } from "react";
import { Send, User, Check, CheckCheck, Paperclip, ImageIcon, FileText, File as FileIcon, X, Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  contrato_id: string;
  remetente_tipo: "cliente" | "equipe";
  remetente_nome: string;
  mensagem: string;
  created_at: string;
  lida: boolean;
  anexo_url?: string;
  anexo_nome?: string;
  anexo_tipo?: string;
}

interface ContratoChatTabProps {
  contratoId: string;
}

export function ContratoChatTab({ contratoId }: ContratoChatTabProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [userName, setUserName] = useState("Equipe");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
          table: "chat_mensagens",
          filter: `contrato_id=eq.${contratoId}`,
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
        .from("chat_mensagens")
        .select("*")
        .eq("contrato_id", contratoId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages((data as any[]) || []);
      
      // Mark as read
      await supabase
        .from("chat_mensagens")
        .update({ lida: true })
        .eq("contrato_id", contratoId)
        .eq("remetente_tipo", "cliente")
        .eq("lida", false);

    } catch (e: any) {
      console.error("Erro ao carregar mensagens:", e);
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("O arquivo deve ter no máximo 10MB");
        return;
      }
      setSelectedFile(file);
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => setFilePreview(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || sending) return;

    setSending(true);
    try {
      let anexo_url = null;
      let anexo_nome = null;
      let anexo_tipo = null;

      if (selectedFile) {
        const fileExt = selectedFile.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${contratoId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("chat-anexos")
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("chat-anexos")
          .getPublicUrl(filePath);

        anexo_url = publicUrl;
        anexo_nome = selectedFile.name;
        anexo_tipo = selectedFile.type;
      }

      const { error } = await supabase.from("chat_mensagens").insert({
        contrato_id: contratoId,
        remetente_tipo: "equipe",
        remetente_nome: userName,
        mensagem: newMessage.trim(),
        anexo_url,
        anexo_nome,
        anexo_tipo,
      });

      if (error) throw error;
      setNewMessage("");
      removeFile();
    } catch (e: any) {
      console.error(e);
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
              const isMine = msg.remetente_tipo === "equipe";
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
                          {msg.remetente_nome}
                        </p>
                      )}
                      <div className="flex flex-col gap-2">
                        {msg.anexo_url && (
                          <div className="mt-1 mb-1">
                            {msg.anexo_tipo?.startsWith("image/") ? (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <img 
                                    src={msg.anexo_url} 
                                    alt={msg.anexo_nome} 
                                    className="max-w-full rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                                    style={{ maxHeight: '300px' }}
                                  />
                                </DialogTrigger>
                                <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-none bg-transparent flex items-center justify-center">
                                  <img src={msg.anexo_url} alt={msg.anexo_nome} className="max-w-full max-h-full object-contain" />
                                </DialogContent>
                              </Dialog>
                            ) : (
                              <div className="flex items-center gap-3 p-3 bg-black/5 rounded-lg border border-black/10 min-w-[200px]">
                                <div className="h-10 w-10 bg-white rounded-md flex items-center justify-center shadow-sm">
                                  <FileText className="text-[#1E6FBF]" size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">{msg.anexo_nome}</p>
                                  <p className="text-[10px] text-muted-foreground uppercase">{msg.anexo_tipo?.split('/')[1] || 'DOC'}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-black/10"
                                  onClick={() => window.open(msg.anexo_url, '_blank')}
                                >
                                  <Download size={16} />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                        {msg.mensagem && (
                          <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">
                            {msg.mensagem}
                          </p>
                        )}
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-[10px] text-[#64748B]">
                            {format(new Date(msg.created_at), "HH:mm")}
                          </span>
                          {isMine && (
                            <span className="text-[#34B7F1]">
                              {msg.lida ? <CheckCheck size={14} /> : <Check size={14} />}
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

      {/* Preview de Anexo */}
      {selectedFile && (
        <div className="px-4 py-3 bg-white border-t border-[#E8ECF2] relative z-20 flex items-center gap-3 animate-in slide-in-from-bottom-2">
          {filePreview ? (
            <div className="relative h-16 w-16 shrink-0">
              <img src={filePreview} alt="Preview" className="h-full w-full object-cover rounded-md border border-[#E8ECF2]" />
              <button 
                onClick={removeFile}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:bg-red-600 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="relative h-16 w-full max-w-[240px] flex items-center gap-3 p-2 bg-[#F8FAFC] rounded-lg border border-[#E8ECF2]">
              <div className="h-10 w-10 bg-white rounded-md flex items-center justify-center shadow-sm">
                <FileIcon className="text-[#1E6FBF]" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{selectedFile.name}</p>
                <p className="text-[10px] text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button 
                onClick={removeFile}
                className="bg-red-500 text-white rounded-full p-0.5 shadow-md hover:bg-red-600 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Input de Mensagem */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 bg-[#F0F2F5] flex gap-2 items-center relative z-10 shrink-0"
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileSelect}
        />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full text-[#64748B] hover:bg-black/5"
            >
              <Paperclip size={20} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <ImageIcon className="mr-2 h-4 w-4" />
              <span>Foto/Imagem</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Documento</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <Paperclip className="mr-2 h-4 w-4" />
              <span>Qualquer arquivo</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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
          disabled={(!newMessage.trim() && !selectedFile) || sending}
          className="bg-[#00A884] hover:bg-[#008F6F] h-10 w-10 shrink-0 p-0 rounded-full shadow-sm flex items-center justify-center disabled:opacity-50"
        >
          <Send size={18} className="text-white ml-0.5" />
        </Button>
      </form>
    </div>
  );
}
