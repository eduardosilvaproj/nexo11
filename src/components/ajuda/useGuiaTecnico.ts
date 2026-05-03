import { useState, useCallback } from "react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  id?: number;
  streaming?: boolean;
}

const GROQ_API_KEY = "gsk_NOVA_CHAVE_AQUI"; // Gerar em https://console.groq.com
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export const useGuiaTecnico = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (pergunta: string) => {
      if (!pergunta.trim() || loading) return;

      const userMsg: ChatMessage = { role: "user", content: pergunta.trim(), id: Date.now() };
      setMessages((prev) => [...prev, userMsg]);

      setLoading(true);
      setError(null);

      try {
        const { GUIA_TECNICO_COMPLETO } = await import("./guiaContent");

        const response = await fetch(GROQ_API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content: `Você é um assistente técnico especializado em marcenaria e móveis planejados da empresa Grupo DIAS.

GUIA TÉCNICO COMPLETO:
${GUIA_TECNICO_COMPLETO}

INSTRUÇÕES:
- Responda APENAS com base nas informações do guia técnico acima
- Seja preciso e objetivo
- Se a informação não estiver no guia, diga "Não encontrei essa informação no guia técnico"
- Use linguagem técnica mas clara
- Cite valores, medidas e especificações exatas quando disponíveis`,
              },
              {
                role: "user",
                content: pergunta,
              },
            ],
            temperature: 0.3,
            max_tokens: 2048,
          }),
        });

        if (!response.ok) {
          throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const text = data.choices[0]?.message?.content || "Sem resposta";

        const assistantMsg: ChatMessage = { role: "assistant", content: text, id: Date.now() + 1 };
        setMessages((prev) => [...prev, assistantMsg]);
        setLoading(false);
        return text;
      } catch (err) {
        console.error("Erro ao consultar API:", err);
        const errorMessage = err instanceof Error ? err.message : "Erro ao consultar o guia técnico";
        setError(errorMessage);
        setLoading(false);
      }
    },
    [loading],
  );

  const clearHistory = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    sendMessage,
    clearHistory,
    loading,
    error,
  };
};
