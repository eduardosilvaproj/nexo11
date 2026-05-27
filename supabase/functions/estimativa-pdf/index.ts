import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "estimativas";
const CHUNK_THRESHOLD_BYTES = 40 * 1024 * 1024;
const PAGES_PER_CHUNK = 15;
const LARGE_PDF_ERROR = "PDF muito grande para processar. Comprima o arquivo em ilovepdf.com ou exporte apenas as pranchas de layout.";

const promptText = 'Analise este PDF de projeto executivo de móveis planejados. Extraia:\n\n1. DADOS DO PROJETO (se disponíveis no carimbo, capa ou legendas):\n   - nome_cliente: nome do cliente/proprietário\n   - nome_obra: nome da obra ou endereço\n   - arquiteto: nome do arquiteto(a) ou escritório\n   - data_projeto: data do projeto\n\n2. MÓVEIS: Para cada módulo/peça identificada:\n   - ambiente, tipo, quantidade\n   - Tipos válidos: aereo, base, torre, painel, nicho, gaveta, prateleira, guarda_roupa, bancada, rack, divisoria, outro\n   - Identifique o MÁXIMO de peças possível — cada módulo separado conta como um item\n\nIMPORTANTE: Liste CADA módulo/peça separadamente. Um ambiente pode ter 5, 10 ou mais itens. NÃO agrupe múltiplos módulos em um único item. Por exemplo, uma cozinha típica tem: 3-5 aéreos + 2-3 bases + 1 torre + bancada = 7-10 itens separados.\n\nIMPORTANTE: Seja exaustivo. Um projeto residencial completo tipicamente tem 15-40 módulos. Não agrupe — liste cada módulo separadamente. Se um ambiente tem 3 aéreos iguais, liste como quantidade: 3 (um item), mas se são diferentes, liste cada um separado.\n\nRetorne APENAS JSON: {"dados_projeto":{"nome_cliente":"","nome_obra":"","arquiteto":"","data_projeto":""},"moveis":[{"ambiente":"","tipo":"","descricao":"","largura":0,"altura":0,"profundidade":0,"quantidade":1}],"observacoes_gerais":[]}\n\nSe algum dado do projeto não estiver visível, deixe string vazia.';

const PRECOS: Record<string, { min: number; max: number }> = {
  aereo: { min: 3600, max: 7500 },
  base: { min: 6000, max: 13500 },
  torre: { min: 9000, max: 18000 },
  painel: { min: 4500, max: 10500 },
  nicho: { min: 1800, max: 4500 },
  gaveta: { min: 2400, max: 5400 },
  prateleira: { min: 1200, max: 3000 },
  guarda_roupa: { min: 11000, max: 24000 },
  bancada: { min: 5000, max: 11000 },
  rack: { min: 4000, max: 9000 },
  divisoria: { min: 4000, max: 10000 },
  outro: { min: 4500, max: 10500 },
};

function normalizarTipo(tipo: string): string {
  const t = (tipo || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const mapa: Record<string, string> = {
    aereo: "aereo", suspenso: "aereo",
    base: "base", balcao: "base",
    bancada: "bancada",
    torre: "torre", coluna: "torre", despenseiro: "torre",
    painel: "painel",
    rack: "rack",
    nicho: "nicho",
    gaveta: "gaveta", gaveteiro: "gaveta",
    prateleira: "prateleira",
    "guarda roupa": "guarda_roupa", "guarda-roupa": "guarda_roupa", roupeiro: "guarda_roupa", armario: "guarda_roupa",
    divisoria: "divisoria",
  };
  if (mapa[t]) return mapa[t];
  for (const [chave, valor] of Object.entries(mapa)) {
    if (t.includes(chave) || chave.includes(t)) return valor;
  }
  return "outro";
}

class AppError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isLargePdfFailure(status: number, body: string) {
  return status === 413 || status === 408 || status === 504 || /context_length|too large|payload|timeout/i.test(body);
}

async function criarSignedUrl(supabase: any, filePath: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 900);
  if (error || !data?.signedUrl) {
    console.error("Storage signed URL error:", error);
    throw new AppError("Erro ao gerar URL do arquivo", 400);
  }
  return data.signedUrl;
}

