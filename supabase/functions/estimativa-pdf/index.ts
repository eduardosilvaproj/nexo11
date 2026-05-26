import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    console.log("GROQ key starts with:", GROQ_API_KEY?.substring(0, 8));
    if (!GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GROQ_API_KEY não configurada no servidor" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { pdf_base64 } = await req.json();
    if (!pdf_base64) {
      return new Response(
        JSON.stringify({ error: "Campo pdf_base64 é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.2-90b-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: 'Analise este PDF de projeto e identifique móveis planejados. Retorne JSON: {"moveis":[{"ambiente":"","tipo":"aereo|base|torre|painel|nicho|gaveta|outro","descricao":"","largura":0,"altura":0,"profundidade":0,"quantidade":1}],"observacoes_gerais":[]}',
              },
              {
                type: "image_url",
                image_url: { url: `data:application/pdf;base64,${pdf_base64}` },
              },
            ],
          },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error("Groq API error:", response.status, responseText);
      let errorMsg = `Groq API retornou status ${response.status}`;
      try {
        const errorJson = JSON.parse(responseText);
        errorMsg = errorJson.error?.message || errorMsg;
      } catch {
        errorMsg += ` - ${responseText.substring(0, 200)}`;
      }
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(responseText);
    const text = result.choices[0].message.content;

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: "Resposta da IA não contém JSON válido", raw: text }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const analise = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify(analise),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
