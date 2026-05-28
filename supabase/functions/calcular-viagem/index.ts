import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const DEFAULTS = {
  valor_montagem_dia: 5000,
  min_montadores: 2,
  hotel_por_pessoa: 250,
  refeicao_montador_dia: 100,
  refeicao_medidor: 40,
  consumo_km_litro: 10,
  preco_gasolina: 5.8,
  valor_medicao_dia: 200000,
};

function round(n: number) {
  return Math.round(n * 100) / 100;
}

async function geocodeAndRoute(origem: string, destino: string) {
  const body = {
    origin: { address: origem },
    destination: { address: destino },
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_UNAWARE",
    extraComputations: ["TOLLS"],
    routeModifiers: { vehicleInfo: { emissionType: "GASOLINE" } },
  };
  const resp = await fetch(
    `https://routes.googleapis.com/directions/v2:computeRoutes?key=${GOOGLE_MAPS_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-FieldMask": "routes.distanceMeters,routes.travelAdvisory.tollInfo",
      },
      body: JSON.stringify(body),
    },
  );
  const json = await resp.json();
  if (!resp.ok) {
    throw new Error(`Google Routes error [${resp.status}]: ${JSON.stringify(json)}`);
  }
  const route = json.routes?.[0];
  if (!route) throw new Error("Nenhuma rota encontrada");
  const distanciaKm = (route.distanceMeters ?? 0) / 1000;
  let pedagio = 0;
  const tolls = route.travelAdvisory?.tollInfo?.estimatedPrice;
  if (Array.isArray(tolls)) {
    const brl = tolls.find((t: any) => t.currencyCode === "BRL") ?? tolls[0];
    if (brl) {
      pedagio = Number(brl.units ?? 0) + Number(brl.nanos ?? 0) / 1e9;
    }
  }
  return { distanciaKm, pedagio };
}

function calcular(distanciaKm: number, pedagioViagem: number, valorVenda: number, CFG: typeof DEFAULTS) {
  const diasMontagem = Math.max(1, Math.ceil(valorVenda / Number(CFG.valor_montagem_dia)));

  // Semanas seg-sex (5 dias úteis)
  const semanasCompletas = Math.floor(diasMontagem / 5);
  const diasRestantes = diasMontagem % 5;
  // Fins de semana extras = uma viagem ida+volta extra por fim de semana intermediário
  const finsDeSemana = diasRestantes > 0 ? semanasCompletas : Math.max(0, semanasCompletas - 1);
  // Noites hospedadas = dias - fins de semana em casa (sai sexta, volta segunda)
  const noitesHospedado = Math.max(1, diasMontagem - finsDeSemana * 2);

  const custoIdaVolta = ((distanciaKm * 2) / Number(CFG.consumo_km_litro)) * Number(CFG.preco_gasolina);
  const pedagioIdaVolta = pedagioViagem * 2;

  // === MONTADORES ===
  // Viagens: 1 inicial + (finsDeSemana * 1 volta+ida = 1 ida-volta) + 1 final = 2 + finsDeSemana viagens ida+volta
  const totalViagensMontador = 1 + finsDeSemana + 1; // ida+volta count
  const gasolinaMontador = totalViagensMontador * custoIdaVolta;
  const pedagioMontador = totalViagensMontador * pedagioIdaVolta;
  const hotelMontadores = noitesHospedado * Number(CFG.min_montadores) * Number(CFG.hotel_por_pessoa);
  const refeicaoMontadores = noitesHospedado * Number(CFG.min_montadores) * Number(CFG.refeicao_montador_dia);
  const subMontadores = gasolinaMontador + pedagioMontador + hotelMontadores + refeicaoMontadores;

  // === MEDIDOR (bate-volta) ===
  const subMedidor = custoIdaVolta + pedagioIdaVolta + Number(CFG.refeicao_medidor);

  // === GERENTE (2 últimos dias, 1 noite) ===
  const hotelGerente = 1 * Number(CFG.hotel_por_pessoa);
  const refeicaoGerente = 2 * Number(CFG.refeicao_montador_dia);
  const subGerente = custoIdaVolta + pedagioIdaVolta + hotelGerente + refeicaoGerente;

  const custoTotal = subMontadores + subMedidor + subGerente;

  return {
    dias_montagem: diasMontagem,
    semanas: semanasCompletas,
    fins_de_semana_extras: finsDeSemana,
    noites_hospedado: noitesHospedado,
    detalhamento: {
      montadores: {
        viagens: totalViagensMontador,
        gasolina: round(gasolinaMontador),
        pedagio: round(pedagioMontador),
        hotel: round(hotelMontadores),
        refeicao: round(refeicaoMontadores),
        subtotal: round(subMontadores),
      },
      medidor: {
        gasolina: round(custoIdaVolta),
        pedagio: round(pedagioIdaVolta),
        refeicao: Number(CFG.refeicao_medidor),
        subtotal: round(subMedidor),
      },
      gerente: {
        gasolina: round(custoIdaVolta),
        pedagio: round(pedagioIdaVolta),
        hotel: round(hotelGerente),
        refeicao: round(refeicaoGerente),
        subtotal: round(subGerente),
      },
    },
    custo_total: round(custoTotal),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!GOOGLE_MAPS_API_KEY) throw new Error("GOOGLE_MAPS_API_KEY não configurada");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supaUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsErr } = await supaUser.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { contrato_id, cep_origem, cep_destino, origem: origemRaw, destino: destinoRaw, valor_venda, loja_id } = body ?? {};

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ============= SIMULATION MODE =============
    if (!contrato_id) {
      const origem = origemRaw || cep_origem;
      const destino = destinoRaw || cep_destino;
      if (!origem || !destino || !valor_venda) {
        return new Response(
          JSON.stringify({ error: "Para simulação, envie origem/cep_origem, destino/cep_destino e valor_venda" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const { data: cfgRow } = loja_id
        ? await admin.from("config_viagem").select("*").eq("loja_id", loja_id).maybeSingle()
        : { data: null };
      const CFG = { ...DEFAULTS, ...(cfgRow ?? {}) };
      const { distanciaKm, pedagio } = await geocodeAndRoute(String(origem), String(destino));
      const result = calcular(distanciaKm, pedagio, Number(valor_venda), CFG);
      return new Response(
        JSON.stringify({
          simulacao: true,
          distancia_km: round(distanciaKm),
          pedagio_por_viagem: round(pedagio),
          origem,
          destino,
          ...result,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ============= CONTRATO MODE =============
    const { data: contrato, error: cErr } = await admin
      .from("contratos")
      .select("id, loja_id, valor_venda, cliente_id, custo_viagem_override")
      .eq("id", contrato_id)
      .single();
    if (cErr || !contrato) throw new Error(cErr?.message || "Contrato não encontrado");

    if (contrato.custo_viagem_override) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "override_manual" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const [{ data: loja }, { data: cliente }, { data: cfgRow }] = await Promise.all([
      admin.from("lojas").select("id, endereco, cidade, estado, cep").eq("id", contrato.loja_id).maybeSingle(),
      contrato.cliente_id
        ? admin.from("clientes").select("endereco, cidade, estado, cep").eq("id", contrato.cliente_id).maybeSingle()
        : Promise.resolve({ data: null }),
      admin.from("config_viagem").select("*").eq("loja_id", contrato.loja_id).maybeSingle(),
    ]);

    if (!loja?.cidade || !cliente?.cidade) {
      return new Response(
        JSON.stringify({ error: "Endereço da loja ou do cliente incompleto" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const sameCity =
      loja.cidade.trim().toLowerCase() === cliente.cidade.trim().toLowerCase() &&
      (loja.estado ?? "").trim().toLowerCase() === (cliente.estado ?? "").trim().toLowerCase();

    if (sameCity) {
      await admin
        .from("contratos")
        .update({
          custo_viagem: 0,
          distancia_km: 0,
          custo_viagem_detalhamento: { same_city: true },
          custo_viagem_calculado_em: new Date().toISOString(),
        })
        .eq("id", contrato_id);
      return new Response(
        JSON.stringify({ same_city: true, custo_total: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const origem = [loja.endereco, loja.cidade, loja.estado, loja.cep].filter(Boolean).join(", ");
    const destino = [cliente.endereco, cliente.cidade, cliente.estado, cliente.cep].filter(Boolean).join(", ");

    const { distanciaKm, pedagio } = await geocodeAndRoute(origem, destino);
    const CFG = { ...DEFAULTS, ...(cfgRow ?? {}) };
    const valorVenda = Number(contrato.valor_venda ?? 0);
    const result = calcular(distanciaKm, pedagio, valorVenda, CFG);

    const detalhamento = { ...result.detalhamento, dias_montagem: result.dias_montagem, fins_de_semana_extras: result.fins_de_semana_extras, origem, destino };

    await admin
      .from("contratos")
      .update({
        custo_viagem: result.custo_total,
        distancia_km: round(distanciaKm),
        custo_viagem_detalhamento: detalhamento,
        custo_viagem_calculado_em: new Date().toISOString(),
      })
      .eq("id", contrato_id);

    return new Response(
      JSON.stringify({
        distancia_km: round(distanciaKm),
        ...result,
        detalhamento,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("calcular-viagem error:", err);
    return new Response(JSON.stringify({ error: err.message ?? String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
