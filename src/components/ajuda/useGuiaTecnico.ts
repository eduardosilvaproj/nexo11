import { useState, useCallback } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  id?: number;
  streaming?: boolean;
}

const GEMINI_API_KEY = 'AIzaSyAT9_XU-P4znqAHIAD3KgCSGhzRY-YIeRo';

export const useGuiaTecnico = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (pergunta: string) => {
    if (!pergunta.trim() || loading) return;

    const userMsg: ChatMessage = { role: "user", content: pergunta.trim(), id: Date.now() };
    setMessages((prev) => [...prev, userMsg]);

    setLoading(true);
    setError(null);

    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        },
      });

      const { GUIA_TECNICO_COMPLETO } = await import('./guiaContent');

      const prompt = `Você é um assistente técnico especializado em marcenaria e móveis planejados da empresa Grupo DIAS.

GUIA TÉCNICO COMPLETO:
${GUIA_TECNICO_COMPLETO}

INSTRUÇÕES:
- Responda APENAS com base nas informações do guia técnico acima
- Seja preciso e objetivo
- Se a informação não estiver no guia, diga "Não encontrei essa informação no guia técnico"
- Use linguagem técnica mas clara
- Cite valores, medidas e especificações exatas quando disponíveis

PERGUNTA DO USUÁRIO:
${pergunta}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const assistantMsg: ChatMessage = { role: "assistant", content: text, id: Date.now() + 1 };
      setMessages((prev) => [...prev, assistantMsg]);
      setLoading(false);
      return text;
    } catch (err) {
      console.error('Erro ao consultar Gemini:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao consultar o guia técnico';
      setError(errorMessage);
      setLoading(false);
      // Mantendo o erro no estado para a UI exibir
    }
  }, [loading]);

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
