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
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY não configurada" }),
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

    // 1. Upload do PDF como file
    const pdfBytes = Uint8Array.from(atob(pdf_base64), c => c.charCodeAt(0));
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const formData = new FormData();
    formData.append("file", blob, "projeto.pdf");
    formData.append("purpose", "assistants");

    const uploadRes = await fetch("https://api.openai.com/v1/files", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_API_KEY}` },
      body: formData,
    });

    const uploadText = await uploadRes.text();
    if (!uploadRes.ok) {
      console.error("Upload error:", uploadRes.status, uploadText);
      return new Response(
        JSON.stringify({ error: `Erro no upload: ${uploadText.substring(0, 200)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const uploadData = JSON.parse(uploadText);
    const fileId = uploadData.id;

    // 2. Chamar GPT-4o com o file anexado
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: 'Analise este PDF de projeto de móveis planejados. Identifique todos os móveis presentes com suas medidas. Retorne APENAS um JSON válido neste formato: {"moveis":[{"ambiente":"nome do ambiente","tipo":"aereo|base|torre|painel|nicho|gaveta|outro","descricao":"descrição do móvel","largura":0,"altura":0,"profundidade":0,"quantidade":1}],"observacoes_gerais":["observação 1"]}. Medidas em centímetros. Se não conseguir identificar uma medida, use 0.',
              },
              {
                type: "file",
                file: { file_id: fileId },
              },
            ],
          },
        ],
        temperature: 0.2,
        max_tokens: 4000,
      }),
    });

    const responseText = await response.text();

    // 3. Limpar: deletar o file após uso
    fetch(`https://api.openai.com/v1/files/${fileId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${OPENAI_API_KEY}` },
    }).catch(() => {});

    if (!response.ok) {
      console.error("OpenAI API error:", response.status, responseText);
      let errorMsg = `OpenAI API retornou status ${response.status}`;
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
