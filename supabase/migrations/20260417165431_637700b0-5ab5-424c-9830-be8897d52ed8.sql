
-- 1) usuarios: scope admin/gerente to own loja
DROP POLICY IF EXISTS "Admin gerencia usuários da loja" ON public.usuarios;

CREATE POLICY "Admin/gerente gerenciam usuários da loja"
  ON public.usuarios FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR (
      loja_id = current_loja_id()
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR (
      loja_id = current_loja_id()
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
    )
  );

-- 2) user_roles: admin scoped to own loja (franqueador keeps global)
DROP POLICY IF EXISTS "Admin insere papéis" ON public.user_roles;
DROP POLICY IF EXISTS "Admin atualiza papéis" ON public.user_roles;
DROP POLICY IF EXISTS "Admin remove papéis" ON public.user_roles;
DROP POLICY IF EXISTS "Admin seleciona papéis" ON public.user_roles;

CREATE POLICY "Admin/franqueador seleciona papéis"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR (
      has_role(auth.uid(), 'admin'::app_role)
      AND (loja_id IS NULL OR loja_id = current_loja_id())
    )
  );

CREATE POLICY "Admin/franqueador insere papéis"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR (
      has_role(auth.uid(), 'admin'::app_role)
      AND loja_id IS NOT NULL
      AND loja_id = current_loja_id()
      AND role <> 'franqueador'::app_role
    )
  );

CREATE POLICY "Admin/franqueador atualiza papéis"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR (has_role(auth.uid(), 'admin'::app_role) AND loja_id = current_loja_id())
  )
  WITH CHECK (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR (has_role(auth.uid(), 'admin'::app_role) AND loja_id = current_loja_id() AND role <> 'franqueador'::app_role)
  );

CREATE POLICY "Admin/franqueador remove papéis"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'franqueador'::app_role)
    OR (has_role(auth.uid(), 'admin'::app_role) AND loja_id = current_loja_id())
  );

-- 3) contratos: insert requires valid role on the loja
DROP POLICY IF EXISTS "Vendedor cria contratos na sua loja" ON public.contratos;

CREATE POLICY "Cria contratos na própria loja com papel válido"
  ON public.contratos FOR INSERT
  TO authenticated
  WITH CHECK (
    loja_id = current_loja_id()
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
      OR has_role(auth.uid(), 'vendedor'::app_role)
    )
  );

-- 4) leads: insert requires valid role on the loja
DROP POLICY IF EXISTS "Vendedor cria leads na sua loja" ON public.leads;

CREATE POLICY "Cria leads na própria loja com papel válido"
  ON public.leads FOR INSERT
  TO authenticated
  WITH CHECK (
    loja_id = current_loja_id()
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
      OR has_role(auth.uid(), 'vendedor'::app_role)
    )
  );

-- 5) dre_contrato: insert/update only admin/gerente
DROP POLICY IF EXISTS "DRE segue contrato (insert)" ON public.dre_contrato;
DROP POLICY IF EXISTS "DRE segue contrato (update)" ON public.dre_contrato;

CREATE POLICY "DRE insert por admin/gerente"
  ON public.dre_contrato FOR INSERT
  TO authenticated
  WITH CHECK (
    contrato_da_loja(contrato_id)
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
  );

CREATE POLICY "DRE update por admin/gerente"
  ON public.dre_contrato FOR UPDATE
  TO authenticated
  USING (
    contrato_da_loja(contrato_id)
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
  )
  WITH CHECK (
    contrato_da_loja(contrato_id)
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
  );

-- 6) contrato_logs: enforce autor_id = auth.uid()
DROP POLICY IF EXISTS "Logs inseridos pela loja" ON public.contrato_logs;

CREATE POLICY "Logs inseridos com autor verificado"
  ON public.contrato_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    contrato_da_loja(contrato_id)
    AND autor_id = auth.uid()
  );
