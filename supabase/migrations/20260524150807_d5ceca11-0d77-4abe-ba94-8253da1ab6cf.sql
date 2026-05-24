-- 1. Remover constraint global se ainda existir
ALTER TABLE public.lojas DROP CONSTRAINT IF EXISTS uq_lojas_matriz_unica;

-- 2. Usar UNIQUE INDEX em vez de CONSTRAINT para suporte a WHERE (Índice Parcial)
DROP INDEX IF EXISTS idx_loja_matriz_por_cliente;
CREATE UNIQUE INDEX idx_loja_matriz_por_cliente ON public.lojas (saas_client_id, tipo) WHERE (tipo = 'matriz');
