import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return json({ ok: false, erro: "Configuração do servidor incompleta." }, 500);
  }

  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ ok: false, erro: "Não autorizado." }, 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, erro: "Payload inválido." }, 400);
  }

  const loja_id =
    typeof body === "object" && body !== null && "loja_id" in body && typeof body.loja_id === "string"
      ? body.loja_id.trim()
      : "";

  if (!loja_id) {
    return json({ ok: false, erro: "loja_id é obrigatório." }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  try {
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();
    if (authError || !user) {
      return json({ ok: false, erro: "Não autorizado." }, 401);
    }

    const [{ data: perfil }, { data: roles }] = await Promise.all([
      supabase.from("usuarios").select("loja_id").eq("id", user.id).maybeSingle(),
      supabase.from("user_roles").select("role, loja_id").eq("user_id", user.id),
    ]);

    const isFranqueador = (roles ?? []).some((r) => r.role === "franqueador");
    const isStoreManager = (roles ?? []).some(
      (r) =>
        (r.role === "admin" || r.role === "gerente") &&
        ((r.loja_id && r.loja_id === loja_id) || (!r.loja_id && perfil?.loja_id === loja_id)),
    );

    if (!isFranqueador && !isStoreManager) {
      return json({ ok: false, erro: "Sem permissão para sincronizar esta loja." }, 403);
    }

    // Buscar credenciais
    const { data: integracao, error: integErr } = await supabase
      .from("integracoes")
      .select("config, ativo, ultima_sincronizacao")
      .eq("loja_id", loja_id)
      .eq("tipo", "promob")
      .single();

    if (integErr || !integracao) {
      return json({ ok: false, erro: "Integração Promob não encontrada para esta loja." }, 400);
    }

    const empresa = integracao.config?.empresa;
    const usuario = integracao.config?.usuario;
    const senha = integracao.config?.senha;

    console.log(
      "sync-promob credenciais",
      JSON.stringify({
        loja_id,
        hasEmpresa: !!empresa,
        hasUsuario: !!usuario,
        hasSenha: !!senha,
      }),
    );

    if (!empresa || !usuario || !senha) {
      return json(
        {
          ok: false,
          erro: "Credenciais incompletas. Preencha Empresa, Usuário e Senha em Integrações.",
        },
        400,
      );
    }

    // ----------------------------------------------------------------
    // PASSO 1 — GET na página de login para obter CSRF token e cookies
    // ----------------------------------------------------------------
    const UA =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

    const getResp = await fetch("https://consultasweb.promob.com/Authentication/Index", {
      method: "GET",
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });

    const loginPageHtml = await getResp.text();
    const getSetCookie = getResp.headers.get("set-cookie") || "";

    // Extrair cookies iniciais (anti-CSRF / sessão)
    const initialCookieParts = getSetCookie
      .split(/,(?=\s*[A-Za-z0-9_.-]+=)/)
      .map((c: string) => c.split(";")[0].trim())
      .filter(Boolean);

    // Extrair token CSRF do HTML (campo oculto __RequestVerificationToken)
    const csrfMatch =
      loginPageHtml.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/) ||
      loginPageHtml.match(/__RequestVerificationToken[^\n]*value="([^"]+)"/);
    const csrfToken = csrfMatch ? csrfMatch[1] : "";

    console.log(
      "sync-promob csrf",
      JSON.stringify({
        csrfFound: !!csrfToken,
        csrfPreview: csrfToken.substring(0, 20),
        initialCookies: initialCookieParts.length,
      }),
    );

    // ----------------------------------------------------------------
    // PASSO 2 — POST com CSRF token e cookies iniciais
    // ----------------------------------------------------------------
    const postBody: Record<string, string> = {
      Empresa: empresa,
      UserName: usuario,
      Password: senha,
      RememberMe: "false",
    };
    if (csrfToken) {
      postBody["__RequestVerificationToken"] = csrfToken;
    }

    const loginResp = await fetch("https://consultasweb.promob.com/Authentication/Index", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9",
        Referer: "https://consultasweb.promob.com/Authentication/Index",
        Cookie: initialCookieParts.join("; "),
      },
      body: new URLSearchParams(postBody),
      redirect: "manual",
    });

    const setCookieHeader = loginResp.headers.get("set-cookie") || "";
    const locationHeader = loginResp.headers.get("location") || "";

    const allCookieParts = [
      ...initialCookieParts,
      ...setCookieHeader
        .split(/,(?=\s*[A-Za-z0-9_.-]+=)/)
        .map((c: string) => c.split(";")[0].trim())
        .filter(Boolean),
    ];

    // Deduplicar cookies (manter o mais recente de cada nome)
    const cookieMap = new Map<string, string>();
    for (const part of allCookieParts) {
      const [name] = part.split("=");
      if (name) cookieMap.set(name.trim(), part);
    }
    const cookies = [...cookieMap.values()].join("; ");

    const hasSessionCookie = allCookieParts.some((c) => /^(?:\.ASPXAUTH|ASP\.NET_SessionId|AUTH|\.AspNet)/i.test(c));

    console.log(
      "sync-promob login",
      JSON.stringify({
        status: loginResp.status,
        location: locationHeader,
        hasSessionCookie,
        totalCookies: cookieMap.size,
      }),
    );

    // Login bem sucedido = redirecionou para fora de /Authentication
    const loginFalhou =
      !hasSessionCookie ||
      locationHeader.toLowerCase().includes("authentication") ||
      (loginResp.status !== 302 && loginResp.status !== 301);

    if (loginFalhou) {
      await supabase
        .from("integracoes")
        .update({ ativo: false, updated_at: new Date().toISOString() })
        .eq("loja_id", loja_id)
        .eq("tipo", "promob");

      return json(
        {
          ok: false,
          erro: "Login no Promob falhou. Verifique Empresa, Usuário e Senha.",
          detalhe: { status: loginResp.status, location: locationHeader, hasSessionCookie },
        },
        401,
      );
    }

    // ----------------------------------------------------------------
    // PASSO 3 — Buscar pedidos
    // ----------------------------------------------------------------
    const hoje = new Date();
    const inicio = new Date(hoje.getTime() - 60 * 24 * 60 * 60 * 1000);
    const fmtBR = (d: Date) =>
      `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

    const pedidosUrl = new URL("https://consultasweb.promob.com/Order/Index");
    pedidosUrl.searchParams.set("DataEmissaoInicial", fmtBR(inicio));
    pedidosUrl.searchParams.set("DataEmissaoFinal", fmtBR(hoje));
    pedidosUrl.searchParams.set("StatusPedido", "Todos");

    const pedidosResp = await fetch(pedidosUrl.toString(), {
      headers: {
        Cookie: cookies,
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: "https://consultasweb.promob.com/",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
    });

    if (!pedidosResp.ok) {
      return json({ ok: false, erro: "Não foi possível ler o portal do Promob." }, 502);
    }

    const html = await pedidosResp.text();
    console.log("sync-promob html", JSON.stringify({ length: html.length, preview: html.substring(0, 300) }));

    // ----------------------------------------------------------------
    // PASSO 4 — Parsear tabela de pedidos
    // Colunas: Pedido | DtEmis | T | St | Situa | OC | L | DataP | Cliente... | Transp
    // ----------------------------------------------------------------
    const pedidos: Array<{
      numeroPedido: string;
      oc: string;
      dataPrevista: string;
      transportadora: string;
    }> = [];

    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let trMatch: RegExpExecArray | null;

    while ((trMatch = trRegex.exec(html)) !== null) {
      const cells: string[] = [];
      const tdLocal = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let tdMatch: RegExpExecArray | null;

      while ((tdMatch = tdLocal.exec(trMatch[1])) !== null) {
        cells.push(
          tdMatch[1]
            .replace(/<a[^>]*>([^<]*)<\/a>/gi, "$1")
            .replace(/<[^>]+>/g, "")
            .replace(/&nbsp;/g, " ")
            .replace(/\s+/g, " ")
            .trim(),
        );
      }

      if (cells.length >= 8 && /^\d{5,}$/.test(cells[0])) {
        pedidos.push({
          numeroPedido: cells[0],
          oc: cells[5] || "",
          dataPrevista: cells[7] || "",
          transportadora: cells[14] || cells[13] || "",
        });
      }
    }

    console.log(
      "sync-promob pedidos",
      JSON.stringify({
        total: pedidos.length,
        primeiro: pedidos[0] ?? null,
      }),
    );

    // ----------------------------------------------------------------
    // PASSO 5 — Cruzar com contratos ativos
    // ----------------------------------------------------------------
    const { data: contratos, error: contratosError } = await supabase
      .from("contratos")
      .select("id, cliente_nome")
      .eq("loja_id", loja_id)
      .neq("status", "finalizado");

    if (contratosError) {
      return json({ ok: false, erro: "Não foi possível carregar os contratos da loja." }, 500);
    }

    const normalize = (s: string) =>
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");

    let atualizados = 0;

    for (const pedido of pedidos) {
      const ocNorm = normalize(pedido.oc);
      if (!ocNorm || !pedido.dataPrevista) continue;

      const contrato = contratos?.find((c) => {
        const n = normalize(c.cliente_nome);
        return n === ocNorm || (ocNorm.length >= 4 && n.includes(ocNorm)) || (n.length >= 4 && ocNorm.includes(n));
      });
      if (!contrato) continue;

      const [d, m, a] = pedido.dataPrevista.split("/");
      if (!d || !m || !a) continue;
      const dataISO = `${a}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      if (Number.isNaN(Date.parse(dataISO))) continue;

      const { data: ex } = await supabase.from("entregas").select("id").eq("contrato_id", contrato.id).maybeSingle();

      if (ex) {
        await supabase
          .from("entregas")
          .update({
            data_prevista: dataISO,
            transportadora: pedido.transportadora || "Não informada",
            updated_at: new Date().toISOString(),
          })
          .eq("contrato_id", contrato.id);
      } else {
        await supabase.from("entregas").insert({
          contrato_id: contrato.id,
          data_prevista: dataISO,
          transportadora: pedido.transportadora || "Não informada",
          confirmado: false,
        });
      }

      await supabase.from("contrato_logs").insert({
        contrato_id: contrato.id,
        acao: "promob_sincronizado",
        descricao: `Pedido #${pedido.numeroPedido} · Previsão: ${pedido.dataPrevista} · ${pedido.transportadora || "não informada"}`,
      });

      atualizados++;
    }

    // ----------------------------------------------------------------
    // PASSO 6 — Atualizar timestamp
    // ----------------------------------------------------------------
    await supabase
      .from("integracoes")
      .update({ ativo: true, ultima_sincronizacao: new Date().toISOString() })
      .eq("loja_id", loja_id)
      .eq("tipo", "promob");

    return json({
      ok: true,
      total_pedidos: pedidos.length,
      atualizados,
      mensagem:
        atualizados > 0
          ? `${atualizados} contrato(s) atualizado(s) com previsão do Promob`
          : `${pedidos.length} pedidos encontrados mas nenhum cruzou com contratos ativos`,
    });
  } catch (error) {
    console.error("Erro sync-promob:", error);
    return json(
      {
        ok: false,
        erro: "Erro interno na sincronização.",
        detalhe: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});
