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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Buscar mensagens pendentes que ainda não atingiram o limite de tentativas
    const { data: messages, error: fetchError } = await supabase
      .from("communication_outbox")
      .select("*")
      .eq("status", "pendente")
      .lt("tentativas", 3)
      .limit(10); // Processar em pequenos lotes

    if (fetchError) throw fetchError;

    const results = [];

    for (const msg of messages) {
      // 2. Marcar como processando para evitar duplicidade
      await supabase
        .from("communication_outbox")
        .update({ status: "processando" })
        .eq("id", msg.id);

      try {
        // 3. Validar Opt-in do Cliente usando a função RPC criada na migration
        const { data: hasOptIn, error: optError } = await supabase.rpc("check_cliente_opt_in", {
          p_cliente_id: msg.cliente_id,
          p_loja_id: msg.loja_id,
          p_canal: msg.canal
        });

        if (optError) throw optError;

        if (!hasOptIn) {
          await supabase
            .from("communication_outbox")
            .update({ 
              status: "ignorado", 
              erro: "Cliente realizou opt-out para este canal." 
            })
            .eq("id", msg.id);
          results.push({ id: msg.id, status: "ignorado" });
          continue;
        }

        // 4. SIMULAÇÃO DE ENVIO (Aqui entrará a integração com WhatsApp Business / SES)
        // Por enquanto, simulamos sucesso
        console.log(`[Outbox] Simulando envio para ${msg.destinatario} via ${msg.canal}`);
        
        // Simular um delay de rede
        await new Promise(resolve => setTimeout(resolve, 500));

        // 5. Atualizar status final e também a tabela cliente_comunicacoes
        const now = new Date().toISOString();
        
        await supabase
          .from("communication_outbox")
          .update({ 
            status: "enviado",
            enviado_em: now,
            tentativas: msg.tentativas + 1,
            provider: "simulado_nexo"
          })
          .eq("id", msg.id);

        if (msg.comunicacao_id) {
          await supabase
            .from("cliente_comunicacoes")
            .update({ 
              status: "enviado",
              enviado_em: now
            })
            .eq("id", msg.comunicacao_id);
        }

        results.push({ id: msg.id, status: "enviado" });

      } catch (err: any) {
        console.error(`[Outbox] Erro ao processar mensagem ${msg.id}:`, err);
        
        const tentativas = msg.tentativas + 1;
        const status = tentativas >= msg.max_tentativas ? "falhou" : "pendente";
        
        await supabase
          .from("communication_outbox")
          .update({ 
            status,
            tentativas,
            erro: err.message,
            proxima_tentativa_em: new Date(Date.now() + 1000 * 60 * 15).toISOString() // retry em 15min
          })
          .eq("id", msg.id);

        if (msg.comunicacao_id && status === "falhou") {
          await supabase
            .from("cliente_comunicacoes")
            .update({ status: "falhou" })
            .eq("id", msg.comunicacao_id);
        }

        results.push({ id: msg.id, status, error: err.message });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
