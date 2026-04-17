CREATE OR REPLACE VIEW public.vw_ponto_equilibrio
WITH (security_invoker = on) AS
WITH meses AS (
  SELECT loja_id, date_trunc('month', mes_referencia)::date AS mes
  FROM public.custos_fixos
  UNION
  SELECT loja_id, date_trunc('month', created_at)::date AS mes
  FROM public.contratos
),
fixos AS (
  SELECT loja_id, date_trunc('month', mes_referencia)::date AS mes,
         COALESCE(SUM(valor),0)::numeric AS custo_fixo_total
  FROM public.custos_fixos
  GROUP BY 1,2
),
fat AS (
  SELECT c.loja_id, date_trunc('month', c.created_at)::date AS mes,
         COALESCE(SUM(c.valor_venda),0)::numeric AS faturamento_realizado,
         COUNT(*)::int AS total_contratos,
         COALESCE(AVG(d.margem_realizada),0)::numeric AS margem_media
  FROM public.contratos c
  LEFT JOIN public.dre_contrato d ON d.contrato_id = c.id
  GROUP BY 1,2
)
SELECT
  m.loja_id,
  m.mes,
  EXTRACT(YEAR  FROM m.mes)::int AS ano,
  EXTRACT(MONTH FROM m.mes)::int AS mes_num,
  COALESCE(fx.custo_fixo_total, 0)        AS custo_fixo_total,
  COALESCE(ft.faturamento_realizado, 0)   AS faturamento_realizado,
  COALESCE(ft.total_contratos, 0)         AS total_contratos,
  COALESCE(ft.margem_media, 0)            AS margem_media,
  CASE
    WHEN ft.total_contratos > 0
      THEN ROUND(ft.faturamento_realizado / ft.total_contratos, 2)
    ELSE 0
  END                                     AS ticket_medio,
  CASE
    WHEN COALESCE(ft.margem_media,0) > 0
      THEN ROUND(COALESCE(fx.custo_fixo_total,0) / (ft.margem_media/100), 2)
    ELSE 0
  END                                     AS pe_calculado
FROM meses m
LEFT JOIN fixos fx ON fx.loja_id = m.loja_id AND fx.mes = m.mes
LEFT JOIN fat   ft ON ft.loja_id = m.loja_id AND ft.mes = m.mes;