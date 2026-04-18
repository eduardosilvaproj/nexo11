import { Hono } from "npm:hono@4";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "jsr:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const app = new Hono();

app.options("/*", () => new Response("ok", { headers: corsHeaders }));

const ItemSchema = z.object({
  codigo: z.string().trim().min(1).max(120),
  descricao: z.string().trim().min(1).max(500),
  quantidade: z.number().int().positive().max(100000),
  largura_mm: z.number().nonnegative().max(100000).optional(),
  altura_mm: z.number().nonnegative().max(100000).optional(),
  profundidade_mm: z.number().nonnegative().max(100000).optional(),
  material: z.string().trim().max(120).optional(),
  observacoes: z.string().trim().max(1000).optional(),
});

const BodySchema = z.object({
  contrato_id: z.string().uuid(),
  itens: z.array(ItemSchema).min(1).max(2000),
  observacoes: z.string().trim().max(2000).optional(),
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

app.post("/sync-promob", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
    Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Caller client (RLS-bound)
  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsErr } = await callerClient.auth
    .getClaims(token);
  if (claimsErr || !claimsData?.claims) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  const callerId = claimsData.claims.sub as string;

  // Validate input
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(
      { error: parsed.error.flatten().fieldErrors },
      400,
    );
  }
  const { contrato_id, itens, observacoes } = parsed.data;

  // Authorization: caller must have access to this contract (admin/gerente/tecnico)
  const [
    { data: isAdmin },
    { data: isGerente },
    { data: isTecnico },
  ] = await Promise.all([
    callerClient.rpc("has_role", { _user_id: callerId, _role: "admin" }),
    callerClient.rpc("has_role", { _user_id: callerId, _role: "gerente" }),
    callerClient.rpc("has_role", { _user_id: callerId, _role: "tecnico" }),
  ]);
  if (!isAdmin && !isGerente && !isTecnico) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  // Verify contract belongs to caller's loja (RLS-enforced read)
  const { data: contrato, error: contratoErr } = await callerClient
    .from("contratos")
    .select("id, loja_id, status")
    .eq("id", contrato_id)
    .maybeSingle();
  if (contratoErr || !contrato) {
    return jsonResponse({ error: "Contrato não encontrado" }, 404);
  }

  // Service-role client for writes (after authorization)
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  // Upsert ordem de produção for the contract with the synced items
  const { data: existingOp } = await admin
    .from("ordens_producao")
    .select("id")
    .eq("contrato_id", contrato_id)
    .maybeSingle();

  const payload = {
    contrato_id,
    itens_json: itens,
    observacoes: observacoes ?? null,
  };

  let opId: string | null = existingOp?.id ?? null;
  if (opId) {
    const { error: updErr } = await admin
      .from("ordens_producao")
      .update(payload)
      .eq("id", opId);
    if (updErr) return jsonResponse({ error: updErr.message }, 400);
  } else {
    const { data: inserted, error: insErr } = await admin
      .from("ordens_producao")
      .insert({ ...payload, status: "aguardando" })
      .select("id")
      .single();
    if (insErr) return jsonResponse({ error: insErr.message }, 400);
    opId = inserted!.id;
  }

  return jsonResponse({
    ok: true,
    ordem_producao_id: opId,
    total_itens: itens.length,
  });
});

Deno.serve(app.fetch);
