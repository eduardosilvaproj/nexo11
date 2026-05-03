import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { RelatorioEstimativa, MovelIdentificado } from '@/types/estimativa';

// Gemini API Key
const GEMINI_API_KEY = 'AIzaSyAT9_XU-P4znqAHIAD3KgCSGhzRY-YIeRo';

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
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      setProgress('Analisando projeto...');
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `Analise este PDF de projeto arquitetônico e identifique APENAS móveis planejados.

REGRAS TÉCNICAS PRINCIPAIS:
- Vão máximo sem reforço: 90cm
- Profundidade padrão armário: 60cm
- Profundidade padrão aéreo: 35cm
- Peso máximo prateleira MDP 15mm: 15kg
- Corrediça telescópica: até 35kg
- Corrediça oculta: até 35kg

Retorne JSON:
{
  "moveis": [
    {
      "ambiente": "nome",
      "tipo": "aereo|base|torre|painel|nicho|gaveta|outro",
      "descricao": "detalhes",
      "largura": 0,
      "altura": 0,
      "profundidade": 0,
      "quantidade": 1,
      "alertas": ["se vão > 90cm avisar"]
    }
  ],
  "observacoes_gerais": []
}

IGNORE: decoração, móveis soltos, quadros, plantas.
Retorne APENAS o JSON.`;

      const result = await model.generateContent([
        { text: prompt },
        { inlineData: { mimeType: file.type, data: base64 } }
      ]);

      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Resposta inválida');

      const analise = JSON.parse(jsonMatch[0]);

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
        const area = ((movel.largura || 0) * (movel.altura || 0)) / 10000;
        const { min, max } = getTabelaPreco(movel.tipo);
        return {
          movel_id: movel.id,
          preco_minimo: area * min * movel.quantidade,
          preco_maximo: area * max * movel.quantidade,
          preco_medio: area * ((min + max) / 2) * movel.quantidade,
          base_calculo: `${area.toFixed(2)}m² × R$ ${min}-${max}/m²`
        };
      });

      const relatorio: RelatorioEstimativa = {
        id: crypto.randomUUID(),
        pdf_url: publicUrl,
        data_analise: new Date().toISOString(),
        status: 'concluido',
        moveis,
        estimativas,
        validacoes: [],
        total_minimo: estimativas.reduce((s, e) => s + e.preco_minimo, 0),
        total_maximo: estimativas.reduce((s, e) => s + e.preco_maximo, 0),
        total_medio: estimativas.reduce((s, e) => s + e.preco_medio, 0),
        observacoes_gerais: analise.observacoes_gerais || []
      };

      setLoading(false);
      return relatorio;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setLoading(false);
      return null;
    }
  };

  return { analisarPDF, loading, progress, error };
};

function getTabelaPreco(tipo: string) {
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
