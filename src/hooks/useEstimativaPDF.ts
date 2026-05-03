import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { RelatorioEstimativa, MovelIdentificado } from '@/types/estimativa';

const GEMINI_API_KEY = 'AIzaSyBk0BHgfQoojzjvTBuIxRwJlkDDjhuxEBs';

export const useEstimativaPDF = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const analisarPDF = async (file: File): Promise<RelatorioEstimativa | null> => {
    setLoading(true);
    setError(null);

    try {
      // 1. Upload PDF para Supabase Storage
      setProgress('Enviando PDF...');
      const fileName = `${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('estimativas')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('estimativas')
        .getPublicUrl(fileName);

      // 2. Converter PDF para base64
      setProgress('Processando PDF...');
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      // 3. Analisar com Gemini
      setProgress('Analisando projeto...');
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `Analise este PDF e identifique móveis planejados. Retorne JSON:
{"moveis":[{"ambiente":"","tipo":"aereo|base|torre|painel|nicho|gaveta|outro","descricao":"","largura":0,"altura":0,"profundidade":0,"quantidade":1,"alertas":[]}],"observacoes_gerais":[]}`;

      const result = await model.generateContent([
        { text: prompt },
        {
          inlineData: {
            mimeType: file.type,
            data: base64
          }
        }
      ]);

      const response = await result.response;
      const text = response.text();

      // Extrair JSON da resposta
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Resposta inválida da IA');

      const analise = JSON.parse(jsonMatch[0]);

      // 4. Calcular estimativas de preço
      setProgress('Calculando estimativas...');
      const moveis: MovelIdentificado[] = analise.moveis.map((m: any, idx: number) => ({
        id: `movel_${idx}`,
        ambiente: m.ambiente,
        tipo: m.tipo,
        descricao: m.descricao,
        largura: m.largura,
        altura: m.altura,
        profundidade: m.profundidade,
        quantidade: m.quantidade || 1,
        alertas: m.alertas || []
      }));

      const estimativas = moveis.map(movel => {
        const area = ((movel.largura || 0) * (movel.altura || 0)) / 10000; // m²
        const preco_m2_min = getTabelaPreco(movel.tipo).min;
        const preco_m2_max = getTabelaPreco(movel.tipo).max;

        return {
          movel_id: movel.id,
          preco_minimo: area * preco_m2_min * movel.quantidade,
          preco_maximo: area * preco_m2_max * movel.quantidade,
          preco_medio: area * ((preco_m2_min + preco_m2_max) / 2) * movel.quantidade,
          base_calculo: `${area.toFixed(2)}m² × R$ ${preco_m2_min}-${preco_m2_max}/m²`
        };
      });

      const total_minimo = estimativas.reduce((sum, e) => sum + e.preco_minimo, 0);
      const total_maximo = estimativas.reduce((sum, e) => sum + e.preco_maximo, 0);
      const total_medio = estimativas.reduce((sum, e) => sum + e.preco_medio, 0);

      const relatorio: RelatorioEstimativa = {
        id: crypto.randomUUID(),
        pdf_url: publicUrl,
        data_analise: new Date().toISOString(),
        status: 'concluido',
        moveis,
        estimativas,
        validacoes: [],
        total_minimo,
        total_maximo,
        total_medio,
        observacoes_gerais: analise.observacoes_gerais || []
      };

      setProgress('Concluído!');
      setLoading(false);
      return relatorio;

    } catch (err) {
      console.error('Erro ao analisar PDF:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setLoading(false);
      return null;
    }
  };

  return { analisarPDF, loading, progress, error };
};

// Tabela de preços base (valores exemplo - ajustar conforme realidade da DIAS)
function getTabelaPreco(tipo: string): { min: number; max: number } {
  const tabela: Record<string, { min: number; max: number }> = {
    aereo: { min: 800, max: 1500 },
    base: { min: 1000, max: 1800 },
    torre: { min: 1200, max: 2200 },
    painel: { min: 600, max: 1200 },
    nicho: { min: 500, max: 1000 },
    gaveta: { min: 400, max: 800 },
    outro: { min: 700, max: 1400 }
  };
  return tabela[tipo] || tabela.outro;
}
