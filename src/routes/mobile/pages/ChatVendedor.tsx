import { useState } from "react";
import { MessageCircle, Radio, ChevronRight } from "lucide-react";

type TabKey = "Broadcast" | "Conversas Individuais";

interface Conversation {
  id: number;
  name: string;
  initials: string;
  lastMessage: string;
  time: string;
  unread: number;
  online?: boolean;
}

const mockConversations: Conversation[] = [
  {
    id: 1,
    name: "Marina Costa",
    initials: "MC",
    lastMessage: "Oi, gostaria de saber mais sobre...",
    time: "Agora",
    unread: 2,
    online: true,
  },
  {
    id: 2,
    name: "Rafael Souza",
    initials: "RS",
    lastMessage: "Combinado, volto a entrar em contato.",
    time: "há 15 min",
    unread: 0,
    online: true,
  },
  {
    id: 3,
    name: "Equipe de Vendas",
    initials: "EV",
    lastMessage: "Reunião confirmada para amanhã às 10h.",
    time: "há 1h",
    unread: 5,
  },
  {
    id: 4,
    name: "Camila Oliveira",
    initials: "CO",
    lastMessage: "Obrigada pela atenção, até mais!",
    time: "há 2h",
    unread: 0,
    online: true,
  },
  {
    id: 5,
    name: "Pedro Almeida",
    initials: "PA",
    lastMessage: "Posso enviar os documentos amanhã.",
    time: "há 5h",
    unread: 1,
  },
  {
    id: 6,
    name: "Juliana Santos",
    initials: "JS",
    lastMessage: "Gostaria de ver o contrato final.",
    time: "há 1 dia",
    unread: 0,
  },
  {
    id: 7,
    name: "Tiago Lopes",
    initials: "TL",
    lastMessage: "Quando posso visitar o escritório?",
    time: "há 2 dias",
    unread: 0,
  },
];

const broadcastMessages = [
  {
    id: 1,
    title: "Nova Campanha de Maio",
    description: "Lançamento da nova campanha de produtos...",
    sentAt: "há 2h",
    reads: 24,
  },
  {
    id: 2,
    title: "Reunião Semanal de Equipe",
    description: "Convocação para reunião de vendas na próxima...",
    sentAt: "há 1 dia",
    reads: 18,
  },
  {
    id: 3,
    title: "Meta do Mês Atualizada",
    description: "Nova meta de conversao definida para maio...",
    sentAt: "há 3 dias",
    reads: 31,
  },
];

export default function ChatVendedor() {
  const [activeTab, setActiveTab] = useState<TabKey>("Conversas Individuais");

  const totalUnread = mockConversations.reduce((acc, c) => acc + c.unread, 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Page Title */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <h1 className="text-gray-900 text-xl font-bold">Mensagens</h1>
          {totalUnread > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {totalUnread}
            </span>
          )}
        </div>
        <p className="text-gray-500 text-sm mt-0.5">
          {mockConversations.length} conversas
        </p>
      </div>

      {/* Tabs */}
      <div className="px-4">
        <div className="flex bg-white rounded-2xl p-1 gap-1">
          <button
            onClick={() => setActiveTab("Conversas Individuais")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "Conversas Individuais"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Conversas
          </button>
          <button
            onClick={() => setActiveTab("Broadcast")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "Broadcast"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            Broadcast
          </button>
        </div>
      </div>

      {activeTab === "Conversas Individuais" ? (
        <div className="px-4 mt-3 space-y-2">
          {mockConversations.map((conv) => (
            <div
              key={conv.id}
              className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm"
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold ${
                    conv.unread > 0
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {conv.initials}
                </div>
                {conv.online && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p
                    className={`text-sm truncate ${
                      conv.unread > 0
                        ? "font-semibold text-gray-900"
                        : "font-medium text-gray-700"
                    }`}
                  >
                    {conv.name}
                  </p>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                    {conv.time}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-gray-400 truncate">
                    {conv.lastMessage}
                  </p>
                  {conv.unread > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                      {conv.unread}
                    </span>
                  )}
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 mt-3 space-y-3">
          {broadcastMessages.map((msg) => (
            <div
              key={msg.id}
              className="bg-white rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Radio className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-gray-800 text-sm font-semibold">
                      {msg.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{msg.sentAt}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <MessageCircle className="w-3 h-3" />
                  <span>{msg.reads}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2 ml-11">
                {msg.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
