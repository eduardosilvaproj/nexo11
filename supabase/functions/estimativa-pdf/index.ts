import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "estimativas";
const LARGE_PDF_ERROR = "PDF muito grande para processar. Comprima o arquivo em ilovepdf.com ou exporte apenas as pranchas de layout.";

const promptText = 'Analise este PDF de projeto executivo de móveis planejados. Extraia:\n\n1. DADOS DO PROJETO (se disponíveis no carimbo, capa ou legendas):\n   - nome_cliente: nome do cliente/proprietário\n   - nome_obra: nome da obra ou endereço\n   - arquiteto: nome do arquiteto(a) ou escritório\n   - data_projeto: data do projeto\n\n2. MÓVEIS: Para cada módulo/peça identificada:\n   - ambiente, tipo, quantidade\n   - Tipos válidos: aereo, base, torre, painel, nicho, gaveta, prateleira, guarda_roupa, bancada, rack, divisoria, outro\n   - Identifique o MÁXIMO de peças possível — cada módulo separado conta como um item\n\n⚠️ ATENÇÃO CRÍTICA: Este é um projeto COMPLETO com MUITOS ambientes. Analise TODAS as páginas do PDF, do início ao fim. Um projeto residencial típico tem 8-15 ambientes diferentes: cozinha, sala de estar, sala de jantar, quartos, suítes, banheiros, lavabo, varanda, escritório/home office, closet, lavanderia, área de serviço, hall, dormitórios. Se você identificou MENOS DE 5 AMBIENTES, releia o PDF — certamente está faltando. NÃO PARE até ter passado por todas as páginas.\n\nIMPORTANTE: Liste CADA módulo/peça separadamente. Um ambiente pode ter 5, 10 ou mais itens. NÃO agrupe múltiplos módulos em um único item. Por exemplo, uma cozinha típica tem: 3-5 aéreos + 2-3 bases + 1 torre + bancada = 7-10 itens separados.\n\nIMPORTANTE: Seja exaustivo. Um projeto residencial completo tipicamente tem 20-60 módulos distribuídos em 8-15 ambientes. Não agrupe — liste cada módulo separadamente. Se um ambiente tem 3 aéreos iguais, liste como quantidade: 3 (um item), mas se são diferentes, liste cada um separado.\n\nDEDUPLICAÇÃO: O PDF pode ter o mesmo ambiente com nomes diferentes em páginas diferentes (ex: "Suite 1" na planta e "Suite Visita" no detalhamento, ou "Suite 2" e "Suite Filho"). Unifique ambientes que claramente se referem ao mesmo espaço. Use o nome mais descritivo (ex: "Suite Visita" ao invés de "Suite 1"). NÃO duplique móveis que aparecem tanto na planta quanto no detalhamento — conte cada móvel apenas UMA vez. Mas NÃO confunda deduplicação com omissão: ambientes diferentes (Suite Casal ≠ Suite Filho ≠ Suite Visita) devem todos aparecer.\n\nRetorne APENAS JSON válido e COMPLETO (não trunque): {"dados_projeto":{"nome_cliente":"","nome_obra":"","arquiteto":"","data_projeto":""},"moveis":[{"ambiente":"","tipo":"","descricao":"","largura":0,"altura":0,"profundidade":0,"quantidade":1}],"observacoes_gerais":[]}\n\nDescrições devem ser curtas (máx 60 caracteres) para evitar truncamento. Se algum dado do projeto não estiver visível, deixe string vazia.';

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

