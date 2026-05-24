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

    const payload = await req.json();
    console.log("[Webhook] Payload recebido:", payload);

    // Lógica para normalizar diferentes providers
    // Este é um exemplo genérico que deve ser adaptado para cada provider (Meta, SendGrid, etc.)
    let provider_message_id = payload.id || payload.message_id || payload.provider_id;
    let status = payload.status; // 'delivered', 'read', 'failed', 'bounced'
    let error = payload.error || payload.reason;

    if (!provider_message_id) {
      return new Response(JSON.stringify({ error: "Provider ID não encontrado no payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mapear status do provider para o nosso sistema
    let nexoStatus: string | null = null;
    let timestampField: string | null = null;

    switch (status) {
      case 'delivered':
      case 'sent':
        nexoStatus = 'entregue';
        timestampField = 'entregue_em';
        break;
      case 'read':
      case 'seen':
        nexoStatus = 'lido';
        timestampField = 'lido_em';
        break;
      case 'failed':
      case 'bounced':
      case 'undelivered':
        nexoStatus = 'falhou';
        break;
    }

    if (nexoStatus) {
      const updateData: any = { status: nexoStatus };
      if (timestampField) updateData[timestampField] = new Date().toISOString();
      if (error) updateData.erro = error;

      // 1. Atualizar Outbox
      const { data: outboxItem, error: outboxError } = await supabase
        .from("communication_outbox")
        .update(updateData)
        .eq("provider_message_id", provider_message_id)
        .select()
        .single();

      if (outboxError) {
        console.warn("[Webhook] Outbox não encontrado para ID:", provider_message_id);
      } else if (outboxItem && outboxItem.comunicacao_id) {
        // 2. Atualizar Histórico de Comunicações
        await supabase
          .from("cliente_comunicacoes")
          .update({ 
            status: nexoStatus,
            entregue_em: updateData.entregue_em,
            lido_em: updateData.lido_em
          })
          .eq("id", outboxItem.comunicacao_id);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
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
