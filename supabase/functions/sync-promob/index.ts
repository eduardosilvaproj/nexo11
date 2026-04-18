import { Hono } from "npm:hono@4";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "jsr:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const app = new Hono();

app.options("/*", () => new Response("ok", { headers: corsHeaders }));

const BodySchema = z.object({
  loja_id: z.string().uuid(),
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const normalize = (s: string) =>
  s.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

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
    return jsonResponse({ error: parsed.error.flatten().fieldErrors }, 400);
  }
  const { loja_id } = parsed.data;

  // Authorization: admin or gerente of this loja
  const [{ data: isAdmin }, { data: isGerente }] = await Promise.all([
    callerClient.rpc("has_role", { _user_id: callerId, _role: "admin" }),
    callerClient.rpc("has_role", {
      _user_id: callerId,
      _role: "gerente",
      _loja_id: loja_id,
    }),
  ]);
  if (!isAdmin && !isGerente) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  // Service role for cross-table writes after authorization
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  // 1. Buscar credenciais da loja
  const { data: integracao } = await admin
    .from("integracoes")
    .select("config")
    .eq("loja_id", loja_id)
    .eq("tipo", "promob")
    .eq("ativo", true)
    .maybeSingle();

  const cfg = integracao?.config as
    | { usuario?: string; senha?: string }
    | undefined;
  if (!cfg?.usuario || !cfg?.senha) {
    return jsonResponse(
      { ok: false, erro: "Credenciais Promob não configuradas" },
      400,
    );
  }

  // 2. Login no portal Promob
  const loginResp = await fetch(
    "https://consultasweb.promob.com/Authentication/Index",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        UserName: cfg.usuario,
        Password: cfg.senha,
      }),
      redirect: "manual",
    },
  );
  await loginResp.body?.cancel();

  const cookies = loginResp.headers.get("set-cookie") || "";
  if (!cookies) {
    return jsonResponse(
      { ok: false, erro: "Login falhou — verifique as credenciais" },
      401,
    );
  }

  // 3. Buscar pedidos (últimos 60 dias)
  const hoje = new Date();
  const inicio = new Date(hoje.getTime() - 60 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${
      String(d.getMonth() + 1).padStart(2, "0")
    }/${d.getFullYear()}`;

  const pedidosResp = await fetch(
    `https://consultasweb.promob.com/order?dataInicio=${fmt(inicio)}&dataFim=${
      fmt(hoje)
    }`,
    { headers: { Cookie: cookies } },
  );
  const html = await pedidosResp.text();

  // 4. Parsear tabela HTML — extrair linhas
  const linhas: Array<
    {
      oc: string;
      dataPrevista: string;
      numeroPedido: string;
      transportadora: string;
    }
  > = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const cells: string[] = [];
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
      cells.push(cellMatch[1].replace(/<[^>]+>/g, "").trim());
    }
    if (cells.length >= 8 && cells[0].match(/^\d+$/)) {
      linhas.push({
        numeroPedido: cells[0],
        oc: cells[5] || "",
        dataPrevista: cells[7] || "",
        transportadora: cells[14] || "",
      });
    }
  }

  // 5. Buscar contratos ativos da loja
  const { data: contratos } = await admin
    .from("contratos")
    .select("id, cliente_nome")
    .eq("loja_id", loja_id)
    .not("status", "in", '("finalizado")');

  // 6. Cruzar OC com nome do cliente
  let atualizados = 0;
  for (const pedido of linhas) {
    const ocNorm = normalize(pedido.oc);
    if (!ocNorm) continue;

    const contrato = contratos?.find((c) => {
      const nomeNorm = normalize(c.cliente_nome);
      return nomeNorm.includes(ocNorm) || ocNorm.includes(nomeNorm);
    });
    if (!contrato) continue;

    const parts = pedido.dataPrevista.split("/");
    if (parts.length !== 3) continue;
    const [d, m, a] = parts;
    const dataISO = `${a}-${m}-${d}`;

    const { data: entregaExist } = await admin
      .from("entregas")
      .select("id")
      .eq("contrato_id", contrato.id)
      .maybeSingle();

    if (entregaExist) {
      await admin.from("entregas").update({
        data_prevista: dataISO,
        transportadora: pedido.transportadora,
      }).eq("id", entregaExist.id);
    } else {
      await admin.from("entregas").insert({
        contrato_id: contrato.id,
        data_prevista: dataISO,
        transportadora: pedido.transportadora,
        status: "pendente",
      });
    }

    await admin.rpc("contrato_log_inserir", {
      _contrato_id: contrato.id,
      _acao: "promob_sincronizado",
      _titulo: "Sincronização Promob",
      _descricao:
        `Pedido #${pedido.numeroPedido} — Previsão: ${pedido.dataPrevista} — ${pedido.transportadora}`,
    });

    atualizados++;
  }

  await admin
    .from("integracoes")
    .update({ ultima_sincronizacao: new Date().toISOString() })
    .eq("loja_id", loja_id)
    .eq("tipo", "promob");

  return jsonResponse({
    ok: true,
    total_pedidos: linhas.length,
    atualizados,
    mensagem: `${atualizados} contratos atualizados`,
  });
});

Deno.serve(app.fetch);
