// ============================================================
// NEXO ERP — Edge Function: sync-promob
// Sincronização automática com consultasweb.promob.com
// ============================================================
// Como usar no Supabase:
//   1. Supabase Dashboard → Edge Functions → New Function
//   2. Nome: sync-promob
//   3. Colar este código
//   4. Deploy
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { loja_id } = await req.json();

    if (!loja_id) {
      return new Response(
        JSON.stringify({
          ok: false,
          erro: "loja_id é obrigatório",
        }),
        { status: 400, headers: corsHeaders },
      );
    }

    // --------------------------------------------------------
    // 1. Conectar ao Supabase com service role
    // --------------------------------------------------------
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // --------------------------------------------------------
    // 2. Buscar credenciais da loja
    // --------------------------------------------------------
    const { data: integracao, error: integErr } = await supabase
      .from("integracoes")
      .select("config, ativo, ultima_sincronizacao")
      .eq("loja_id", loja_id)
      .eq("tipo", "promob")
      .single();

    if (integErr || !integracao?.config?.empresa || !integracao?.config?.usuario || !integracao?.config?.senha) {
      return new Response(
        JSON.stringify({
          ok: false,
          erro: "Credenciais Promob não configuradas. Configure em Integrações.",
        }),
        { status: 400, headers: corsHeaders },
      );
    }

    const { empresa, usuario, senha } = integracao.config;

    // --------------------------------------------------------
    // 3. Login no portal Promob
    // --------------------------------------------------------
    const loginResp = await fetch("https://consultasweb.promob.com/Authentication/Index", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
      body: new URLSearchParams({
        Empresa: empresa,
        UserName: usuario,
        Password: senha,
        RememberMe: "false",
      }),
      redirect: "manual",
    });

    // Extrair cookies de sessão
    const setCookieHeader = loginResp.headers.get("set-cookie") || "";
    const locationHeader = loginResp.headers.get("location") || "";

    // Login bem sucedido redireciona para home (não para Authentication)
    const loginFalhou = !setCookieHeader || locationHeader.includes("Authentication") || loginResp.status === 200; // 200 na tela de login = credenciais erradas

    if (loginFalhou) {
      // Atualizar status da integração para erro
      await supabase
        .from("integracoes")
        .update({ ativo: false, updated_at: new Date().toISOString() })
        .eq("loja_id", loja_id)
        .eq("tipo", "promob");

      return new Response(
        JSON.stringify({
          ok: false,
          erro: "Login no Promob falhou. Verifique usuário e senha em Integrações.",
        }),
        { status: 401, headers: corsHeaders },
      );
    }

    // Extrair apenas os cookies necessários (sem as diretivas de segurança)
    const cookies = setCookieHeader
      .split(",")
      .map((c) => c.split(";")[0].trim())
      .join("; ");

    // --------------------------------------------------------
    // 4. Buscar pedidos — últimos 60 dias
    // --------------------------------------------------------
    const hoje = new Date();
    const inicio = new Date(hoje.getTime() - 60 * 24 * 60 * 60 * 1000);

    const fmtBR = (d: Date) => {
      const dia = String(d.getDate()).padStart(2, "0");
      const mes = String(d.getMonth() + 1).padStart(2, "0");
      const ano = d.getFullYear();
      return `${dia}/${mes}/${ano}`;
    };

    const pedidosUrl = new URL("https://consultasweb.promob.com/Order/Index");
    pedidosUrl.searchParams.set("DataEmissaoInicial", fmtBR(inicio));
    pedidosUrl.searchParams.set("DataEmissaoFinal", fmtBR(hoje));
    pedidosUrl.searchParams.set("StatusPedido", "Todos");

    const pedidosResp = await fetch(pedidosUrl.toString(), {
      headers: {
        Cookie: cookies,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: "https://consultasweb.promob.com/",
      },
    });

    if (!pedidosResp.ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          erro: "Não foi possível acessar a lista de pedidos. Tente novamente.",
        }),
        { status: 502, headers: corsHeaders },
      );
    }

    const html = await pedidosResp.text();

    // --------------------------------------------------------
    // 5. Parsear tabela HTML
    // Colunas visíveis na tela:
    // Pedido | DtEmis | T | St | Situa | OC | L | DataP | Cliente... | Transp
    // --------------------------------------------------------
    interface PedidoPromob {
      numeroPedido: string;
      oc: string;
      dataPrevista: string;
      transportadora: string;
      status: string;
    }

    const pedidos: PedidoPromob[] = [];

    // Extrair linhas da tabela (<tr> com células <td>)
    const trRegex = /<tr[^>]*class="[^"]*(?:odd|even|row)[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;

    let trMatch;
    while ((trMatch = trRegex.exec(html)) !== null) {
      const cells: string[] = [];
      let tdMatch;

      // Reset regex para cada linha
      const tdRegexLocal = new RegExp(tdRegex.source, tdRegex.flags);
      while ((tdMatch = tdRegexLocal.exec(trMatch[1])) !== null) {
        // Remover tags HTML e limpar espaços
        const texto = tdMatch[1]
          .replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, "$2")
          .replace(/<[^>]+>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        cells.push(texto);
      }

      // Linha válida: primeira célula é número de pedido
      if (cells.length >= 8 && /^\d{5,}$/.test(cells[0])) {
        pedidos.push({
          numeroPedido: cells[0], // Ex: 140167
          oc: cells[5] || "", // Ex: MarianaNDormCasal
          dataPrevista: cells[7] || "", // Ex: 19/05/2026
          status: cells[3] || "", // Ex: L (Liberado)
          transportadora: cells[14] || cells[13] || "", // Ex: JOTRANS
        });
      }
    }

    // Fallback: tentar parsear tabela genérica se regex específico não encontrou nada
    if (pedidos.length === 0) {
      const trGeneric = /<tr>([\s\S]*?)<\/tr>/gi;
      while ((trMatch = trGeneric.exec(html)) !== null) {
        const cells: string[] = [];
        let tdMatch;
        const tdLocal = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        while ((tdMatch = tdLocal.exec(trMatch[1])) !== null) {
          const texto = tdMatch[1]
            .replace(/<[^>]+>/g, "")
            .replace(/\s+/g, " ")
            .trim();
          cells.push(texto);
        }
        if (cells.length >= 8 && /^\d{5,}$/.test(cells[0])) {
          pedidos.push({
            numeroPedido: cells[0],
            oc: cells[5] || "",
            dataPrevista: cells[7] || "",
            status: cells[3] || "",
            transportadora: cells[14] || "",
          });
        }
      }
    }

    if (pedidos.length === 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          total_pedidos: 0,
          atualizados: 0,
          mensagem: "Nenhum pedido encontrado no período. Verifique os filtros no portal Promob.",
        }),
        { headers: corsHeaders },
      );
    }

    // --------------------------------------------------------
    // 6. Buscar contratos ativos da loja
    // --------------------------------------------------------
    const { data: contratos } = await supabase
      .from("contratos")
      .select("id, cliente_nome")
      .eq("loja_id", loja_id)
      .not("status", "in", '("finalizado","cancelado")');

    if (!contratos || contratos.length === 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          total_pedidos: pedidos.length,
          atualizados: 0,
          mensagem: "Nenhum contrato ativo para cruzar com os pedidos.",
        }),
        { headers: corsHeaders },
      );
    }

    // --------------------------------------------------------
    // 7. Normalizar nomes para comparação
    // --------------------------------------------------------
    const normalize = (s: string): string =>
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");

    // --------------------------------------------------------
    // 8. Cruzar e atualizar
    // --------------------------------------------------------
    let atualizados = 0;
    const resultados: Array<{ contrato: string; pedido: string; data: string }> = [];

    for (const pedido of pedidos) {
      const ocNorm = normalize(pedido.oc);
      if (!ocNorm || !pedido.dataPrevista) continue;

      // Buscar contrato com nome mais similar
      const contrato = contratos.find((c) => {
        const nomeNorm = normalize(c.cliente_nome);
        // Match exato ou um contém o outro (mínimo 4 chars para evitar falso positivo)
        return (
          nomeNorm === ocNorm ||
          (ocNorm.length >= 4 && nomeNorm.includes(ocNorm)) ||
          (nomeNorm.length >= 4 && ocNorm.includes(nomeNorm))
        );
      });

      if (!contrato) continue;

      // Converter data BR para ISO
      const partes = pedido.dataPrevista.split("/");
      if (partes.length !== 3) continue;
      const [d, m, a] = partes;
      const dataISO = `${a}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;

      // Verificar se data é válida
      if (isNaN(Date.parse(dataISO))) continue;

      // Verificar se entrega já existe para este contrato
      const { data: entregaExist } = await supabase
        .from("entregas")
        .select("id")
        .eq("contrato_id", contrato.id)
        .maybeSingle();

      if (entregaExist) {
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

      // Registrar no log do contrato
      await supabase.from("contrato_logs").insert({
        contrato_id: contrato.id,
        acao: "promob_sincronizado",
        descricao: `Pedido Promob #${pedido.numeroPedido} sincronizado. Previsão: ${pedido.dataPrevista}. Transportadora: ${pedido.transportadora || "não informada"}.`,
      });

      resultados.push({
        contrato: contrato.cliente_nome,
        pedido: pedido.numeroPedido,
        data: pedido.dataPrevista,
      });
      atualizados++;
    }

    // --------------------------------------------------------
    // 9. Atualizar timestamp da última sincronização
    // --------------------------------------------------------
    await supabase
      .from("integracoes")
      .update({
        ativo: true,
        ultima_sincronizacao: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("loja_id", loja_id)
      .eq("tipo", "promob");

    // --------------------------------------------------------
    // 10. Retornar resultado
    // --------------------------------------------------------
    return new Response(
      JSON.stringify({
        ok: true,
        total_pedidos: pedidos.length,
        atualizados,
        resultados,
        mensagem:
          atualizados > 0
            ? `${atualizados} contrato(s) atualizado(s) com previsão do Promob`
            : `${pedidos.length} pedidos encontrados mas nenhum cruzou com contratos ativos. Verifique se os nomes dos clientes coincidem com o campo OC do Promob.`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Erro sync-promob:", error);
    return new Response(
      JSON.stringify({
        ok: false,
        erro: "Erro interno na sincronização. Tente novamente.",
        detalhe: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }
});

// ============================================================
// COMO INSTALAR NO SUPABASE:
//
// 1. Acesse: supabase.com → seu projeto → Edge Functions
// 2. Clique "New Function"
// 3. Nome: sync-promob
// 4. Cole todo este código
// 5. Clique "Deploy"
//
// COMO TESTAR:
// No SQL Editor do Supabase, rode:
//   SELECT net.http_post(
//     url := '<sua-url-supabase>/functions/v1/sync-promob',
//     headers := '{"Authorization": "Bearer <anon-key>"}',
//     body := '{"loja_id": "<seu-loja-id>"}'
//   );
//
// VARIÁVEIS DE AMBIENTE (já disponíveis automaticamente):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
// ============================================================
