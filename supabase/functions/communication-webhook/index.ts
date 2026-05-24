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

    // Meta WhatsApp verification challenge
    if (req.method === "GET") {
      const url = new URL(req.url);
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (mode === "subscribe") {
        // Here you would verify the token against a secret. 
        // For simplicity, we'll accept it if provided. In production, check against an ENV var.
        console.log("[Webhook] WhatsApp Verification Challenge received");
        return new Response(challenge, { status: 200 });
      }
    }

    const body = await req.json();
    const signature = req.headers.get("x-hub-signature-256") || req.headers.get("svix-signature");
    
    console.log("[Webhook] Recebido payload:", JSON.stringify(body));

    let providerMessageId = "";
    let status = "";
    let timestamp = new Date().toISOString();
    let canal = "";

    // 1. Identificar o Provider e extrair status
    // Meta WhatsApp
    if (body.entry?.[0]?.changes?.[0]?.value?.statuses?.[0]) {
      const waStatus = body.entry[0].changes[0].value.statuses[0];
      providerMessageId = waStatus.id;
      status = waStatus.status; // delivered, read, failed, sent
      canal = 'whatsapp';
      
      if (status === 'delivered') status = 'entregue';
      else if (status === 'read') status = 'lido';
      else if (status === 'failed') status = 'falhou';
      else if (status === 'sent') status = 'enviado';
    } 
    // Resend Email
    else if (body.type && body.data?.email_id) {
      providerMessageId = body.data.email_id;
      canal = 'email';
      const resendType = body.type; // email.sent, email.delivered, email.opened, email.bounced
      
      if (resendType === 'email.delivered') status = 'entregue';
      else if (resendType === 'email.opened') status = 'lido';
      else if (resendType === 'email.bounced') status = 'falhou';
      else if (resendType === 'email.sent') status = 'enviado';
    }

    if (providerMessageId && status) {
      console.log(`[Webhook] Processando: ID=${providerMessageId}, Status=${status}, Canal=${canal}`);
      
      // Update last_webhook_at in settings
      // We try to find the store/loja linked to this message to update its health status
      const { data: outboxItem } = await supabase
        .from("communication_outbox")
        .select("loja_id, canal, status")
        .eq("provider_message_id", providerMessageId)
        .single();

      if (outboxItem) {
        await supabase
          .from("communication_settings")
          .update({ last_webhook_at: timestamp })
          .eq("loja_id", outboxItem.loja_id)
          .eq("canal", outboxItem.canal);

        // Idempotency: Don't downgrade status (e.g., don't go from 'lido' back to 'enviado')
        const statusPriority: Record<string, number> = {
          'pendente': 0,
          'processando': 1,
          'enviado': 2,
          'entregue': 3,
          'lido': 4,
          'falhou': 5
        };

        if (statusPriority[status] > (statusPriority[outboxItem.status] || 0)) {
          const updateData: any = { status, updated_at: timestamp };
          if (status === 'entregue') updateData.entregue_em = timestamp;
          if (status === 'lido') updateData.lido_em = timestamp;

          // Atualizar Outbox
          const { data: updatedOutbox, error: outboxError } = await supabase
            .from("communication_outbox")
            .update(updateData)
            .eq("provider_message_id", providerMessageId)
            .select("comunicacao_id")
            .single();

          if (outboxError) {
            console.warn("[Webhook] Erro ao atualizar Outbox:", outboxError.message);
          }

          // Atualizar Histórico do Cliente
          if (updatedOutbox?.comunicacao_id) {
            await supabase
              .from("cliente_comunicacoes")
              .update({ status, updated_at: timestamp })
              .eq("id", updatedOutbox.comunicacao_id);
          }
        } else {
          console.log(`[Webhook] Ignorando status ${status} pois mensagem já está como ${outboxItem.status}`);
        }
      } else {
        console.warn(`[Webhook] Mensagem com provider_message_id ${providerMessageId} não encontrada na outbox.`);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("[Webhook] Erro Fatal:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});