import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function brl(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
}

function resumirContexto(ctx: any): string {
  if (!ctx) return "Sem contexto.";
  const dados = ctx.dados_projeto || {};
  const ambientes = new Map<string, { qtd: number; medio: number; min: number; max: number; tipos: Set<string> }>();
  const estByMovel = new Map<string, any>();
  (ctx.estimativas || []).forEach((e: any) => estByMovel.set(e.movel_id, e));
  (ctx.moveis || []).forEach((m: any) => {
    const a = m.ambiente || "Sem ambiente";
    const est = estByMovel.get(m.id) || {};
    const cur = ambientes.get(a) || { qtd: 0, medio: 0, min: 0, max: 0, tipos: new Set() };
    cur.qtd += m.quantidade || 1;
    cur.medio += est.preco_medio || 0;
    cur.min += est.preco_minimo || 0;
    cur.max += est.preco_maximo || 0;
    cur.tipos.add(m.tipo);
    ambientes.set(a, cur);
  });
  const linhas = Array.from(ambientes.entries())
    .sort((a, b) => b[1].medio - a[1].medio)
    .map(([nome, v]) => `- ${nome}: ${v.qtd} peças (${Array.from(v.tipos).join(", ")}) — médio ${brl(v.medio)} (min ${brl(v.min)} / max ${brl(v.max)})`)
    .join("\n");
  const coments = ctx.comentarios_ambientes || {};
  const comentLinhas = Object.entries(coments).map(([k, v]) => `- ${k}: ${v}`).join("\n");
  return `Cliente: ${dados.nome_cliente || "—"} | Obra: ${dados.nome_obra || "—"} | Arquiteto: ${dados.arquiteto || "—"}
Totais: mínimo ${brl(ctx.total_minimo)} | médio ${brl(ctx.total_medio)} | máximo ${brl(ctx.total_maximo)}
Orçamento cliente: ${ctx.contexto?.orcamento_cliente ? brl(ctx.contexto.orcamento_cliente) : "não informado"}
Tipo de projeto: ${ctx.contexto?.tipo_projeto || "—"}

Ambientes (ordenados por valor médio):
${linhas}

${comentLinhas ? `Observações por ambiente:\n${comentLinhas}` : ""}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) return json({ error: "GEMINI_API_KEY não configurada" }, 500);

    const { mensagem, contexto, historico } = await req.json();
    if (!mensagem || typeof mensagem !== "string") return json({ error: "mensagem obrigatória" }, 400);

    const resumo = resumirContexto(contexto);
    const systemPrompt = `Você é um consultor especialista em móveis planejados. O vendedor está analisando um projeto e precisa de ajuda.

Dados do projeto:
${resumo}

Responda de forma:
- Objetiva e direta (máx 4-6 frases curtas, use bullets quando útil)
- Com valores em R$ quando relevante
- Sugerindo alternativas concretas quando perguntado sobre economia (trocar materiais, simplificar módulos, reduzir gavetas, etc.)
- Destacando oportunidades de upsell quando perguntado sobre upgrades (iluminação LED, ferragens premium, acabamentos especiais)
- Em português do Brasil, tom profissional e amigável`;

    const contents: any[] = [];
    (historico || []).forEach((m: any) => {
      contents.push({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] });
    });
    contents.push({ role: "user", parts: [{ text: mensagem }] });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.4, maxOutputTokens: 800 },
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      console.error("Gemini erro:", res.status, t);
      return json({ error: `Erro Gemini (${res.status})` }, 500);
    }
    const data = await res.json();
    const resposta = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") || "Não consegui gerar resposta.";
    return json({ resposta });
  } catch (e) {
    console.error("chat-estimativa erro:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
