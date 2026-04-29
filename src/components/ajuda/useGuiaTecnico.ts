import { useState, useCallback } from 'react';
import { guiaCategorias } from './guiaContent';

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
      // Formata o contexto do guia técnico para a IA
      const contexto = guiaCategorias.map(cat => 
        `Categoria: ${cat.titulo}\n` + 
        cat.topicos.map(t => `P: ${t.pergunta}\nR: ${t.resposta}`).join('\n')
      ).join('\n\n');

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content: "Você é um assistente técnico especializado em móveis sob medida. Use o guia técnico fornecido para responder às dúvidas dos usuários de forma clara e objetiva. Se a informação não estiver no guia, informe educadamente.\n\nGuia Técnico:\n" + contexto
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

  const filtrarConteudo = useCallback((termo: string) => {
    if (!termo) return guiaCategorias;
    
    return guiaCategorias.map(cat => ({
      ...cat,
      topicos: cat.topicos.filter(t => 
        t.pergunta.toLowerCase().includes(termo.toLowerCase()) || 
        t.resposta.toLowerCase().includes(termo.toLowerCase())
      )
    })).filter(cat => cat.topicos.length > 0);
  }, []);

  const resultados = filtrarConteudo(busca);

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