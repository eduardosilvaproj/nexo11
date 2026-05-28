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

async function geocodeAndRoute(origem: string, destino: string) {
  // Use Routes API computeRoutes with tolls
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

    const body = await req.json();
    const { contrato_id } = body ?? {};
    if (!contrato_id || typeof contrato_id !== "string") {
      return new Response(JSON.stringify({ error: "contrato_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Load contrato + cliente + loja
    const { data: contrato, error: cErr } = await admin
      .from("contratos")
      .select(
        "id, loja_id, valor_venda, cliente_id, custo_viagem_override",
      )
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
      admin.from("lojas").select("id, endereco, cidade, estado").eq("id", contrato.loja_id).maybeSingle(),
      contrato.cliente_id
        ? admin
            .from("clientes")
            .select("endereco, cidade, estado, cep")
            .eq("id", contrato.cliente_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      admin.from("config_viagem").select("*").eq("loja_id", contrato.loja_id).maybeSingle(),
    ]);

    if (!loja?.cidade || !cliente?.cidade) {
      return new Response(
        JSON.stringify({ error: "Endereço da loja ou do cliente incompleto" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Same city → zera custo
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

    const origem = [loja.endereco, loja.cidade, loja.estado].filter(Boolean).join(", ");
    const destino = [cliente.endereco, cliente.cidade, cliente.estado, cliente.cep]
      .filter(Boolean)
      .join(", ");

    const { distanciaKm, pedagio } = await geocodeAndRoute(origem, destino);

    const CFG = { ...DEFAULTS, ...(cfgRow ?? {}) };
    const valorVenda = Number(contrato.valor_venda ?? 0);
    const diasMontagem = Math.max(1, Math.ceil(valorVenda / Number(CFG.valor_montagem_dia)));

    const gasolinaIda = (distanciaKm * 2) / Number(CFG.consumo_km_litro) * Number(CFG.preco_gasolina);

    // MONTADORES
    const gasolinaMontador = gasolinaIda;
    const pedagioMontador = pedagio;
    const hotelMontadores = diasMontagem * Number(CFG.min_montadores) * Number(CFG.hotel_por_pessoa);
    const refeicaoMontadores =
      diasMontagem * Number(CFG.min_montadores) * Number(CFG.refeicao_montador_dia);
    const subMontadores = gasolinaMontador + pedagioMontador + hotelMontadores + refeicaoMontadores;

    // MEDIDOR
    const subMedidor = gasolinaIda + pedagio + Number(CFG.refeicao_medidor);

    // GERENTE (2 dias, 1 noite)
    const hotelGerente = 1 * Number(CFG.hotel_por_pessoa);
    const refeicaoGerente = 2 * Number(CFG.refeicao_montador_dia);
    const subGerente = gasolinaIda + pedagio + hotelGerente + refeicaoGerente;

    const custoTotal = subMontadores + subMedidor + subGerente;

    const detalhamento = {
      montadores: {
        gasolina: round(gasolinaMontador),
        pedagio: round(pedagioMontador),
        hotel: round(hotelMontadores),
        refeicao: round(refeicaoMontadores),
        subtotal: round(subMontadores),
      },
      medidor: {
        gasolina: round(gasolinaIda),
        pedagio: round(pedagio),
        refeicao: Number(CFG.refeicao_medidor),
        subtotal: round(subMedidor),
      },
      gerente: {
        gasolina: round(gasolinaIda),
        pedagio: round(pedagio),
        hotel: round(hotelGerente),
        refeicao: round(refeicaoGerente),
        subtotal: round(subGerente),
      },
      dias_montagem: diasMontagem,
      origem,
      destino,
    };

    await admin
      .from("contratos")
      .update({
        custo_viagem: round(custoTotal),
        distancia_km: round(distanciaKm),
        custo_viagem_detalhamento: detalhamento,
        custo_viagem_calculado_em: new Date().toISOString(),
      })
      .eq("id", contrato_id);

    return new Response(
      JSON.stringify({
        distancia_km: round(distanciaKm),
        dias_montagem: diasMontagem,
        detalhamento,
        custo_total: round(custoTotal),
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

function round(n: number) {
  return Math.round(n * 100) / 100;
}
