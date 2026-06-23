-- =========================================================
-- MIGRATION: vw_logistica_unificada
-- =========================================================
-- Objetivo (PASSO 1 da unificacao logistica — somente leitura):
--   Unificar, em UMA view, as 3 trilhas que hoje vivem separadas:
--     1. producao_terceirizada  (recebimento de mercadoria da fabrica)
--     2. entregas               (agenda de entregas)
--     3. expedicoes_almoxarifado (materiais separados)
--
--   Cada linha de cada trilha vira 1 linha na view, normalizada para
--   uma FASE CANONICA comum. Nada e gravado/alterado nas tabelas;
--   esta migration NAO cria triggers nem muda nenhum fluxo de escrita.
--   Serve para visualizar o estado consolidado e validar a propagacao
--   antes de decidir o mecanismo definitivo (trigger vs service).
--
--   Eixo de ligacao entre as trilhas: contrato_id (+ loja_id).
--
--   security_invoker = on  -> a view respeita o RLS de cada tabela base
--   (mesmo padrao ja usado em vw_contratos_dre, vw_ponto_equilibrio, etc).
--
-- Fase canonica (ordem do fluxo):
--   1 aguardando_fabrica
--   2 em_producao
--   3 recebendo
--   4 no_deposito
--   5 a_agendar
--   6 agendado
--   7 em_rota
--   8 entregue
--   9 reagendado   (estado lateral)
--   0 cancelado    (estado lateral)
-- =========================================================

CREATE OR REPLACE VIEW public.vw_logistica_unificada
WITH (security_invoker = on) AS

-- ---------------------------------------------------------
-- TRILHA 1: producao_terceirizada (recebimento da fabrica)
-- ---------------------------------------------------------
SELECT
  'producao_terceirizada'::text                       AS origem,
  pt.id                                               AS origem_id,
  pt.loja_id                                          AS loja_id,
  pt.contrato_id                                      AS contrato_id,
  pt.cliente_id                                       AS cliente_id,
  COALESCE(c.cliente_nome, pt.cliente_nome)           AS cliente_nome,
  pt.numero_pedido                                    AS referencia,
  pt.data_prevista                                    AS data_prevista,
  -- status bruto exibido = o mais avancado entre status e status_recebimento
  COALESCE(pt.status_recebimento, pt.status::text)    AS status_bruto,
  CASE
    WHEN pt.status_recebimento = 'entrega_finalizada' THEN 'entregue'
    WHEN pt.status_recebimento = 'recebido_cliente'   THEN 'entregue'
    WHEN pt.status_recebimento = 'recebido_deposito'  THEN 'no_deposito'
    WHEN pt.status_recebimento = 'em_recebimento'     THEN 'recebendo'
    WHEN pt.status = 'em_producao'                    THEN 'em_producao'
    WHEN pt.status = 'pronto_retirada'                THEN 'no_deposito'
    WHEN pt.status = 'atrasado'                        THEN 'em_producao'
    ELSE 'aguardando_fabrica'
  END                                                 AS fase_canonica,
  pt.total_caixas_previstas::integer                  AS qtd_prevista,
  pt.total_caixas_recebidas::integer                  AS qtd_concluida,
  pt.recebido_em                                       AS concluido_em,
  pt.created_at                                       AS created_at
FROM public.producao_terceirizada pt
LEFT JOIN public.contratos c ON c.id = pt.contrato_id

UNION ALL

-- ---------------------------------------------------------
-- TRILHA 2: entregas (agenda de entregas)
-- ---------------------------------------------------------
SELECT
  'entregas'::text                                    AS origem,
  e.id                                                AS origem_id,
  c.loja_id                                           AS loja_id,
  e.contrato_id                                       AS contrato_id,
  NULL::uuid                                          AS cliente_id,
  c.cliente_nome                                      AS cliente_nome,
  NULL::text                                          AS referencia,
  e.data_prevista                                     AS data_prevista,
  COALESCE(e.status_visual::text, e.status::text)     AS status_bruto,
  CASE
    WHEN e.status_visual = 'entregue'    THEN 'entregue'
    WHEN e.status_visual = 'em_rota'     THEN 'em_rota'
    WHEN e.status_visual = 'agendado'    THEN 'agendado'
    WHEN e.status_visual = 'reagendado'  THEN 'reagendado'
    WHEN e.status_visual = 'a_agendar'   THEN 'a_agendar'
    WHEN e.status = 'confirmada'         THEN 'entregue'
    ELSE 'agendado'
  END                                                 AS fase_canonica,
  NULL::integer                                       AS qtd_prevista,
  NULL::integer                                       AS qtd_concluida,
  e.data_confirmacao                                  AS concluido_em,
  e.created_at                                        AS created_at
FROM public.entregas e
JOIN public.contratos c ON c.id = e.contrato_id

UNION ALL

-- ---------------------------------------------------------
-- TRILHA 3: expedicoes_almoxarifado (materiais separados)
-- ---------------------------------------------------------
SELECT
  'expedicoes_almoxarifado'::text                     AS origem,
  ex.id                                               AS origem_id,
  ex.loja_id                                          AS loja_id,
  ex.contrato_id                                      AS contrato_id,
  NULL::uuid                                          AS cliente_id,
  c.cliente_nome                                      AS cliente_nome,
  NULL::text                                          AS referencia,
  NULL::date                                          AS data_prevista,
  ex.status                                           AS status_bruto,
  CASE
    WHEN ex.status = 'entregue'  THEN 'entregue'
    WHEN ex.status = 'carregado' THEN 'em_rota'
    WHEN ex.status = 'separado'  THEN 'a_agendar'
    WHEN ex.status = 'cancelado' THEN 'cancelado'
    ELSE 'a_agendar'
  END                                                 AS fase_canonica,
  ex.quantidade::integer                              AS qtd_prevista,
  NULL::integer                                       AS qtd_concluida,
  COALESCE(ex.entregue_at, ex.carregado_at)           AS concluido_em,
  ex.created_at                                       AS created_at
FROM public.expedicoes_almoxarifado ex
LEFT JOIN public.contratos c ON c.id = ex.contrato_id;

COMMENT ON VIEW public.vw_logistica_unificada IS
  'Passo 1 da unificacao logistica (read-only): consolida producao_terceirizada, entregas e expedicoes_almoxarifado em fases canonicas comuns, ligadas por contrato_id. Nao altera fluxos de escrita.';
