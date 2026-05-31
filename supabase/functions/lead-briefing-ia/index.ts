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
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY não configurada. Adicione nas variáveis de ambiente do Supabase.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado");

    const { action, lead_id, lead_nome } = await req.json();

    // Buscar anotações do lead
    const { data: anotacoes } = await supabase
      .from("lead_anotacoes")
      .select("*")
      .eq("lead_id", lead_id)
      .order("created_at", { ascending: true });

    if (action === "resumo") {
      // 1. Transcrever áudios pendentes
      const audios = (anotacoes ?? []).filter(
        (a: any) => a.tipo === "audio" && a.audio_url && !a.conteudo
      );

      for (const audio of audios) {
        try {
          // Download do áudio
          const audioResp = await fetch(audio.audio_url);
          const audioBuffer = await audioResp.arrayBuffer();

          // Transcrever com Whisper
          const formData = new FormData();
          formData.append("file", new Blob([audioBuffer], { type: "audio/webm" }), "audio.webm");
          formData.append("model", "whisper-1");
          formData.append("language", "pt");

          const whisperResp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
            body: formData,
          });

          if (whisperResp.ok) {
            const { text } = await whisperResp.json();
            await supabase
              .from("lead_anotacoes")
              .update({ conteudo: text })
              .eq("id", audio.id);
          }
        } catch (err) {
          console.error("Erro ao transcrever áudio:", err);
        }
      }

      // 2. Gerar resumo com GPT
      const { data: todasAnotacoes } = await supabase
        .from("lead_anotacoes")
        .select("*")
        .eq("lead_id", lead_id)
        .in("tipo", ["texto", "audio"])
        .order("created_at", { ascending: true });

      const contexto = (todasAnotacoes ?? [])
        .map((a: any) => a.conteudo || "")
        .filter(Boolean)
        .join("\n\n");

      if (!contexto.trim()) {
        throw new Error("Sem conteúdo para gerar resumo. Transcreva os áudios primeiro.");
      }

      const gptResp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `Você é um assistente de vendas de móveis planejados. Gere um resumo estruturado do briefing do cliente com:
- **Cliente**: nome e perfil
- **Ambientes**: quais ambientes o cliente quer mobiliar
- **Preferências**: cores, materiais, estilo (moderno, clássico, etc.)
- **Medidas**: se mencionadas
- **Orçamento**: se mencionado
- **Observações importantes**: prazos, restrições, detalhes especiais
- **Próximos passos sugeridos**: o que o vendedor deve fazer

Seja objetivo e organize em tópicos.`,
            },
            {
              role: "user",
              content: `Cliente: ${lead_nome}\n\nAnotações do briefing:\n${contexto}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 1000,
        }),
      });

      if (!gptResp.ok) {
        const err = await gptResp.text();
        throw new Error("Erro GPT: " + err);
      }

      const gptData = await gptResp.json();
      const resumo = gptData.choices[0]?.message?.content || "Não foi possível gerar resumo.";

      // Buscar loja_id do lead
      const { data: leadData } = await supabase
        .from("leads")
        .select("loja_id")
        .eq("id", lead_id)
        .single();

      // Salvar resumo
      await supabase.from("lead_anotacoes").insert({
        lead_id,
        loja_id: leadData?.loja_id,
        tipo: "resumo_ia",
        conteudo: resumo,
        resumo_ia: resumo,
        created_by: null,
      });

      return new Response(JSON.stringify({ success: true, resumo }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "imagem") {
      // Buscar resumo ou textos para gerar prompt
      const resumos = (anotacoes ?? []).filter(
        (a: any) => a.tipo === "resumo_ia" || a.tipo === "texto"
      );
      const contexto = resumos
        .map((a: any) => a.resumo_ia || a.conteudo || "")
        .filter(Boolean)
        .join("\n");

      if (!contexto.trim()) {
        throw new Error("Sem contexto para gerar imagem. Gere um resumo primeiro.");
      }

      // Gerar prompt para DALL-E
      const promptResp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `Você é um designer de interiores. Com base no briefing do cliente, crie um prompt em inglês para gerar uma imagem fotorrealista do ambiente com móveis planejados. O prompt deve descrever:
- O tipo de ambiente (cozinha, quarto, sala, etc.)
- O estilo dos móveis (moderno, clássico, minimalista)
- Cores e materiais mencionados
- Iluminação e atmosfera
Máximo 200 palavras. Responda APENAS com o prompt, sem explicações.`,
            },
            {
              role: "user",
              content: `Briefing do cliente ${lead_nome}:\n${contexto}`,
            },
          ],
          temperature: 0.7,
          max_tokens: 300,
        }),
      });

      const promptData = await promptResp.json();
      const imagePrompt = promptData.choices[0]?.message?.content || "";

      // Gerar imagem
      const dalleResp = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-image-1",
          prompt: `Professional interior design photo, photorealistic: ${imagePrompt}`,
          n: 1,
          size: "1024x1024",
        }),
      });

      if (!dalleResp.ok) {
        const err = await dalleResp.text();
        throw new Error("Erro DALL-E: " + err);
      }

      const dalleData = await dalleResp.json();
      const imageB64 = dalleData.data[0]?.b64_json;
      const tempImageUrl = dalleData.data[0]?.url;

      if (!imageB64 && !tempImageUrl) throw new Error("Imagem não gerada");

      // Upload para Storage
      let finalImageUrl = tempImageUrl || "";
      try {
        const imgFileName = `lead-images/${lead_id}/${Date.now()}.png`;
        let imgBuffer: ArrayBuffer;

        if (imageB64) {
          // Decode base64
          const binaryStr = atob(imageB64);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
          imgBuffer = bytes.buffer;
        } else {
          // Download from temp URL
          const imgResp = await fetch(tempImageUrl);
          imgBuffer = await imgResp.arrayBuffer();
        }

        const { error: storageErr } = await supabase.storage
          .from("lead-audios")
          .upload(imgFileName, imgBuffer, { contentType: "image/png" });

        if (!storageErr) {
          const { data: signedData } = await supabase.storage
            .from("lead-audios")
            .createSignedUrl(imgFileName, 60 * 60 * 24 * 365);
          if (signedData?.signedUrl) finalImageUrl = signedData.signedUrl;
        }
      } catch (e) {
        console.error("Erro ao salvar imagem no storage:", e);
      }

      if (!finalImageUrl) throw new Error("Não foi possível salvar a imagem");

      // Buscar loja_id
      const { data: leadData } = await supabase
        .from("leads")
        .select("loja_id")
        .eq("id", lead_id)
        .single();

      // Salvar referência da imagem
      await supabase.from("lead_anotacoes").insert({
        lead_id,
        loja_id: leadData?.loja_id,
        tipo: "imagem_ia",
        imagem_url: finalImageUrl,
        imagem_prompt: imagePrompt,
        created_by: null,
      });

      return new Response(JSON.stringify({ success: true, image_url: finalImageUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Ação inválida: " + action);
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
