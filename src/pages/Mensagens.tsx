import { useState, useEffect } from "react";
import { MessageSquare, Search, Send, User, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContratoChatTab } from "@/components/contrato/ContratoChatTab";
import { cn } from "@/lib/utils";

interface ContractListItem {
  id: string;
  cliente_nome: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  status: string;
}

const ETAPAS_CONFIG: Record<string, { label: string, bg: string, text: string, pillBg: string }> = {
  "comercial": { label: "Comercial", bg: "#E6F1FB", text: "#0C447C", pillBg: "bg-blue-100 text-blue-800" },
  "tecnico": { label: "Revisão Técnica", bg: "#EEEDFE", text: "#3C3489", pillBg: "bg-purple-100 text-purple-800" },
  "producao": { label: "Produção", bg: "#FAEEDA", text: "#633806", pillBg: "bg-amber-100 text-amber-800" },
  "logistica": { label: "Logística", bg: "#EAF3DE", text: "#27500A", pillBg: "bg-green-100 text-green-800" },
  "montagem": { label: "Montagem", bg: "#E1F5EE", text: "#085041", pillBg: "bg-teal-100 text-teal-800" },
  "pos_venda": { label: "Pós-Venda", bg: "#E1F5EE", text: "#085041", pillBg: "bg-teal-100 text-teal-800" },
  "finalizado": { label: "Finalizado", bg: "#F1EFE8", text: "#444441", pillBg: "bg-gray-100 text-gray-800" },
};

