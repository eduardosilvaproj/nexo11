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

    const body = await req.json();
    console.log("[Webhook] Recebido:", body);

    let providerMessageId = "";
    let status = "";
    let timestamp = new Date().toISOString();

    // 1. Identificar o Provider e extrair status
    // Exemplo Meta WhatsApp
    if (body.entry?.[0]?.changes?.[0]?.value?.statuses?.[0]) {
      const waStatus = body.entry[0].changes[0].value.statuses[0];
      providerMessageId = waStatus.id;
      status = waStatus.status; // delivered, read, failed, sent
      
      // Mapear status para o nosso padrão
      if (status === 'delivered') status = 'entregue';
      if (status === 'read') status = 'lido';
      if (status === 'failed') status = 'falhou';
      if (status === 'sent') status = 'enviado';
    } 
    // Exemplo Resend
    else if (body.type && body.data?.email_id) {
      providerMessageId = body.data.email_id;
      const resendType = body.type; // email.sent, email.delivered, email.opened, email.bounced
      
      if (resendType === 'email.delivered') status = 'entregue';
      else if (resendType === 'email.opened') status = 'lido';
      else if (resendType === 'email.bounced') status = 'falhou';
      else if (resendType === 'email.sent') status = 'enviado';
    }

    if (providerMessageId && status) {
      console.log(`[Webhook] Atualizando mensagem ${providerMessageId} para status ${status}`);
      
      const updateData: any = { status, updated_at: timestamp };
      if (status === 'entregue') updateData.entregue_em = timestamp;
      if (status === 'lido') updateData.lido_em = timestamp;

      // Atualizar Outbox
      const { data: outboxData, error: outboxError } = await supabase
        .from("communication_outbox")
        .update(updateData)
        .eq("provider_message_id", providerMessageId)
        .select("comunicacao_id")
        .single();

      if (outboxError) {
        console.warn("[Webhook] Outbox não encontrada ou erro:", outboxError.message);
      }

      // Atualizar Histórico do Cliente se existir vínculo
      if (outboxData?.comunicacao_id) {
        await supabase
          .from("cliente_comunicacoes")
          .update({ status, updated_at: timestamp })
          .eq("id", outboxData.comunicacao_id);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("[Webhook] Erro:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