async function chamarGemini(LOVABLE_API_KEY: string, fileUrl: string) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: promptText },
            { type: "file_url", file_url: { url: fileUrl } },
          ],
        },
      ],
    }),
  });

  const responseText = await response.text();
  if (!response.ok) {
    console.error("Lovable AI error:", response.status, responseText);
    if (response.status === 429) throw new AppError("Limite de requisições excedido. Tente novamente em instantes.", 429);
    if (response.status === 402) throw new AppError("Créditos de IA esgotados. Adicione créditos em Settings > Workspace > Usage.", 402);
    if (isLargePdfFailure(response.status, responseText)) throw new AppError(LARGE_PDF_ERROR, 413);

    let errorMsg = `Lovable AI retornou status ${response.status}`;
    try {
      const errorJson = JSON.parse(responseText);
      errorMsg = errorJson.error?.message || errorJson.error || errorMsg;
    } catch {
      errorMsg += ` - ${responseText.substring(0, 200)}`;
    }
    throw new AppError(errorMsg, 502);
  }

  const result = JSON.parse(responseText);
  const text = result.choices?.[0]?.message?.content ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new AppError("Resposta da IA não contém JSON válido", 422);
  return JSON.parse(jsonMatch[0]);
}

async function dividirPDF(pdfBytes: Uint8Array, paginasPorChunk: number): Promise<Uint8Array[]> {
  const doc = await PDFDocument.load(pdfBytes);
  const totalPages = doc.getPageCount();
  const chunks: Uint8Array[] = [];

  for (let i = 0; i < totalPages; i += paginasPorChunk) {
    const chunkDoc = await PDFDocument.create();
    const end = Math.min(i + paginasPorChunk, totalPages);
    const pages = await chunkDoc.copyPages(doc, Array.from({ length: end - i }, (_, idx) => i + idx));
    pages.forEach((page) => chunkDoc.addPage(page));
    chunks.push(await chunkDoc.save());
  }

  return chunks;
}

function juntarDadosProjeto(analises: any[]) {
  return analises.reduce((acc, analise) => {
    const dados = analise?.dados_projeto || {};
    return {
      nome_cliente: acc.nome_cliente || dados.nome_cliente || "",
      nome_obra: acc.nome_obra || dados.nome_obra || "",
      arquiteto: acc.arquiteto || dados.arquiteto || "",
      data_projeto: acc.data_projeto || dados.data_projeto || "",
    };
  }, { nome_cliente: "", nome_obra: "", arquiteto: "", data_projeto: "" });
}

