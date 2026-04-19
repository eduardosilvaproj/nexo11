-- Recria a view vw_contratos_dre calculando margem realizada a partir de fontes vivas
DROP VIEW IF EXISTS public.vw_contratos_dre;

CREATE VIEW public.vw_contratos_dre
WITH (security_invoker = true)
AS
WITH orc AS (
  SELECT DISTINCT ON (o.contrato_id)
    o.contrato_id,
    COALESCE(o.valor_negociado, 0)::numeric AS valor_negociado,
    COALESCE(o.total_pedido, 0)::numeric    AS total_pedido,
    COALESCE(o.frete_loja, 0)::numeric      AS frete_loja
  FROM public.orcamentos o
  WHERE o.contrato_id IS NOT NULL
  ORDER BY o.contrato_id, o.updated_at DESC NULLS LAST, o.created_at DESC NULLS LAST
),
amb AS (
  SELECT
    a.contrato_id,
    COALESCE(SUM(a.valor_montador)   FILTER (WHERE a.status_montagem    = 'pago'), 0)::numeric AS pago_montador,
    COALESCE(SUM(a.valor_medidor)    FILTER (WHERE a.status_medicao     = 'pago'), 0)::numeric AS pago_medidor,
    COALESCE(SUM(a.valor_conferente) FILTER (WHERE a.status_conferencia = 'pago'), 0)::numeric AS pago_conferente
  FROM public.contrato_ambientes a
  GROUP BY a.contrato_id
)
SELECT
  c.id,
  c.loja_id,
  c.cliente_nome,
  c.cliente_contato,
  c.vendedor_id,
  c.status,
  -- Receita realizada (prioriza valor negociado do orçamento)
  COALESCE(NULLIF(orc.valor_negociado, 0), c.valor_venda) AS valor_venda,
  c.assinado,
  c.data_criacao,
  c.data_finalizacao,
  c.created_at,
  c.updated_at,

  -- Previstos (mantidos vindo da dre_contrato)
  d.custo_produto_previsto,
  -- Custo produto real: usa total_pedido do orçamento se houver
  GREATEST(COALESCE(NULLIF(orc.total_pedido, 0), d.custo_produto_real, 0), 0) AS custo_produto_real,

  d.custo_montagem_previsto,
  -- Custo montagem real: soma valor_montador (status pago)
  COALESCE(amb.pago_montador, 0) AS custo_montagem_real,

  d.custo_frete_previsto,
  -- Frete real: usa frete_loja do orçamento se houver
  COALESCE(NULLIF(orc.frete_loja, 0), d.custo_frete_real, 0) AS custo_frete_real,

  d.custo_comissao_previsto,
  COALESCE(d.custo_comissao_real, 0) AS custo_comissao_real,

  d.outros_custos_previstos,
  -- Outros custos reais: medidor + conferente pagos + outros custos manuais (retrabalhos/chamados etc)
  (COALESCE(amb.pago_medidor, 0)
   + COALESCE(amb.pago_conferente, 0)
   + COALESCE(d.outros_custos_reais, 0)) AS outros_custos_reais,

  d.margem_prevista,

  -- Margem realizada calculada na hora pela fórmula:
  -- (Receita - Custos reais) / Receita * 100
  CASE
    WHEN COALESCE(NULLIF(orc.valor_negociado, 0), c.valor_venda) > 0 THEN
      ROUND(
        ((COALESCE(NULLIF(orc.valor_negociado, 0), c.valor_venda)
          - (
              GREATEST(COALESCE(NULLIF(orc.total_pedido, 0), d.custo_produto_real, 0), 0)
              + COALESCE(amb.pago_montador, 0)
              + COALESCE(NULLIF(orc.frete_loja, 0), d.custo_frete_real, 0)
              + COALESCE(d.custo_comissao_real, 0)
              + COALESCE(amb.pago_medidor, 0)
              + COALESCE(amb.pago_conferente, 0)
              + COALESCE(d.outros_custos_reais, 0)
            )
         )
         / COALESCE(NULLIF(orc.valor_negociado, 0), c.valor_venda)
        ) * 100
      , 2)
    ELSE 0
  END AS margem_realizada,

  d.desvio_total,
  d.updated_at AS dre_updated_at
FROM public.contratos c
LEFT JOIN public.dre_contrato d ON d.contrato_id = c.id
LEFT JOIN orc                  ON orc.contrato_id = c.id
LEFT JOIN amb                  ON amb.contrato_id = c.id;