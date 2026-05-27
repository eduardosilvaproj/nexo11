import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { supabase } from '@/integrations/supabase/client';
import type { RelatorioEstimativa, MovelIdentificado, DadosProjeto } from '@/types/estimativa';

const CHUNK_THRESHOLD_BYTES = 60 * 1024 * 1024;
const PAGES_PER_CHUNK = 10;

async function contarPaginasPDF(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer();
  const doc = await PDFDocument.load(arrayBuffer);
  return doc.getPageCount();
}

async function dividirPDFEmChunks(file: File, paginasPorChunk: number): Promise<Uint8Array[]> {
  const arrayBuffer = await file.arrayBuffer();
  const doc = await PDFDocument.load(arrayBuffer);
  const totalPages = doc.getPageCount();
  const chunks: Uint8Array[] = [];

  for (let i = 0; i < totalPages; i += paginasPorChunk) {
    const chunkDoc = await PDFDocument.create();
    const end = Math.min(i + paginasPorChunk, totalPages);
    const indices = Array.from({ length: end - i }, (_, idx) => i + idx);
    const pages = await chunkDoc.copyPages(doc, indices);
    pages.forEach((page) => chunkDoc.addPage(page));
    chunks.push(await chunkDoc.save());
  }

  return chunks;
}

async function contarPaginasPDF(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer();
  const doc = await PDFDocument.load(arrayBuffer);
  return doc.getPageCount();
}

function sanitizeName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_');
}

function juntarDadosProjeto(analises: any[]): DadosProjeto {
  return analises.reduce<DadosProjeto>((acc, a) => {
    const d = a?.dados_projeto || {};
    return {
      nome_cliente: acc.nome_cliente || d.nome_cliente || '',
      nome_obra: acc.nome_obra || d.nome_obra || '',
      arquiteto: acc.arquiteto || d.arquiteto || '',
      data_projeto: acc.data_projeto || d.data_projeto || '',
    } as DadosProjeto;
  }, { nome_cliente: '', nome_obra: '', arquiteto: '', data_projeto: '' } as DadosProjeto);
}

