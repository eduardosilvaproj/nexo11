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
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Credenciais do Supabase não configuradas" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { file_path } = await req.json();
    if (!file_path) {
      return new Response(
        JSON.stringify({ error: "Campo file_path é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Baixar o PDF do Storage
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
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

    // 2. Upload do PDF como file para OpenAI
    const blob = new Blob([await fileData.arrayBuffer()], { type: "application/pdf" });
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

    // 3. Chamar GPT-4o com o file anexado
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
                text: 'Analise este PDF de projeto executivo de móveis planejados. Para cada móvel/módulo identificado, extraia:\n- O ambiente onde está (ex: Cozinha, Sala de TV, Quarto Casal, Suite, Hall, Escritório)\n- O tipo: aereo, base, torre, painel, nicho, gaveta, prateleira, guarda_roupa, bancada, rack, divisoria ou outro\n- Quantidade\n\nIdentifique o MÁXIMO de peças possível — cada módulo separado conta como um item (ex: se a cozinha tem 3 aéreos, 2 bases e 1 torre, são 6 itens).\n\nRetorne APENAS JSON: {"moveis":[{"ambiente":"","tipo":"","descricao":"","largura":0,"altura":0,"profundidade":0,"quantidade":1}],"observacoes_gerais":[]}',
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

    // 4. Limpar: deletar o file após uso
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
