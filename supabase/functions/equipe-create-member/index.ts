import { Hono } from "npm:hono@4";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "jsr:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const app = new Hono();

app.options("/*", () => new Response("ok", { headers: corsHeaders }));

// All roles allowed by the system
const TODAS_ROLES = [
  "vendedor", "projetista", "tecnico", "conferente",
  "montador", "motorista", "gerente", "financeiro", "admin", "conferente",
] as const;

const BodySchema = z.object({
  nome: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  // Modo: "senha" = cria com senha direta; "convite" = envia link por e-mail
  modo: z.enum(["senha", "convite"]).default("convite"),
  senha: z.string().min(6).max(72).optional(), // só obrigatório se modo=senha
  role: z.enum(TODAS_ROLES),
  funcoes: z.array(z.enum(TODAS_ROLES)).default([]), // todas as funções extras
  funcoes_app_habilitadas: z.array(z.string()).default([]),
  equipe_id: z.string().uuid().optional().nullable(),
  papel_comissao_id: z.string().uuid().optional().nullable(),
  comissao_percentual: z.number().min(0).max(100).optional().nullable(),
}).refine(d => d.modo !== "senha" || (d.senha && d.senha.length >= 6), {
  message: "Senha obrigatória com mínimo 6 caracteres",
  path: ["senha"],
});

app.post("/equipe-create-member", async (c) => {
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
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const {
    nome, email, modo, senha, role,
    funcoes, funcoes_app_habilitadas,
    equipe_id, papel_comissao_id, comissao_percentual,
  } = parsed.data;

  // Authorization: caller must be admin or gerente
  const [{ data: isAdmin }, { data: isGerente }] = await Promise.all([
    callerClient.rpc("has_role", { _user_id: callerId, _role: "admin" }),
    callerClient.rpc("has_role", { _user_id: callerId, _role: "gerente" }),
  ]);
  if (!isAdmin && !isGerente) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: callerRow, error: callerRowErr } = await callerClient
    .from("pessoas")
    .select("loja_id")
    .eq("auth_user_id", callerId)
    .maybeSingle();
  if (callerRowErr || !callerRow?.loja_id) {
    return new Response(
      JSON.stringify({ error: "Loja não encontrada para o usuário atual" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const lojaId = callerRow.loja_id as string;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  // Check if user already exists
  const { data: existingUser } = await admin.auth.admin.listUsers();
  const exists = existingUser?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  let userId: string;
  let inviteSent = false;

  if (exists) {
    userId = exists.id;
  } else {
    if (modo === "senha" && senha) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { nome },
      });
      if (createErr) {
        return new Response(
          JSON.stringify({ error: createErr.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      userId = created.user!.id;
    } else {
      const redirectTo = `${c.req.header("origin") ?? new URL(c.req.url).origin}/auth`;
      const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
        email,
        { data: { nome }, redirectTo }
      );
      if (inviteErr) {
        return new Response(
          JSON.stringify({ error: inviteErr.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      userId = invited!.user!.id;
      inviteSent = true;
    }
  }

  // All roles to store
  const todasFuncoes = [role, ...funcoes.filter(f => f !== role)];

  // Default app funcoes based on role
  const roleToAppDefault: Record<string, string[]> = {
    vendedor: ["vendedor"],
    projetista: ["projetista"],
    tecnico: ["tecnico"],
    conferente: ["conferente"],
    montador: ["montador"],
    motorista: ["motorista"],
    gerente: ["gerente", "vendedor", "tecnico"],
    financeiro: ["financeiro"],
    admin: ["admin", "gerente", "vendedor", "tecnico"],
  };
  const appDefaults = roleToAppDefault[role] ?? [role];

  // Validate papel belongs to this loja
  let safePapelId: string | null = null;
  if (papel_comissao_id) {
    const { data: papel } = await admin
      .from("papeis_comissao")
      .select("id, loja_id")
      .eq("id", papel_comissao_id)
      .maybeSingle();
    if (papel && papel.loja_id === lojaId) safePapelId = papel.id;
  }

  // Upsert pessoas
  const { error: upsertErr } = await admin.from("pessoas").upsert({
    id: userId,
    auth_user_id: userId,
    nome,
    email,
    telefone: null,
    loja_id: lojaId,
    tipo: "colaborador",
    funcoes: todasFuncoes,
    funcoes_app_habilitadas:
      funcoes_app_habilitadas.length > 0 ? funcoes_app_habilitadas : appDefaults,
    papel_comissao_id: safePapelId,
    comissao_percentual: comissao_percentual ?? null,
    ativo: true,
  }, { onConflict: "id" });
  if (upsertErr) {
    return new Response(JSON.stringify({ error: upsertErr.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Insert roles (principal + extras), avoid duplicates
  for (const r of todasFuncoes) {
    const { data: existingRole } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", r)
      .eq("loja_id", lojaId)
      .maybeSingle();
    if (!existingRole) {
      await admin.from("user_roles").insert({ user_id: userId, role: r, loja_id: lojaId });
    }
  }

  // Optional team membership
  if (equipe_id) {
    const { data: equipe } = await admin
      .from("equipes")
      .select("id, loja_id")
      .eq("id", equipe_id)
      .maybeSingle();
    if (equipe && equipe.loja_id === lojaId) {
      await admin
        .from("equipe_membros")
        .upsert({ equipe_id, user_id: userId }, { onConflict: "equipe_id,user_id" });
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      user_id: userId,
      email,
      convite_enviado: inviteSent,
      mensagem: inviteSent
        ? `Convite enviado para ${email}. O membro deverá criar sua senha pelo link recebido.`
        : `Usuário criado com senha direta.`,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

Deno.serve(app.fetch);