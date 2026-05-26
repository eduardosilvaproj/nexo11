import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RelatorioEstimativa, MovelIdentificado } from '@/types/estimativa';

export const useEstimativaPDF = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const analisarPDF = async (file: File): Promise<RelatorioEstimativa | null> => {
    setLoading(true);
    setError(null);

    try {
      setProgress('Enviando PDF...');
      const fileName = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('estimativas')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('estimativas')
        .getPublicUrl(fileName);

      setProgress('Processando PDF...');
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      const chunkSize = 8192;
      
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
        binary += String.fromCharCode(...chunk);
      }
      
      const base64 = btoa(binary);

      setProgress('Analisando projeto...');
      
      const { data, error: fnError } = await supabase.functions.invoke('estimativa-pdf', {
        body: { pdf_base64: base64 },
      });

      if (fnError) throw fnError;
      if (!data || data.error) {
        throw new Error(data?.error || 'Erro na análise do PDF');
      }

      const analise = data;

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
        alertas: []
      }));

      const estimativas = moveis.map(movel => {
        const area = ((movel.largura || 0) * (movel.altura || 0)) / 10000;
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
      console.error('Erro:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setLoading(false);
      return null;
    }
  };

  return { analisarPDF, loading, progress, error };
};

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
