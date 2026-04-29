import { useState, useCallback, useRef } from "react";
import { GUIA_TECNICO_CONTENT } from "./guiaContent";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  id?: number;
  streaming?: boolean;
}

const SYSTEM_PROMPT = `Você é o assistente técnico do NEXO ERP, especializado em móveis planejados.
Você tem acesso ao Guia Técnico completo da empresa e deve responder dúvidas com base nesse conteúdo.

REGRAS:
- Responda sempre em português, de forma direta e prática
- Busque a resposta no guia técnico fornecido
- Se não encontrar, diga claramente e oriente consultar o supervisor
- Use bullet points quando listar itens ou passos
- Nunca invente especificações técnicas

CONTEXTO: Módulo de Conferência do NEXO ERP

GUIA TÉCNICO:
${GUIA_TECNICO_CONTENT}`;

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.1-8b-instant";

export function useGuiaTecnico() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (userText: string) => {
    if (!userText.trim() || loading) return;

    const userMsg: ChatMessage = { role: "user", content: userText.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);
    setError(null);

    const placeholderId = Date.now();
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", id: placeholderId, streaming: true },
    ]);

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const groqMessages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...newMessages.map(({ role, content }) => ({ role, content })),
      ];

      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer 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",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: groqMessages,
          max_tokens: 1024,
          stream: true,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(err?.error?.message || `Erro HTTP ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const text = parsed.choices?.[0]?.delta?.content;
            if (text) {
              accumulated += text;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === placeholderId ? { ...m, content: accumulated } : m
                )
              );
            }
          } catch {
            // ignora linhas malformadas
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId
            ? { role: "assistant", content: accumulated }
            : m
        )
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        setMessages((prev) => prev.filter((m) => m.id !== placeholderId));
      } else {
        const msg = err instanceof Error ? err.message : "Erro ao conectar com a IA";
        setError(msg);
        setMessages((prev) => prev.filter((m) => m.id !== placeholderId));
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [messages, loading]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const cancelRequest = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { messages, loading, error, sendMessage, clearHistory, cancelRequest };
}
