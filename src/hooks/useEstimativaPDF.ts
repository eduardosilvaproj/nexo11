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

      setProgress('Analisando projeto com IA...');

      const { data: resposta, error: fnError } = await supabase.functions.invoke(
        'estimativa-pdf',
        { body: { file_path: fileName } }
      );

      if (fnError) {
        const detail = typeof fnError === 'object' && 'context' in fnError
          ? JSON.stringify(fnError)
          : fnError.message;
        throw new Error(`Edge Function erro: ${detail}`);
      }
      if (resposta?.error) throw new Error(resposta.error);

      const analise = resposta;

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
        let largura = movel.largura || 0;
        let altura = movel.altura || 0;

        if (largura > 0 && largura < 10) largura = largura * 100;
        if (altura > 0 && altura < 10) altura = altura * 100;

        const area = (largura * altura) / 10000;
        const tabela = getTabelaPreco(movel.tipo);

        if (area < 0.1) {
          return {
            movel_id: movel.id,
            preco_minimo: tabela.fixo_min * movel.quantidade,
            preco_maximo: tabela.fixo_max * movel.quantidade,
            preco_medio: ((tabela.fixo_min + tabela.fixo_max) / 2) * movel.quantidade,
            base_calculo: `Estimativa por tipo (${movel.tipo}) × ${movel.quantidade} un`
          };
        }

        return {
          movel_id: movel.id,
          preco_minimo: area * tabela.min * movel.quantidade,
          preco_maximo: area * tabela.max * movel.quantidade,
          preco_medio: area * ((tabela.min + tabela.max) / 2) * movel.quantidade,
          base_calculo: `${area.toFixed(2)}m² × R$ ${tabela.min}-${tabela.max}/m²`
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

function getTabelaPreco(tipo: string): { min: number; max: number; fixo_min: number; fixo_max: number } {
  const normalizado = normalizarTipo(tipo);
  const tabela: Record<string, { min: number; max: number; fixo_min: number; fixo_max: number }> = {
    aereo:        { min: 1440, max: 2700, fixo_min: 4320,  fixo_max: 9000 },
    base:         { min: 1800, max: 3240, fixo_min: 7200,  fixo_max: 16200 },
    torre:        { min: 2160, max: 3960, fixo_min: 10800, fixo_max: 21600 },
    painel:       { min: 1080, max: 2160, fixo_min: 5400,  fixo_max: 12600 },
    nicho:        { min: 900,  max: 1800, fixo_min: 2160,  fixo_max: 5400 },
    gaveta:       { min: 720,  max: 1440, fixo_min: 2880,  fixo_max: 6480 },
    prateleira:   { min: 540,  max: 1260, fixo_min: 1440,  fixo_max: 3600 },
    guarda_roupa: { min: 2160, max: 3960, fixo_min: 13200, fixo_max: 28800 },
    bancada:      { min: 1440, max: 2880, fixo_min: 6000,  fixo_max: 13200 },
    rack:         { min: 1200, max: 2400, fixo_min: 4800,  fixo_max: 10800 },
    divisoria:    { min: 1080, max: 2160, fixo_min: 4800,  fixo_max: 12000 },
    outro:        { min: 1260, max: 2520, fixo_min: 5400,  fixo_max: 12600 }
  };
  return tabela[normalizado] || tabela.outro;
}

function normalizarTipo(tipo: string): string {
  const t = (tipo || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const mapa: Record<string, string> = {
    'aereo': 'aereo', 'suspenso': 'aereo',
    'base': 'base', 'balcao': 'base',
    'bancada': 'bancada',
    'torre': 'torre', 'coluna': 'torre', 'despenseiro': 'torre',
    'painel': 'painel',
    'rack': 'rack',
    'nicho': 'nicho',
    'gaveta': 'gaveta', 'gaveteiro': 'gaveta',
    'prateleira': 'prateleira',
    'guarda roupa': 'guarda_roupa', 'guarda-roupa': 'guarda_roupa', 'roupeiro': 'guarda_roupa', 'armario': 'guarda_roupa',
    'divisoria': 'divisoria',
  };
  if (mapa[t]) return mapa[t];
  for (const [chave, valor] of Object.entries(mapa)) {
    if (t.includes(chave) || chave.includes(t)) return valor;
  }
  return 'outro';
}