function removerDuplicatas(moveis: any[]) {
  const mapa = new Map<string, any>();
  for (const m of moveis) {
    const ambiente = (m.ambiente || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const tipo = normalizarTipo(m.tipo);
    const chave = `${ambiente}|${tipo}`;
    const atual = mapa.get(chave);
    const qtd = Number(m.quantidade) || 1;
    if (!atual || qtd > (Number(atual.quantidade) || 1)) {
      mapa.set(chave, { ...m, tipo, quantidade: qtd });
    }
  }
  return Array.from(mapa.values());
}

export const useEstimativaPDF = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const analisarPDF = async (file: File): Promise<RelatorioEstimativa | null> => {
    setLoading(true);
    setError(null);

    try {
      setProgress('Calculando hash...');
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const fileHash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0')).join('');

      const safeName = sanitizeName(file.name);
      const baseName = `${Date.now()}_${safeName}`;

      let analise: any;
      let publicUrl = '';

      if (file.size < CHUNK_THRESHOLD_BYTES) {
        // Fluxo simples — upload do arquivo inteiro
        setProgress('Enviando PDF...');
        const fileName = baseName;
        const { error: uploadError } = await supabase.storage
          .from('estimativas').upload(fileName, file);
        if (uploadError) throw uploadError;

        publicUrl = supabase.storage.from('estimativas').getPublicUrl(fileName).data.publicUrl;

        setProgress('Analisando projeto com IA...');
        const { data, error: fnError } = await supabase.functions.invoke(
          'estimativa-pdf',
          { body: { file_path: fileName, file_hash: fileHash } }
        );
        if (fnError) throw new Error(`Edge Function erro: ${fnError.message}`);
        if (data?.error) throw new Error(data.error);
        analise = data;
      } else {
        // Fluxo com chunking no navegador
        setProgress('Dividindo PDF em partes...');
        const chunks = await dividirPDFEmChunks(file, PAGES_PER_CHUNK);
        const total = chunks.length;

        const analises: any[] = [];
        const chunkPaths: string[] = [];
        let chunksComErro = 0;
        const errosDetalhes: string[] = [];

        for (let i = 0; i < total; i++) {
          setProgress(`Processando parte ${i + 1} de ${total}...`);
          const chunkPath = `chunks/${fileHash}_parte_${i + 1}_${Date.now()}.pdf`;
          chunkPaths.push(chunkPath);

          try {
            const chunkBlob = new Blob([chunks[i] as BlobPart], { type: 'application/pdf' });
            const { error: upErr } = await supabase.storage
              .from('estimativas').upload(chunkPath, chunkBlob, { upsert: true, contentType: 'application/pdf' });
            if (upErr) throw upErr;

            if (i === 0) {
              publicUrl = supabase.storage.from('estimativas').getPublicUrl(chunkPath).data.publicUrl;
            }

            const chunkHash = `${fileHash}_parte_${i + 1}`;
            const { data, error: fnError } = await supabase.functions.invoke(
              'estimativa-pdf',
              { body: { file_path: chunkPath, file_hash: chunkHash } }
            );
            if (fnError) {
              const status = (fnError as any)?.context?.status;
              throw new Error(
                status === 429
                  ? 'Limite de requisições do Gemini excedido. A nova chave ainda está sem cota/billing para Gemini 2.5 Pro.'
                  : fnError.message
              );
            }
            if (data?.error) throw new Error(data.error);
            analises.push(data);
          } catch (err) {
            chunksComErro++;
            const msg = err instanceof Error ? err.message : String(err);
            errosDetalhes.push(`Parte ${i + 1}: ${msg}`);
            console.warn(`Chunk ${i + 1} falhou, pulando...`, msg);
          }
        }

        if (analises.length === 0) {
          throw new Error(`Nenhuma parte foi processada. Erros: ${errosDetalhes.slice(0, 3).join(' | ')}`);
        }

        setProgress('Juntando resultados...');
        const moveisCombinados = removerDuplicatas(analises.flatMap((a) => a?.moveis || []));
        const observacoes = analises.flatMap((a) => a?.observacoes_gerais || []);
        if (chunksComErro > 0) {
          observacoes.unshift(
            `⚠️ ${analises.length} de ${total} partes processadas com sucesso. ${chunksComErro} ${chunksComErro === 1 ? 'parte não pôde ser analisada' : 'partes não puderam ser analisadas'} (páginas em branco, imagens complexas ou erro temporário da IA).`
          );
        }
        analise = {
          dados_projeto: juntarDadosProjeto(analises),
          moveis: moveisCombinados,
          estimativas: [],
          observacoes_gerais: observacoes,
        };

        // Limpa os chunks do storage
        supabase.storage.from('estimativas').remove(chunkPaths).catch(() => {});
      }

      const dados_projeto: DadosProjeto = analise.dados_projeto || {};

      setProgress('Calculando estimativas...');
      const moveis: MovelIdentificado[] = (analise.moveis || []).map((m: any, idx: number) => ({
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

      // Recalcula estimativas localmente quando vieram de múltiplos chunks (ou usa as do servidor se single)
      const estimativas = moveis.map((m, idx) => {
        const preco = getTabelaPreco(m.tipo);
        const qtd = m.quantidade || 1;
        return {
          movel_id: `movel_${idx}`,
          preco_minimo: preco.fixo_min * qtd,
          preco_maximo: preco.fixo_max * qtd,
          preco_medio: ((preco.fixo_min + preco.fixo_max) / 2) * qtd,
          base_calculo: '',
        };
      });

      const total_minimo = estimativas.reduce((s, e) => s + e.preco_minimo, 0) * 1.4;
      const total_maximo = estimativas.reduce((s, e) => s + e.preco_maximo, 0) * 1.2;
      const total_medio = estimativas.reduce((s, e) => s + e.preco_medio, 0) * 1.1;

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