async function uploadParaGeminiFileAPI(supabase: any, GEMINI_API_KEY: string, filePath: string): Promise<string> {
  const { data: urlData, error: urlError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 600);
  if (urlError || !urlData?.signedUrl) {
    console.error("Signed URL error:", urlError);
    throw new AppError("Erro ao gerar URL do arquivo", 400);
  }

  const fileResponse = await fetch(urlData.signedUrl);
  if (!fileResponse.ok) throw new AppError("Erro ao baixar PDF da URL assinada", 400);
  const fileBlob = await fileResponse.blob();
  const fileSize = fileBlob.size;

  // Step 1: Start resumable upload (envia apenas metadata)
  const startUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_API_KEY}`;
  const startRes = await fetch(startUrl, {
    method: "POST",
    headers: {
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(fileSize),
      "X-Goog-Upload-Header-Content-Type": "application/pdf",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file: { display_name: "projeto.pdf" } }),
  });

  if (!startRes.ok) {
    const errText = await startRes.text();
    console.error("Gemini resumable start error:", startRes.status, errText.substring(0, 500));
    if (startRes.status === 429) throw new AppError("Limite de requisições do Gemini excedido. Tente novamente em instantes.", 429);
    throw new AppError(`Erro ao iniciar upload no Gemini: ${errText.substring(0, 200)}`, 502);
  }

  const uploadSessionUrl = startRes.headers.get("x-goog-upload-url") || startRes.headers.get("X-Goog-Upload-URL");
  if (!uploadSessionUrl) throw new AppError("Gemini não retornou URL de upload resumable", 502);

  // Step 2: Upload bytes + finalize em uma chamada
  const uploadRes = await fetch(uploadSessionUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(fileSize),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: fileBlob,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    console.error("Gemini resumable upload error:", uploadRes.status, errText.substring(0, 500));
    if (uploadRes.status === 429) throw new AppError("Limite de requisições do Gemini excedido. Tente novamente em instantes.", 429);
    throw new AppError(`Erro no upload ao Gemini: ${errText.substring(0, 200)}`, 502);
  }

  const uploadData = await uploadRes.json();
  const fileUri = uploadData?.file?.uri;
  if (!fileUri) throw new AppError("Gemini File API não retornou URI do arquivo", 502);
  console.log("Gemini File API uploaded:", fileUri, "| size:", fileSize);
  return fileUri;
}

async function chamarGemini(GEMINI_API_KEY: string, fileUri: string) {
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(geminiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: promptText },
          { file_data: { mime_type: "application/pdf", file_uri: fileUri } },
        ],
      }],
      generationConfig: { temperature: 0, maxOutputTokens: 65536 },
    }),
  });


  const responseText = await response.text();
  if (!response.ok) {
    console.error("Gemini API error:", response.status, responseText.substring(0, 500));
    if (response.status === 429) throw new AppError("Limite de requisições do Gemini excedido. Tente novamente em instantes.", 429);
    if (isLargePdfFailure(response.status, responseText)) throw new AppError(LARGE_PDF_ERROR, 413);
    throw new AppError(`Gemini retornou status ${response.status}: ${responseText.substring(0, 200)}`, 502);
  }

  const result = JSON.parse(responseText);
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const finishReason = result.candidates?.[0]?.finishReason;
  console.log("Gemini finishReason:", finishReason, "| text length:", text.length);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("Resposta sem JSON. Texto bruto:", text.substring(0, 1000));
    throw new AppError("Resposta da IA não contém JSON válido", 422);
  }
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    console.log("Gemini parseado: ambientes únicos =",
      new Set((parsed.moveis || []).map((m: any) => m.ambiente)).size,
      "| total móveis =", (parsed.moveis || []).length,
      "| finishReason =", finishReason);
    return parsed;
  } catch (e) {
    console.error("JSON inválido (provável truncamento). finishReason:", finishReason, "| tamanho:", jsonMatch[0].length, "| fim:", jsonMatch[0].substring(Math.max(0, jsonMatch[0].length - 300)));
    throw new AppError("Resposta da IA truncada ou JSON inválido", 422);
  }
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
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GEMINI_API_KEY) return jsonResponse({ error: "GEMINI_API_KEY não configurada" }, 500);
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return jsonResponse({ error: "Credenciais do Supabase não configuradas" }, 500);

    const { file_path, file_hash, contexto } = await req.json();
    if (!file_path) return jsonResponse({ error: "Campo file_path é obrigatório" }, 400);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const cacheKey = file_hash || file_path;

    const { data: cached } = await supabase
      .from("estimativas_cache")
      .select("resultado")
      .eq("file_path", cacheKey)
      .maybeSingle();

    if (cached) return jsonResponse(cached.resultado);

    const fileUri = await uploadParaGeminiFileAPI(supabase, GEMINI_API_KEY, file_path);
    const analise = await chamarGemini(GEMINI_API_KEY, fileUri);
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
