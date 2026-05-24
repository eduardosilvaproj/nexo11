-- 1. Função auxiliar para verificar permissão no banco
CREATE OR REPLACE FUNCTION public.has_role_on_loja(p_user_id UUID, p_loja_id UUID, p_required_roles public.app_role[])
RETURNS BOOLEAN AS $$
BEGIN
  -- Admin Master tem acesso a tudo
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role = 'admin_master') THEN
    RETURN TRUE;
  END IF;

  -- Verifica se o usuário tem um dos papéis necessários na loja específica (ou se é admin/franqueador global)
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = p_user_id 
      AND (loja_id = p_loja_id OR role = 'admin' OR role = 'franqueador')
      AND role = ANY(p_required_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Atualizar RPCs Críticas (Envolvendo apenas a lógica de segurança)

-- Exemplo: Confirmar Pagamento de Comissão
CREATE OR REPLACE FUNCTION public.confirmar_pagamento_comissao(p_comissao_id UUID, p_usuario_id UUID)
RETURNS VOID AS $$
DECLARE
  v_loja_id UUID;
BEGIN
  SELECT loja_id INTO v_loja_id FROM public.comissoes WHERE id = p_comissao_id;

  IF NOT public.has_role_on_loja(p_usuario_id, v_loja_id, ARRAY['admin', 'gerente', 'financeiro']::public.app_role[]) THEN
    RAISE EXCEPTION 'Acesso negado: permissão insuficiente para confirmar pagamento.';
  END IF;

  UPDATE public.comissoes 
  SET status = 'pago', 
      pago_em = now(),
      atualizado_em = now()
  WHERE id = p_comissao_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Políticas RLS para tabelas sensíveis

-- Financeiro (Contas a Receber)
ALTER TABLE public.financeiro_contas_receber ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Financeiro view policy" ON public.financeiro_contas_receber;
CREATE POLICY "Financeiro view policy" ON public.financeiro_contas_receber
  FOR SELECT
  USING (
    public.has_role_on_loja(auth.uid(), loja_id, ARRAY['admin', 'gerente', 'financeiro', 'franqueador']::public.app_role[])
  );

-- Financeiro (Contas a Pagar)
ALTER TABLE public.financeiro_contas_pagar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Financeiro pagar view policy" ON public.financeiro_contas_pagar;
CREATE POLICY "Financeiro pagar view policy" ON public.financeiro_contas_pagar
  FOR SELECT
  USING (
    public.has_role_on_loja(auth.uid(), loja_id, ARRAY['admin', 'gerente', 'financeiro', 'franqueador']::public.app_role[])
  );

-- Estoque (Itens)
ALTER TABLE public.estoque_itens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Estoque view policy" ON public.estoque_itens;
CREATE POLICY "Estoque view policy" ON public.estoque_itens
  FOR SELECT
  USING (
    public.has_role_on_loja(auth.uid(), loja_id, ARRAY['admin', 'gerente', 'almoxarife', 'comprador', 'franqueador']::public.app_role[])
  );

-- Compras
ALTER TABLE public.requisicoes_compra ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Compras view policy" ON public.requisicoes_compra;
CREATE POLICY "Compras view policy" ON public.requisicoes_compra
  FOR SELECT
  USING (
    public.has_role_on_loja(auth.uid(), loja_id, ARRAY['admin', 'gerente', 'comprador', 'almoxarife', 'franqueador']::public.app_role[])
  );
