import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { RelatorioEstimativa, MovelIdentificado, DadosProjeto } from '@/types/estimativa';

export const useEstimativaPDF = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const analisarPDF = async (file: File): Promise<RelatorioEstimativa | null> => {
    setLoading(true);
    setError(null);

    try {
      const MAX_SIZE = 50 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        const msg = 'PDF muito grande (máximo 50MB). Reduza o tamanho do arquivo ou envie menos páginas.';
        toast({ title: 'Arquivo muito grande', description: msg, variant: 'destructive' });
        setError(msg);
        setLoading(false);
        return null;
      }

      setProgress('Enviando PDF...');
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const safeName = file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]+/g, '_')
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
        { body: { file_path: fileName, file_hash: fileHash } }
      );

      if (fnError) {
        const detail = typeof fnError === 'object' && 'context' in fnError
          ? JSON.stringify(fnError)
          : fnError.message;
        throw new Error(`Edge Function erro: ${detail}`);
      }
      if (resposta?.error) throw new Error(resposta.error);

      const analise = resposta;
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

      const estimativas = (analise.estimativas || []).map((e: any) => ({
        movel_id: e.movel_id,
        preco_minimo: e.preco_minimo,
        preco_maximo: e.preco_maximo,
        preco_medio: e.preco_medio,
        base_calculo: e.base_calculo || '',
      }));

      const total_minimo = analise.total_minimo ?? estimativas.reduce((s: number, e: any) => s + e.preco_minimo, 0);
      const total_maximo = analise.total_maximo ?? estimativas.reduce((s: number, e: any) => s + e.preco_maximo, 0);
      const total_medio = analise.total_medio ?? estimativas.reduce((s: number, e: any) => s + e.preco_medio, 0);

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
  const normalizado = normalizarTipo(tipo);
  const tabela: Record<string, { min: number; max: number; fixo_min: number; fixo_max: number }> = {
    aereo:        { min: 2400, max: 4500, fixo_min: 3600, fixo_max: 7500 },
    base:         { min: 3000, max: 5400, fixo_min: 6000, fixo_max: 13500 },
    torre:        { min: 3600, max: 6600, fixo_min: 9000, fixo_max: 18000 },
    painel:       { min: 1800, max: 3600, fixo_min: 4500, fixo_max: 10500 },
    nicho:        { min: 1500, max: 3000, fixo_min: 1800, fixo_max: 4500 },
    gaveta:       { min: 1200, max: 2400, fixo_min: 2400, fixo_max: 5400 },
    prateleira:   { min: 900,  max: 2100, fixo_min: 1200, fixo_max: 3000 },
    guarda_roupa: { min: 3600, max: 6600, fixo_min: 11000, fixo_max: 24000 },
    bancada:      { min: 2400, max: 4800, fixo_min: 5000, fixo_max: 11000 },
    rack:         { min: 2000, max: 4000, fixo_min: 4000, fixo_max: 9000 },
    divisoria:    { min: 1800, max: 3600, fixo_min: 4000, fixo_max: 10000 },
    outro:        { min: 2100, max: 4200, fixo_min: 4500, fixo_max: 10500 }
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
