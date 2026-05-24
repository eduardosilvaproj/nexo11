import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, sendWhatsApp } from "./providers.ts";

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

    // 1. Buscar mensagens pendentes
    const { data: messages, error: fetchError } = await supabase
      .from("communication_outbox")
      .select("*")
      .eq("status", "pendente")
      .lt("tentativas", 3)
      .order("created_at", { ascending: true })
      .limit(10);

    if (fetchError) throw fetchError;

    const results = [];

    for (const msg of messages) {
      // 2. Marcar como processando
      await supabase
        .from("communication_outbox")
        .update({ status: "processando" })
        .eq("id", msg.id);

      try {
        // 3. Validar Horário e Cota (RPC)
        const { data: canSend, error: quotaError } = await supabase.rpc("check_communication_quota", {
          p_loja_id: msg.loja_id,
          p_canal: msg.canal
        });

        if (quotaError) throw quotaError;

        if (!canSend) {
          // Se não pode enviar agora (fora do horário ou limite atingido), volta para pendente com delay
          const proxima = new Date();
          proxima.setMinutes(proxima.getMinutes() + 30); // Tentar em 30 min
          
          await supabase
            .from("communication_outbox")
            .update({ 
              status: "pendente",
              proxima_tentativa_em: proxima.toISOString(),
              erro: "Quota atingida ou fora do horário permitido."
            })
            .eq("id", msg.id);
          
          results.push({ id: msg.id, status: "adiado" });
          continue;
        }

        // 4. Validar Opt-in
        const { data: hasOptIn, error: optError } = await supabase.rpc("check_cliente_opt_in", {
          p_cliente_id: msg.cliente_id,
          p_loja_id: msg.loja_id,
          p_canal: msg.canal
        });

        if (optError) throw optError;

        if (!hasOptIn) {
          await supabase
            .from("communication_outbox")
            .update({ status: "ignorado", erro: "Opt-out detectado." })
            .eq("id", msg.id);
          results.push({ id: msg.id, status: "ignorado" });
          continue;
        }

        // 5. Buscar configurações da loja para o canal
        const { data: settings } = await supabase
          .from("communication_settings")
          .select("*")
          .eq("loja_id", msg.loja_id)
          .eq("canal", msg.canal)
          .single();

        if (!settings || !settings.ativo) {
          throw new Error(`Canal ${msg.canal} não está ativo para esta loja.`);
        }

        const isDryRun = settings.dry_run || false;
        let result;

        // 6. Chamar Provider correspondente
        if (msg.canal === 'email') {
          result = await sendEmail(settings, msg, isDryRun);
        } else if (msg.canal === 'whatsapp') {
          result = await sendWhatsApp(settings, msg, isDryRun);
        } else {
          throw new Error(`Canal ${msg.canal} não suportado para envio automático.`);
        }

        // 7. Processar Resultado
        const now = new Date().toISOString();
        if (result.success) {
          await supabase
            .from("communication_outbox")
            .update({ 
              status: "enviado",
              enviado_em: now,
              processado_em: now,
              tentativas: msg.tentativas + 1,
              provider_message_id: result.provider_message_id,
              dry_run: isDryRun,
              metadata: result.metadata,
              provider: settings.provider
            })
            .eq("id", msg.id);

          if (msg.comunicacao_id) {
            await supabase
              .from("cliente_comunicacoes")
              .update({ 
                status: "enviado",
                enviado_em: now,
                provider_message_id: result.provider_message_id
              })
              .eq("id", msg.comunicacao_id);
          }
          results.push({ id: msg.id, status: "enviado", dry_run: isDryRun });
        } else {
          throw new Error(result.error);
        }

      } catch (err: any) {
        console.error(`[Outbox] Erro ${msg.id}:`, err);
        const tentativas = msg.tentativas + 1;
        const status = tentativas >= msg.max_tentativas ? "falhou" : "pendente";
        
        await supabase
          .from("communication_outbox")
          .update({ 
            status,
            tentativas,
            erro: err.message,
            proxima_tentativa_em: new Date(Date.now() + 1000 * 60 * 15).toISOString()
          })
          .eq("id", msg.id);

        if (msg.comunicacao_id && status === "falhou") {
          await supabase
            .from("cliente_comunicacoes")
            .update({ status: "falhou" })
            .eq("id", msg.comunicacao_id);
          
          // Registrar Alerta de falha se for a última tentativa
          await supabase.from("communication_alerts").insert({
            loja_id: msg.loja_id,
            canal: msg.canal,
            tipo: 'sending_failed',
            severidade: 'warning',
            mensagem: `Falha definitiva ao enviar mensagem: ${err.message}`,
            metadata: { outbox_id: msg.id, error: err.message }
          });
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
