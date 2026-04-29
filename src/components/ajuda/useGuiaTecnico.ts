import { useState, useCallback } from 'react';
import { GUIA_TECNICO_CONTENT } from './guiaContent';

const SYSTEM_PROMPT = `Você é o assistente técnico do NEXO ERP, especializado em móveis planejados.

INSTRUÇÕES:
1. Primeiro tente responder com base no Guia Técnico abaixo
2. Se não encontrar no guia, responda com seu conhecimento geral sobre marcenaria e móveis planejados, mas SEMPRE avise com: "⚠️ Esta informação não está no guia técnico da empresa, é baseada em conhecimento geral."
3. Nunca invente medidas ou especificações sem avisar a fonte
4. Responda sempre em português, de forma direta e prática
5. Use bullet points para listas

GUIA TÉCNICO DA EMPRESA:
${GUIA_TECNICO_CONTENT}`;

export const useGuiaTecnico = () => {
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(false);
  const [respostaIA, setRespostaIA] = useState<string | null>(null);

  const perguntarIA = async (pergunta: string) => {
    const groqKey = import.meta.env.VITE_GROQ_KEY;
    
    if (!groqKey) {
      console.error("VITE_GROQ_KEY não configurada");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT
            },
            {
              role: "user",
              content: pergunta
            }
          ],
          temperature: 0.1,
          max_tokens: 1024
        })
      });

      const data = await response.json();
      setRespostaIA(data.choices[0]?.message?.content || "Desculpe, não consegui processar sua pergunta.");
    } catch (error) {
      console.error("Erro ao consultar Groq:", error);
      setRespostaIA("Erro ao conectar com a IA. Verifique sua conexão e chave de API.");
    } finally {
      setLoading(false);
    }
  };

  // Como o guia agora é um texto plano, a filtragem local simples não se aplica da mesma forma que antes.
  // Mantemos o hook retornando uma estrutura compatível se necessário, ou ajustamos conforme o uso na UI.
  // Por agora, retornamos um array vazio para 'resultados' para evitar quebra na UI se ela iterar sobre eles.
  const resultados: any[] = [];

  return {
    busca,
    setBusca,
    resultados,
    perguntarIA,
    respostaIA,
    loading,
    setRespostaIA
  };
};