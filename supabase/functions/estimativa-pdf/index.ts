import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Credenciais do Supabase não configuradas" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { file_path, file_hash } = await req.json();
    if (!file_path) {
      return new Response(
        JSON.stringify({ error: "Campo file_path é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const cacheKey = file_hash || file_path;

    // 0. Cache
    const { data: cached } = await supabase
      .from("estimativas_cache")
      .select("resultado")
      .eq("file_path", cacheKey)
      .maybeSingle();

    if (cached) {
      return new Response(
        JSON.stringify(cached.resultado),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Baixar o PDF do Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("estimativas")
      .download(file_path);

    if (downloadError || !fileData) {
      console.error("Storage download error:", downloadError);
      return new Response(
        JSON.stringify({ error: `Erro ao baixar PDF: ${downloadError?.message || "arquivo não encontrado"}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Converter PDF para base64 data URL
    const buffer = new Uint8Array(await fileData.arrayBuffer());
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < buffer.length; i += chunkSize) {
      binary += String.fromCharCode(...buffer.subarray(i, i + chunkSize));
    }
    const base64 = btoa(binary);
    const dataUrl = `data:application/pdf;base64,${base64}`;

    const promptText = 'Analise este PDF de projeto executivo de móveis planejados. Extraia:\n\n1. DADOS DO PROJETO (se disponíveis no carimbo, capa ou legendas):\n   - nome_cliente: nome do cliente/proprietário\n   - nome_obra: nome da obra ou endereço\n   - arquiteto: nome do arquiteto(a) ou escritório\n   - data_projeto: data do projeto\n\n2. MÓVEIS: Para cada módulo/peça identificada:\n   - ambiente, tipo, quantidade\n   - Tipos válidos: aereo, base, torre, painel, nicho, gaveta, prateleira, guarda_roupa, bancada, rack, divisoria, outro\n   - Identifique o MÁXIMO de peças possível — cada módulo separado conta como um item\n\nIMPORTANTE: Liste CADA módulo/peça separadamente. Um ambiente pode ter 5, 10 ou mais itens. NÃO agrupe múltiplos módulos em um único item. Por exemplo, uma cozinha típica tem: 3-5 aéreos + 2-3 bases + 1 torre + bancada = 7-10 itens separados.\n\nIMPORTANTE: Seja exaustivo. Um projeto residencial completo tipicamente tem 15-40 módulos. Não agrupe — liste cada módulo separadamente. Se um ambiente tem 3 aéreos iguais, liste como quantidade: 3 (um item), mas se são diferentes, liste cada um separado.\n\nRetorne APENAS JSON: {"dados_projeto":{"nome_cliente":"","nome_obra":"","arquiteto":"","data_projeto":""},"moveis":[{"ambiente":"","tipo":"","descricao":"","largura":0,"altura":0,"profundidade":0,"quantidade":1}],"observacoes_gerais":[]}\n\nSe algum dado do projeto não estiver visível, deixe string vazia.';

    // 3. Chamar Lovable AI Gateway (Gemini 2.5 Pro)
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
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error("Lovable AI error:", response.status, responseText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos em Settings > Workspace > Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 413 || response.status === 408 || response.status === 504 || /context_length|too large|payload/i.test(responseText)) {
        return new Response(
          JSON.stringify({ error: "PDF muito grande para processar. Comprima o arquivo em ilovepdf.com ou exporte apenas as pranchas de layout." }),
          { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      let errorMsg = `Lovable AI retornou status ${response.status}`;
      try {
        const errorJson = JSON.parse(responseText);
        errorMsg = errorJson.error?.message || errorJson.error || errorMsg;
      } catch {
        errorMsg += ` - ${responseText.substring(0, 200)}`;
      }
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(responseText);
    const text = result.choices?.[0]?.message?.content ?? "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: "Resposta da IA não contém JSON válido", raw: text }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const analise = JSON.parse(jsonMatch[0]);

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

    const resultadoFinal = { ...analise, estimativas, total_minimo, total_maximo, total_medio };

    await supabase.from("estimativas_cache").insert({
      file_path: cacheKey,
      resultado: resultadoFinal,
    });

    return new Response(
      JSON.stringify(resultadoFinal),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
