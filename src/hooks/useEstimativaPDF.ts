import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RelatorioEstimativa, MovelIdentificado, DadosProjeto, ContextoEstimativa } from '@/types/estimativa';

export const useEstimativaPDF = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const analisarPDF = async (file: File, _contexto?: ContextoEstimativa): Promise<RelatorioEstimativa | null> => {
    setLoading(true);
    setError(null);

    try {
      setProgress('Enviando PDF...');
      // Sanitizar nome do arquivo (remover acentos e caracteres especiais)
      const safeName = file.name
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_+/g, '_');
      const fileName = `${Date.now()}_${safeName}`;
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

      // Extrair dados do projeto se disponíveis
      const dados_projeto: DadosProjeto = analise.dados_projeto || {};

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

        // Se medidas parecem estar em metros (< 10), converter para cm
        if (largura > 0 && largura < 10) largura = largura * 100;
        if (altura > 0 && altura < 10) altura = altura * 100;

        const area = (largura * altura) / 10000;
        const tabela = getTabelaPreco(movel.tipo);

        // Se não tem medidas ou área é muito pequena, usa preço fixo por tipo
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
        dados_projeto,
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
  // Normaliza o tipo recebido da IA para um dos tipos conhecidos
  const normalizado = normalizarTipo(tipo);
  // Valores ajustados para mercado de móveis planejados premium
  const tabela: Record<string, { min: number; max: number; fixo_min: number; fixo_max: number }> = {
    aereo:      { min: 2400, max: 4500, fixo_min: 3600, fixo_max: 7500 },
    base:       { min: 3000, max: 5400, fixo_min: 6000, fixo_max: 13500 },
    torre:      { min: 3600, max: 6600, fixo_min: 9000, fixo_max: 18000 },
    painel:     { min: 1800, max: 3600, fixo_min: 4500, fixo_max: 10500 },
    nicho:      { min: 1500, max: 3000, fixo_min: 1800, fixo_max: 4500 },
    gaveta:     { min: 1200, max: 2400, fixo_min: 2400, fixo_max: 5400 },
    prateleira: { min: 900,  max: 2100, fixo_min: 1200, fixo_max: 3000 },
    guarda_roupa: { min: 3600, max: 6600, fixo_min: 11000, fixo_max: 24000 },
    bancada:    { min: 2400, max: 4800, fixo_min: 5000, fixo_max: 11000 },
    rack:       { min: 2000, max: 4000, fixo_min: 4000, fixo_max: 9000 },
    divisoria:  { min: 1800, max: 3600, fixo_min: 4000, fixo_max: 10000 },
    outro:      { min: 2100, max: 4200, fixo_min: 4500, fixo_max: 10500 }
  };
  return tabela[normalizado] || tabela.outro;
}

function normalizarTipo(tipo: string): string {
  const t = (tipo || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const mapa: Record<string, string> = {
    'aereo': 'aereo', 'aéreo': 'aereo', 'armario aereo': 'aereo', 'suspenso': 'aereo',
    'base': 'base', 'balcao': 'base', 'bancada': 'bancada',
    'torre': 'torre', 'torre quente': 'torre', 'coluna': 'torre', 'despenseiro': 'torre',
    'painel': 'painel', 'rack': 'rack',
    'nicho': 'nicho',
    'gaveta': 'gaveta', 'gaveteiro': 'gaveta',
    'prateleira': 'prateleira',
    'guarda roupa': 'guarda_roupa', 'guarda-roupa': 'guarda_roupa', 'roupeiro': 'guarda_roupa', 'armario': 'guarda_roupa',
    'divisoria': 'divisoria', 'divisória': 'divisoria',
  };
  // Busca exata primeiro
  if (mapa[t]) return mapa[t];
  // Busca parcial
  for (const [chave, valor] of Object.entries(mapa)) {
    if (t.includes(chave) || chave.includes(t)) return valor;
  }
  return 'outro';
}
