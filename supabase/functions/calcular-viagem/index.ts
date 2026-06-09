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
  locomocao_diaria_km: 10,
  montadores_por_carro: 2,
};

const round = (n: number) => Math.round(n * 100) / 100;

async function geocode(endereco: string): Promise<{ lat: number; lng: number; formattedAddress: string }> {
  // Tenta várias variações até o Google encontrar
  const limpo = endereco.trim();
  const soDigitos = limpo.replace(/\D/g, "");

  const candidatos: string[] = [];
  // 1. Endereço original
  candidatos.push(limpo);
  // 2. Se parece CEP (8 dígitos), tenta com sufixo Brasil
  if (soDigitos.length === 8) {
    const cepFormatado = `${soDigitos.slice(0, 5)}-${soDigitos.slice(5)}`;
    candidatos.push(cepFormatado, soDigitos, `${cepFormatado}, Brasil`, `${soDigitos}, Brasil`);
  }
  // 3. Adiciona ", Brasil" se ainda não tem
  if (!/brasil|brazil/i.test(limpo)) {
    candidatos.push(`${limpo}, Brasil`);
  }

  let ultimoErro = "";
  for (const candidato of candidatos) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(candidato)}&key=${GOOGLE_MAPS_API_KEY}&region=br`;
    const resp = await fetch(url);
    const json = await resp.json();
    if (resp.ok && json.status === "OK" && json.results?.[0]) {
      const loc = json.results[0].geometry.location;
      return {
        lat: loc.lat,
        lng: loc.lng,
        formattedAddress: json.results[0].formatted_address,
      };
    }
    ultimoErro = json.status || `HTTP ${resp.status}`;
  }

  throw new Error(
    `Não foi possível localizar "${endereco}". ` +
    `Verifique o CEP (formato 00000-000) ou informe endereço completo com cidade/UF. ` +
    `(Google: ${ultimoErro})`
  );
}

async function geocodeAndRoute(origem: string, destino: string) {
  // Routes API exige lat/lng, não endereço. Geocodifica primeiro.
  const [origemCoord, destinoCoord] = await Promise.all([
    geocode(origem),
    geocode(destino),
  ]);

  const body = {
    origin: { location: { latLng: { latitude: origemCoord.lat, longitude: origemCoord.lng } } },
    destination: { location: { latLng: { latitude: destinoCoord.lat, longitude: destinoCoord.lng } } },
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
  if (!resp.ok) throw new Error(`Google Routes error [${resp.status}]: ${JSON.stringify(json)}`);
  const route = json.routes?.[0];
  if (!route) throw new Error("Nenhuma rota encontrada entre os endereços informados");
  const distanciaKm = (route.distanceMeters ?? 0) / 1000;
  let pedagio = 0;
  const tolls = route.travelAdvisory?.tollInfo?.estimatedPrice;
  if (Array.isArray(tolls)) {
    const brl = tolls.find((t: any) => t.currencyCode === "BRL") ?? tolls[0];
    if (brl) pedagio = Number(brl.units ?? 0) + Number(brl.nanos ?? 0) / 1e9;
  }
  return { distanciaKm, pedagio };
}

function calcular(
  distanciaKm: number,
  pedagioViagem: number,
  valorVenda: number,
  CFG: typeof DEFAULTS,
  opts: { qtdMontadores?: number; qtdVeiculos?: number } = {},
) {
  const qtdMontadores = Math.max(1, opts.qtdMontadores ?? Number(CFG.min_montadores));
  const qtdVeiculos = Math.max(
    1,
    opts.qtdVeiculos ?? Math.ceil(qtdMontadores / Number(CFG.montadores_por_carro)),
  );

  const diasMontagem = Math.max(
    1,
    Math.ceil(valorVenda / (Number(CFG.valor_montagem_dia) * qtdMontadores)),
  );

  const semanasCompletas = Math.floor(diasMontagem / 5);
  const diasRestantes = diasMontagem % 5;
  const finsDeSemana = diasRestantes > 0 ? semanasCompletas : Math.max(0, semanasCompletas - 1);
  const noitesHospedado = Math.max(1, diasMontagem - finsDeSemana * 2);

  const gasolinaPorCarro = (distanciaKm * 2) / Number(CFG.consumo_km_litro) * Number(CFG.preco_gasolina);
  const pedagioPorCarro = pedagioViagem * 2;
  const custoIdaVoltaFrota = gasolinaPorCarro * qtdVeiculos;
  const pedagioIdaVoltaFrota = pedagioPorCarro * qtdVeiculos;

  // === MONTADORES ===
  const totalViagensMontador = 1 + finsDeSemana + 1; // ida+volta
  const gasolinaMontador = totalViagensMontador * custoIdaVoltaFrota;
  const pedagioMontador = totalViagensMontador * pedagioIdaVoltaFrota;
  const hotelMontadores = noitesHospedado * qtdMontadores * Number(CFG.hotel_por_pessoa);
  const refeicaoMontadores = noitesHospedado * qtdMontadores * Number(CFG.refeicao_montador_dia);
  // Locomoção diária hotel↔obra
  const locomocaoDiariaPorCarro =
    (Number(CFG.locomocao_diaria_km) * 2) / Number(CFG.consumo_km_litro) * Number(CFG.preco_gasolina);
  const locomocaoDiaria = locomocaoDiariaPorCarro * qtdVeiculos * noitesHospedado;
  const subMontadores =
    gasolinaMontador + pedagioMontador + hotelMontadores + refeicaoMontadores + locomocaoDiaria;

  // === MEDIDOR (bate-volta, 1 carro) ===
  const subMedidor = gasolinaPorCarro + pedagioPorCarro + Number(CFG.refeicao_medidor);

  // === GERENTE (2 últimos dias, 1 noite, 1 carro) ===
  const hotelGerente = Number(CFG.hotel_por_pessoa);
  const refeicaoGerente = 2 * Number(CFG.refeicao_montador_dia);
  const subGerente = gasolinaPorCarro + pedagioPorCarro + hotelGerente + refeicaoGerente;

  const custoTotal = subMontadores + subMedidor + subGerente;

  return {
    dias_montagem: diasMontagem,
    semanas: semanasCompletas,
    fins_de_semana_extras: finsDeSemana,
    noites_hospedado: noitesHospedado,
    qtd_montadores: qtdMontadores,
    qtd_veiculos: qtdVeiculos,
    detalhamento: {
      montadores: {
        viagens: totalViagensMontador,
        noites: noitesHospedado,
        pessoas: qtdMontadores,
        veiculos: qtdVeiculos,
        gasolina: round(gasolinaMontador),
        pedagio: round(pedagioMontador),
        hotel: round(hotelMontadores),
        refeicao: round(refeicaoMontadores),
        locomocao_diaria: round(locomocaoDiaria),
        subtotal: round(subMontadores),
      },
      medidor: {
        gasolina: round(gasolinaPorCarro),
        pedagio: round(pedagioPorCarro),
        refeicao: Number(CFG.refeicao_medidor),
        subtotal: round(subMedidor),
      },
      gerente: {
        gasolina: round(gasolinaPorCarro),
        pedagio: round(pedagioPorCarro),
        hotel: round(hotelGerente),
        refeicao: round(refeicaoGerente),
        subtotal: round(subGerente),
      },
      parametros: {
        gasolina_por_carro_ida_volta: round(gasolinaPorCarro),
        pedagio_por_carro_ida_volta: round(pedagioPorCarro),
        locomocao_diaria_por_carro: round(locomocaoDiariaPorCarro),
        consumo_km_litro: Number(CFG.consumo_km_litro),
        preco_gasolina: Number(CFG.preco_gasolina),
        hotel_por_pessoa: Number(CFG.hotel_por_pessoa),
        refeicao_montador_dia: Number(CFG.refeicao_montador_dia),
        locomocao_diaria_km: Number(CFG.locomocao_diaria_km),
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
    const {
      contrato_id,
      cep_origem,
      cep_destino,
      origem: origemRaw,
      destino: destinoRaw,
      valor_venda,
      loja_id,
      qtd_montadores,
      qtd_veiculos,
    } = body ?? {};

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ============= SIMULATION MODE =============
    if (!contrato_id) {
      const origem = origemRaw || cep_origem;
      const destino = destinoRaw || cep_destino;
      if (!origem || !destino || !valor_venda) {
        return new Response(
          JSON.stringify({ error: "Para simulação, envie origem, destino e valor_venda" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const { data: cfgRow } = loja_id
        ? await admin.from("config_viagem").select("*").eq("loja_id", loja_id).maybeSingle()
        : { data: null };
      const CFG = { ...DEFAULTS, ...(cfgRow ?? {}) };
      const { distanciaKm, pedagio } = await geocodeAndRoute(String(origem), String(destino));
      const result = calcular(distanciaKm, pedagio, Number(valor_venda), CFG, {
        qtdMontadores: qtd_montadores ? Number(qtd_montadores) : undefined,
        qtdVeiculos: qtd_veiculos ? Number(qtd_veiculos) : undefined,
      });
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
      .select("id, loja_id, valor_venda, cliente_id, custo_viagem_override, viagem_qtd_montadores, viagem_qtd_veiculos")
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
    const result = calcular(distanciaKm, pedagio, valorVenda, CFG, {
      qtdMontadores: qtd_montadores ? Number(qtd_montadores) : contrato.viagem_qtd_montadores ?? undefined,
      qtdVeiculos: qtd_veiculos ? Number(qtd_veiculos) : contrato.viagem_qtd_veiculos ?? undefined,
    });

    const detalhamento = {
      ...result.detalhamento,
      dias_montagem: result.dias_montagem,
      fins_de_semana_extras: result.fins_de_semana_extras,
      noites_hospedado: result.noites_hospedado,
      qtd_montadores: result.qtd_montadores,
      qtd_veiculos: result.qtd_veiculos,
      origem,
      destino,
    };

    await admin
      .from("contratos")
      .update({
        custo_viagem: result.custo_total,
        distancia_km: round(distanciaKm),
        custo_viagem_detalhamento: detalhamento,
        custo_viagem_calculado_em: new Date().toISOString(),
        viagem_qtd_montadores: result.qtd_montadores,
        viagem_qtd_veiculos: result.qtd_veiculos,
      })
      .eq("id", contrato_id);

    // Lança no DRE como custo de frete real (upsert)
    const { data: dreRow } = await admin
      .from("dre_contrato")
      .select("contrato_id, custo_frete_real, custo_frete_previsto")
      .eq("contrato_id", contrato_id)
      .maybeSingle();
    if (dreRow) {
      await admin
        .from("dre_contrato")
        .update({ custo_frete_real: result.custo_total, custo_frete_previsto: result.custo_total })
        .eq("contrato_id", contrato_id);
    } else {
      await admin.from("dre_contrato").insert({
        contrato_id,
        valor_venda: valorVenda,
        custo_frete_real: result.custo_total,
        custo_frete_previsto: result.custo_total,
      });
    }

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
