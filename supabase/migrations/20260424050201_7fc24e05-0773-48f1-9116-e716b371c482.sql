-- Função auxiliar para obter o cliente_id a partir do token do portal
CREATE OR REPLACE FUNCTION public.portal_token_cliente_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cliente_id FROM contratos WHERE id = portal_token_contrato_id();
$$;

-- Atualizar política da tabela contratos
DROP POLICY IF EXISTS "Anon pode ler contratos com token válido" ON public.contratos;
CREATE POLICY "Anon pode ler contratos com token válido" ON public.contratos
FOR SELECT TO anon
USING (cliente_id = portal_token_cliente_id());

-- Atualizar política da tabela contrato_logs
DROP POLICY IF EXISTS "Anon pode ler logs com token válido" ON public.contrato_logs;
CREATE POLICY "Anon pode ler logs com token válido" ON public.contrato_logs
FOR SELECT TO anon
USING (contrato_id IN (SELECT id FROM contratos WHERE cliente_id = portal_token_cliente_id()));

-- Atualizar política da tabela contrato_ambientes
DROP POLICY IF EXISTS "Anon pode ler ambientes com token válido" ON public.contrato_ambientes;
CREATE POLICY "Anon pode ler ambientes com token válido" ON public.contrato_ambientes
FOR SELECT TO anon
USING (contrato_id IN (SELECT id FROM contratos WHERE cliente_id = portal_token_cliente_id()));

-- Atualizar política da tabela entregas
DROP POLICY IF EXISTS "Anon pode ler entregas com token válido" ON public.entregas;
CREATE POLICY "Anon pode ler entregas com token válido" ON public.entregas
FOR SELECT TO anon
USING (contrato_id IN (SELECT id FROM contratos WHERE cliente_id = portal_token_cliente_id()));

-- Atualizar política da tabela orcamentos
DROP POLICY IF EXISTS "Anon pode ler orçamentos com token válido" ON public.orcamentos;
CREATE POLICY "Anon pode ler orçamentos com token válido" ON public.orcamentos
FOR SELECT TO anon
USING (contrato_id IN (SELECT id FROM contratos WHERE cliente_id = portal_token_cliente_id()));

-- Atualizar política da tabela chat_mensagens
DROP POLICY IF EXISTS "Clientes podem ler suas próprias mensagens" ON public.chat_mensagens;
CREATE POLICY "Clientes podem ler suas próprias mensagens" ON public.chat_mensagens
FOR SELECT TO anon
USING (contrato_id IN (SELECT id FROM contratos WHERE cliente_id = portal_token_cliente_id()));

DROP POLICY IF EXISTS "Clientes podem enviar mensagens para seu contrato" ON public.chat_mensagens;
CREATE POLICY "Clientes podem enviar mensagens para seu contrato" ON public.chat_mensagens
FOR INSERT TO anon
WITH CHECK (contrato_id IN (SELECT id FROM contratos WHERE cliente_id = portal_token_cliente_id()));

DROP POLICY IF EXISTS "Clientes podem atualizar mensagens de seu contrato" ON public.chat_mensagens;
CREATE POLICY "Clientes podem atualizar mensagens de seu contrato" ON public.chat_mensagens
FOR UPDATE TO anon
USING (contrato_id IN (SELECT id FROM contratos WHERE cliente_id = portal_token_cliente_id()));