export default function Mensagens() {
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeEtapa, setActiveEtapa] = useState<string>("Todas");
  const queryClient = useQueryClient();

  const { data: contracts, isLoading } = useQuery({
    queryKey: ["contract_messages_list"],
    queryFn: async () => {
      // First, get all unique contract_ids from messages
      const { data: messageData, error: messageError } = await supabase
        .from("chat_mensagens")
        .select("contrato_id, mensagem, created_at")
        .order("created_at", { ascending: false });

      if (messageError) throw messageError;

      // Group by contract_id and take the first (most recent) message
      const latestMessagesMap = new Map();
      messageData?.forEach((m) => {
        if (!latestMessagesMap.has(m.contrato_id)) {
          latestMessagesMap.set(m.contrato_id, m);
        }
      });

      const contractIds = Array.from(latestMessagesMap.keys());

      if (contractIds.length === 0) return [];

      // Get contract details
      const { data: contractData, error: contractError } = await supabase
        .from("contratos")
        .select("id, cliente_nome, status")
        .in("id", contractIds);

      if (contractError) throw contractError;

      // Get unread counts
      const { data: unreadData, error: unreadError } = await supabase
        .from("chat_mensagens")
        .select("contrato_id")
        .eq("lida", false)
        .eq("remetente_tipo", "cliente");

      if (unreadError) throw unreadError;

      const unreadCountsMap = new Map();
      unreadData?.forEach((u) => {
        unreadCountsMap.set(u.contrato_id, (unreadCountsMap.get(u.contrato_id) || 0) + 1);
      });

      // Combine data
      return contractData.map((c) => ({
        id: c.id,
        cliente_nome: c.cliente_nome,
        status: c.status || "comercial",
        last_message: latestMessagesMap.get(c.id)?.mensagem || "",
        last_message_time: latestMessagesMap.get(c.id)?.created_at || "",
        unread_count: unreadCountsMap.get(c.id) || 0,
      })).sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime());
    },
    refetchInterval: 5000, // Polling for updates
  });

  // Real-time updates for the list
  useEffect(() => {
    const channel = supabase
      .channel("messages-list-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_mensagens" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["contract_messages_list"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const filteredContracts = contracts?.filter((c) => {
    const matchesSearch = c.cliente_nome.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEtapa = activeEtapa === "Todas" || c.status === activeEtapa;
    return matchesSearch && matchesEtapa;
  });

  const getCountForEtapa = (etapa: string) => {
    if (!contracts) return 0;
    if (etapa === "Todas") return contracts.length;
    return contracts.filter(c => c.status === etapa).length;
  };

  const selectedContract = contracts?.find((c) => c.id === selectedContractId);

  return (
    <div className="flex h-[calc(100vh-88px)] md:h-[calc(100vh-104px)] -m-4 md:-m-6 overflow-hidden bg-[#F0F2F5] relative">
      {/* Sidebar - Lista de Conversas */}
      <div className={cn(
        "w-full md:w-80 lg:w-96 border-r border-[#E2E8F0] bg-white flex flex-col shrink-0 absolute inset-0 z-20 md:relative md:z-auto transition-transform duration-300 ease-in-out",
        selectedContractId ? "-translate-x-full md:translate-x-0" : "translate-x-0"
      )}>
        <div className="p-4 border-b border-[#E2E8F0]">
          <h1 className="text-xl font-semibold text-[#1E293B] mb-4">Mensagens</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <Input
              placeholder="Buscar cliente..."
              className="pl-9 bg-[#F1F5F9] border-none focus-visible:ring-1 focus-visible:ring-[#1E6FBF]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveEtapa("Todas")}
              className={cn(
                "rounded-full px-4 h-8 text-xs shrink-0",
                activeEtapa === "Todas" 
                  ? "bg-[#1E6FBF] text-white border-[#1E6FBF] hover:bg-[#1E6FBF] hover:text-white" 
                  : "bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100"
              )}
            >
              Todas ({getCountForEtapa("Todas")})
            </Button>
            {Object.entries(ETAPAS_CONFIG).filter(([key]) => key !== 'finalizado' && key !== 'pos_venda').map(([key, config]) => (
              <Button
                key={key}
                variant="outline"
                size="sm"
                onClick={() => setActiveEtapa(key)}
                className={cn(
                  "rounded-full px-4 h-8 text-xs shrink-0 border-transparent",
                  activeEtapa === key 
                    ? "bg-[#1E6FBF] text-white border-[#1E6FBF] hover:bg-[#1E6FBF] hover:text-white" 
                    : config.pillBg
                )}
              >
                {config.label} ({getCountForEtapa(key)})
              </Button>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="flex flex-col">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex gap-3 items-center">
                    <div className="h-10 w-10 rounded-full bg-slate-100 animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-2/3 bg-slate-100 animate-pulse rounded" />
                      <div className="h-3 w-full bg-slate-100 animate-pulse rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredContracts?.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-[#64748B]">Nenhuma conversa encontrada.</p>
              </div>
            ) : (
              filteredContracts?.map((contract) => (
                <button
                  key={contract.id}
                  onClick={() => setSelectedContractId(contract.id)}
                  className={cn(
                    "flex flex-col p-4 border-b border-[#F1F5F9] text-left transition-colors hover:bg-[#F8FAFC]",
                    selectedContractId === contract.id && "bg-[#F1F5F9]"
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-[#1E293B] truncate">
                      {contract.cliente_nome}
                    </span>
                    <span className="text-[10px] text-[#94A3B8] whitespace-nowrap ml-2">
                      {contract.last_message_time && format(new Date(contract.last_message_time), "HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-xs text-[#64748B] line-clamp-1 flex-1">
                      {contract.last_message}
                    </span>
                    {contract.unread_count > 0 && (
                      <Badge className="bg-[#1E6FBF] hover:bg-[#1E6FBF] h-5 min-w-5 flex items-center justify-center rounded-full text-[10px] px-1">
                        {contract.unread_count}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-[#94A3B8]">
                      Contrato: #{contract.id.slice(0, 8)}
                    </span>
                    {contract.status && ETAPAS_CONFIG[contract.status] && (
                      <Badge 
                        variant="secondary"
                        className="text-[9px] px-1.5 h-4 border-none font-medium"
                        style={{ 
                          backgroundColor: ETAPAS_CONFIG[contract.status].bg,
                          color: ETAPAS_CONFIG[contract.status].text
                        }}
                      >
                        {ETAPAS_CONFIG[contract.status].label}
                      </Badge>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Área de Chat */}
      <div className="flex-1 flex flex-col bg-white h-full overflow-hidden">
        {selectedContractId ? (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header do Chat */}
            <div className="p-3 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F0F2F5] shrink-0">
              <div className="flex items-center gap-2 md:gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden h-8 w-8 text-[#64748B]" 
                  onClick={() => setSelectedContractId(null)}
                >
                  <ArrowLeft size={20} />
                </Button>
                <div className="h-10 w-10 rounded-full bg-[#1E6FBF] flex items-center justify-center text-white shrink-0">
                  <User size={20} />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-[#1E293B] leading-none truncate">
                    {selectedContract?.cliente_nome}
                  </h2>
                  <p className="text-[11px] text-[#64748B] mt-1">
                    Contrato: #{selectedContractId.slice(0, 8)}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs text-[#1E6FBF] border-[#1E6FBF] hover:bg-[#1E6FBF] hover:text-white transition-colors"
                onClick={() => window.open(`/contratos/${selectedContractId}`, "_blank")}
              >
                Ver Contrato
              </Button>
            </div>

            {/* Chat Tab - Here we customize the layout to take full height */}
            <div className="flex-1 overflow-hidden relative">
              <ContratoChatTab contratoId={selectedContractId} />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#94A3B8] bg-[#F8FAFC]">
            <div className="h-16 w-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-4">
              <MessageSquare size={32} />
            </div>
            <p className="text-sm">Selecione uma conversa para começar</p>
          </div>
        )}
      </div>

      <style>{`
        /* Overriding some styles in ContratoChatTab to fit this page better */
        .flex-1 > div > div[class*="h-full"] {
          height: 100% !important;
          min-height: 100% !important;
          border-radius: 0 !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
}
