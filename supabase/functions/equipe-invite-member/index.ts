import { Hono } from "npm:hono@4";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "jsr:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const app = new Hono();

app.options("/*", () => new Response("ok", { headers: corsHeaders }));

const BodySchema = z.object({
  nome: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  role: z.enum(["vendedor", "tecnico", "montador", "gerente", "admin"]),
  equipe_id: z.string().uuid().optional().nullable(),
});

app.post("/equipe-invite-member", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const callerId = claimsData.claims.sub as string;

  // Validate input
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
  const { nome, email, role, equipe_id } = parsed.data;

  // Authorization: caller must be admin or gerente
  const [{ data: isAdmin }, { data: isGerente }] = await Promise.all([
    callerClient.rpc("has_role", {
      _user_id: callerId,
      _role: "admin",
    }),
    callerClient.rpc("has_role", {
      _user_id: callerId,
      _role: "gerente",
    }),
  ]);
  if (!isAdmin && !isGerente) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Caller's loja
  const { data: callerRow, error: callerRowErr } = await callerClient
    .from("usuarios")
    .select("loja_id")
    .eq("id", callerId)
    .maybeSingle();
  if (callerRowErr || !callerRow?.loja_id) {
    return new Response(
      JSON.stringify({ error: "Loja não encontrada para o usuário atual" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
  const lojaId = callerRow.loja_id as string;

  // Service role client for invite + writes
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  // Invite by email
  const redirectTo = `${
    c.req.header("origin") ?? new URL(c.req.url).origin
  }/auth`;
  const { data: invited, error: inviteErr } = await admin.auth.admin
    .inviteUserByEmail(email, {
      data: { nome },
      redirectTo,
    });

  let userId: string | null = invited?.user?.id ?? null;

  // If user already exists, look them up
  if (inviteErr) {
    const msg = inviteErr.message?.toLowerCase() ?? "";
    if (msg.includes("already") || msg.includes("registered")) {
      const { data: list } = await admin.auth.admin.listUsers();
      const existing = list?.users?.find((u) =>
        u.email?.toLowerCase() === email.toLowerCase()
      );
      if (existing) userId = existing.id;
    }
    if (!userId) {
      return new Response(
        JSON.stringify({ error: inviteErr.message }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  }

  if (!userId) {
    return new Response(
      JSON.stringify({ error: "Falha ao obter o usuário criado" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Upsert usuarios row scoped to caller's loja
  const { error: upsertErr } = await admin.from("usuarios").upsert({
    id: userId,
    nome,
    email,
    loja_id: lojaId,
  }, { onConflict: "id" });
  if (upsertErr) {
    return new Response(JSON.stringify({ error: upsertErr.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Insert role (avoid duplicate)
  const { data: existingRole } = await admin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", role)
    .eq("loja_id", lojaId)
    .maybeSingle();
  if (!existingRole) {
    const { error: roleErr } = await admin.from("user_roles").insert({
      user_id: userId,
      role,
      loja_id: lojaId,
    });
    if (roleErr) {
      return new Response(JSON.stringify({ error: roleErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Optional team membership (montadores)
  if (equipe_id) {
    const { data: equipe } = await admin
      .from("equipes")
      .select("id, loja_id")
      .eq("id", equipe_id)
      .maybeSingle();
    if (equipe && equipe.loja_id === lojaId) {
      await admin
        .from("equipe_membros")
        .upsert(
          { equipe_id, user_id: userId },
          { onConflict: "equipe_id,user_id" },
        );
    }
  }

  return new Response(
    JSON.stringify({ ok: true, user_id: userId, email }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});

Deno.serve(app.fetch);
