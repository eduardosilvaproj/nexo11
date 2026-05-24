-- Índices para performance da Central de Envios
CREATE INDEX IF NOT EXISTS idx_communication_outbox_loja ON public.communication_outbox(loja_id);
CREATE INDEX IF NOT EXISTS idx_communication_outbox_status ON public.communication_outbox(status);
CREATE INDEX IF NOT EXISTS idx_communication_outbox_contrato ON public.communication_outbox(contrato_id);
CREATE INDEX IF NOT EXISTS idx_communication_outbox_cliente ON public.communication_outbox(cliente_id);
CREATE INDEX IF NOT EXISTS idx_communication_outbox_created_at ON public.communication_outbox(created_at DESC);

-- Refinar políticas de RLS para communication_outbox
-- Permitir que qualquer staff autenticado da loja insira na outbox (gatilhos de automação)
DROP POLICY IF EXISTS "Insert into outbox by authorized staff" ON public.communication_outbox;
CREATE POLICY "Insert into outbox by authorized staff" 
ON public.communication_outbox 
FOR INSERT 
TO authenticated 
WITH CHECK (
  (loja_id IN (SELECT u.loja_id FROM usuarios u WHERE u.id = auth.uid()))
  OR has_role(auth.uid(), 'franqueador')
);

-- Garantir que a visualização seja restrita por loja e perfil
DROP POLICY IF EXISTS "View outbox by store" ON public.communication_outbox;
CREATE POLICY "View outbox by store" 
ON public.communication_outbox 
FOR SELECT 
TO authenticated 
USING (
  (
    (loja_id IN (SELECT u.loja_id FROM usuarios u WHERE u.id = auth.uid()))
    AND (
      has_role(auth.uid(), 'admin') OR 
      has_role(auth.uid(), 'gerente') OR 
      has_role(auth.uid(), 'franqueador') OR
      has_role(auth.uid(), 'pos_venda') OR
      has_role(auth.uid(), 'vendedor')
    )
  )
  OR has_role(auth.uid(), 'franqueador')
);

-- Políticas para communication_settings (apenas admin/gerente/franqueador)
DROP POLICY IF EXISTS "Manage settings by store managers" ON public.communication_settings;
CREATE POLICY "Manage settings by store managers"
ON public.communication_settings
FOR ALL
TO authenticated
USING (
  (loja_id IN (SELECT u.loja_id FROM usuarios u WHERE u.id = auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerente')))
  OR has_role(auth.uid(), 'franqueador')
);

-- Função auxiliar para validar opt-in antes de processar envio (será usada na Edge Function)
CREATE OR REPLACE FUNCTION public.check_cliente_opt_in(p_cliente_id UUID, p_loja_id UUID, p_canal TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_opt_in BOOLEAN;
BEGIN
  IF p_canal = 'whatsapp' THEN
    SELECT whatsapp_opt_in INTO v_opt_in FROM cliente_preferencias_comunicacao 
    WHERE cliente_id = p_cliente_id AND loja_id = p_loja_id;
  ELSIF p_canal = 'email' THEN
    SELECT email_opt_in INTO v_opt_in FROM cliente_preferencias_comunicacao 
    WHERE cliente_id = p_cliente_id AND loja_id = p_loja_id;
  ELSE
    v_opt_in := TRUE; -- Outros canais ou se não houver preferência registrada
  END IF;
  
  RETURN COALESCE(v_opt_in, TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
