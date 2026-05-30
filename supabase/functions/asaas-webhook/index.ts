import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ASAAS_WEBHOOK_EVENTS = ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED", "PAYMENT_DELETED"];

serve(async (req: Request) => {
  // ── CORS ───────────────────────────────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Signature verification (Asaas HMAC-SHA256) ──────────────────────────
  const signature = req.headers.get("x-as2-signature") ?? "";
  const body = await req.text();
  const webhookSecret = Deno.env.get("ASAAS_WEBHOOK_SECRET") ?? "";

  if (webhookSecret) {
    const encoder = new TextEncoder();
    const key = encoder.encode(webhookSecret);
    const data = encoder.encode(body);
    const mac = await crypto.subtle.importKey(
      "raw", key,
      { name: "HMAC", hash: "SHA-256" },
      false, ["sign"]
    );
    const sigBuffer = await crypto.subtle.sign("HMAC", mac, data);
    const sigHex = Array.from(new Uint8Array(sigBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (sigHex !== signature) {
      console.error("[Asaas Webhook] Signature mismatch — rejecting");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // ── Parse payload ───────────────────────────────────────────────────────
  const payload = JSON.parse(body);
  const event = payload.event;

  if (!ASAAS_WEBHOOK_EVENTS.includes(event)) {
    // Not an event we care about — acknowledge and skip
    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const payment = payload.payment;
  if (!payment?.id) {
    return new Response(JSON.stringify({ error: "Missing payment data" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Supabase client ──────────────────────────────────────────────────────
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log(`[Asaas Webhook] Processing event: ${event} — payment: ${payment.id}`);

  // ── Find our local record via externalReference (= conta_receber id) ────
  const { data: conta, error: findError } = await supabase
    .from("financeiro_contas_receber")
    .select("id, contrato_id, descricao, valor, status")
    .eq("asaas_payment_id", payment.id)
    .maybeSingle();

  if (findError) {
    console.error("[Asaas Webhook] DB lookup error:", findError);
    return new Response(JSON.stringify({ error: "DB lookup failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!conta) {
    console.warn(`[Asaas Webhook] No local record found for Asaas payment ${payment.id}`);
    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Update Asaas payment status on local record ─────────────────────────
  const now = new Date().toISOString();
  const updatePayload: Record<string, unknown> = {
    asaas_payment_status: payment.status,
    asaas_invoice_url: payment.invoiceUrl ?? null,
    asaas_invoice_id: payment.invoiceId ?? null,
    asaas_billing_date: payment.paymentDate ?? null,
    asaas_mdc5: payment.md5 ?? null,
  };

  // Auto-confirm as paid when payment is received/confirmed
  if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
    updatePayload.status = "pago";
    updatePayload.data_pagamento = payment.paymentDate ?? now.slice(0, 10);
    updatePayload.forma_pagamento = payment.billingType ?? null;
  }

  const { error: updateError } = await supabase
    .from("financeiro_contas_receber")
    .update(updatePayload)
    .eq("asaas_payment_id", payment.id);

  if (updateError) {
    console.error("[Asaas Webhook] Failed to update local record:", updateError);
    return new Response(JSON.stringify({ error: "Update failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Register contract event ───────────────────────────────────────────────
  if ((event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") && conta.contrato_id) {
    await supabase.from("contrato_eventos").insert({
      contrato_id: conta.contrato_id,
      tipo: "pagamento_recebido",
      modulo: "financeiro",
      titulo: "Pagamento Confirmado (Asaas)",
      descricao: `Cobrança ${payment.id} confirmada. Valor: ${payment.value}`,
      entidade_tipo: "financeiro_contas_receber",
      entidade_id: conta.id,
    });
  }

  console.log(`[Asaas Webhook] Successfully processed ${event} for payment ${payment.id}`);
  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});