function removerDuplicatas(moveis: any[]) {
  const mapa = new Map<string, any>();
  for (const movel of moveis) {
    const ambiente = (movel.ambiente || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const tipo = normalizarTipo(movel.tipo);
    const chave = `${ambiente}|${tipo}`;
    const atual = mapa.get(chave);
    const quantidade = Number(movel.quantidade) || 1;
    if (!atual || quantidade > (Number(atual.quantidade) || 1)) {
      mapa.set(chave, { ...movel, tipo, quantidade });
    }
  }
  return Array.from(mapa.values());
}

function calcularResultado(analise: any) {
  const estimativas = (analise.moveis || []).map((m: any, idx: number) => {
    const tipoNorm = normalizarTipo(m.tipo);
    const preco = PRECOS[tipoNorm] || PRECOS.outro;
    const qtd = m.quantidade || 1;
    return {
      movel_id: `movel_${idx}`,
      preco_minimo: preco.min * qtd,
      preco_maximo: preco.max * qtd,
      preco_medio: ((preco.min + preco.max) / 2) * qtd,
    };
  });

  const total_minimo = estimativas.reduce((s: number, e: any) => s + e.preco_minimo, 0) * 1.4;
  const total_maximo = estimativas.reduce((s: number, e: any) => s + e.preco_maximo, 0) * 1.2;
  const total_medio = estimativas.reduce((s: number, e: any) => s + e.preco_medio, 0) * 1.1;

  return { ...analise, estimativas, total_minimo, total_maximo, total_medio };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) return jsonResponse({ error: "LOVABLE_API_KEY não configurada" }, 500);
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return jsonResponse({ error: "Credenciais do Supabase não configuradas" }, 500);

    const { file_path, file_hash } = await req.json();
    if (!file_path) return jsonResponse({ error: "Campo file_path é obrigatório" }, 400);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const cacheKey = file_hash || file_path;

    const { data: cached } = await supabase
      .from("estimativas_cache")
      .select("resultado")
      .eq("file_path", cacheKey)
      .maybeSingle();

    if (cached) return jsonResponse(cached.resultado);

    const { data: files, error: listError } = await supabase.storage.from(BUCKET).list("", { search: file_path, limit: 1 });
    if (listError) {
      console.error("Storage list error:", listError);
      throw new AppError("Erro ao verificar tamanho do arquivo", 400);
    }
    const fileInfo = files?.find((file: any) => file.name === file_path);
    const fileSize = Number(fileInfo?.metadata?.size || 0);

    let analise: any;
    const tempPaths: string[] = [];

    try {
      if (fileSize > CHUNK_THRESHOLD_BYTES) {
        const { data: fileData, error: downloadError } = await supabase.storage.from(BUCKET).download(file_path);
        if (downloadError || !fileData) {
          console.error("Storage download error:", downloadError);
          throw new AppError("Erro ao baixar PDF para dividir em partes", 400);
        }

        const pdfBytes = new Uint8Array(await fileData.arrayBuffer());
        const chunks = await dividirPDF(pdfBytes, PAGES_PER_CHUNK);
        const analises: any[] = [];

        for (let i = 0; i < chunks.length; i++) {
          console.log(`Processando parte ${i + 1} de ${chunks.length}`);
          const chunkPath = `tmp/${cacheKey}_parte_${i + 1}_${Date.now()}.pdf`;
          tempPaths.push(chunkPath);
          const { error: uploadError } = await supabase.storage.from(BUCKET).upload(chunkPath, chunks[i], {
            contentType: "application/pdf",
            upsert: true,
          });
          if (uploadError) {
            console.error("Storage chunk upload error:", uploadError);
            throw new AppError("Erro ao preparar uma parte do PDF", 400);
          }
          const chunkUrl = await criarSignedUrl(supabase, chunkPath);
          analises.push(await chamarGemini(LOVABLE_API_KEY, chunkUrl));
        }

        analise = {
          dados_projeto: juntarDadosProjeto(analises),
          moveis: removerDuplicatas(analises.flatMap((item) => item?.moveis || [])),
          observacoes_gerais: analises.flatMap((item) => item?.observacoes_gerais || []),
        };
      } else {
        const fileUrl = await criarSignedUrl(supabase, file_path);
        analise = await chamarGemini(LOVABLE_API_KEY, fileUrl);
      }
    } finally {
      if (tempPaths.length > 0) {
        const { error: removeError } = await supabase.storage.from(BUCKET).remove(tempPaths);
        if (removeError) console.error("Storage temp cleanup error:", removeError);
      }
    }

    const resultadoFinal = calcularResultado(analise);

    await supabase.from("estimativas_cache").insert({
      file_path: cacheKey,
      resultado: resultadoFinal,
    });

    return jsonResponse(resultadoFinal);
  } catch (err) {
    console.error("estimativa-pdf error:", err);
    const status = err instanceof AppError ? err.status : 500;
    const message = err instanceof Error ? err.message : "Erro interno";
    return jsonResponse({ error: message }, status);
  }
});
