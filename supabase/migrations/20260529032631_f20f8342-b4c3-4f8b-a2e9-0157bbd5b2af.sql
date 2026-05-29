
-- ============ conferencia_ambientes ============
DROP POLICY IF EXISTS "Authorized users can manage conference data" ON public.conferencia_ambientes;
DROP POLICY IF EXISTS "Conferencia data is viewable by authorized users" ON public.conferencia_ambientes;

-- ============ estoque_itens ============
DROP POLICY IF EXISTS "Enable full access for admin and gerente" ON public.estoque_itens;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.estoque_itens;

-- ============ estoque_movimentacoes ============
DROP POLICY IF EXISTS "Enable full access for admin and gerente" ON public.estoque_movimentacoes;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.estoque_movimentacoes;

-- ============ estoque_reservas ============
DROP POLICY IF EXISTS "Enable full access for admin and gerente" ON public.estoque_reservas;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.estoque_reservas;

-- ============ logistica_rotas ============
DROP POLICY IF EXISTS "Enable full access for admin and gerente" ON public.logistica_rotas;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.logistica_rotas;

-- ============ logistica_tarefas — replace broken JWT role checks ============
DROP POLICY IF EXISTS "Enable full access for admin and gerente" ON public.logistica_tarefas;
DROP POLICY IF EXISTS "Operacionais e Admins podem atualizar tarefas" ON public.logistica_tarefas;
DROP POLICY IF EXISTS "Usuários veem tarefas de sua loja ou onde são responsáveis" ON public.logistica_tarefas;

CREATE POLICY "logistica_tarefas select"
ON public.logistica_tarefas FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'gerente'::app_role)
  OR has_role(auth.uid(), 'franqueador'::app_role)
  OR responsavel_id = auth.uid()
  OR loja_id = ANY (user_lojas_ids(auth.uid()))
);

CREATE POLICY "logistica_tarefas insert"
ON public.logistica_tarefas FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'gerente'::app_role)
  OR loja_id = ANY (user_lojas_ids(auth.uid()))
);

CREATE POLICY "logistica_tarefas update"
ON public.logistica_tarefas FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'gerente'::app_role)
  OR responsavel_id = auth.uid()
  OR loja_id = ANY (user_lojas_ids(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'gerente'::app_role)
  OR responsavel_id = auth.uid()
  OR loja_id = ANY (user_lojas_ids(auth.uid()))
);

CREATE POLICY "logistica_tarefas delete"
ON public.logistica_tarefas FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'gerente'::app_role)
);

-- ============ financeiro_contas_pagar — restrict writes by role ============
DROP POLICY IF EXISTS "Users can manage their store's payables" ON public.financeiro_contas_pagar;

CREATE POLICY "Authorized roles insert payables"
ON public.financeiro_contas_pagar FOR INSERT TO authenticated
WITH CHECK (
  has_role_on_loja(auth.uid(), loja_id, ARRAY['admin'::app_role,'gerente'::app_role,'financeiro'::app_role])
);

CREATE POLICY "Authorized roles update payables"
ON public.financeiro_contas_pagar FOR UPDATE TO authenticated
USING (
  has_role_on_loja(auth.uid(), loja_id, ARRAY['admin'::app_role,'gerente'::app_role,'financeiro'::app_role])
)
WITH CHECK (
  has_role_on_loja(auth.uid(), loja_id, ARRAY['admin'::app_role,'gerente'::app_role,'financeiro'::app_role])
);

CREATE POLICY "Authorized roles delete payables"
ON public.financeiro_contas_pagar FOR DELETE TO authenticated
USING (
  has_role_on_loja(auth.uid(), loja_id, ARRAY['admin'::app_role,'gerente'::app_role,'financeiro'::app_role])
);

-- ============ financeiro_contas_receber — restrict writes by role ============
DROP POLICY IF EXISTS "Users can manage their store's receivables" ON public.financeiro_contas_receber;

CREATE POLICY "Authorized roles insert receivables"
ON public.financeiro_contas_receber FOR INSERT TO authenticated
WITH CHECK (
  has_role_on_loja(auth.uid(), loja_id, ARRAY['admin'::app_role,'gerente'::app_role,'financeiro'::app_role])
);

CREATE POLICY "Authorized roles update receivables"
ON public.financeiro_contas_receber FOR UPDATE TO authenticated
USING (
  has_role_on_loja(auth.uid(), loja_id, ARRAY['admin'::app_role,'gerente'::app_role,'financeiro'::app_role])
)
WITH CHECK (
  has_role_on_loja(auth.uid(), loja_id, ARRAY['admin'::app_role,'gerente'::app_role,'financeiro'::app_role])
);

CREATE POLICY "Authorized roles delete receivables"
ON public.financeiro_contas_receber FOR DELETE TO authenticated
USING (
  has_role_on_loja(auth.uid(), loja_id, ARRAY['admin'::app_role,'gerente'::app_role,'financeiro'::app_role])
);

-- ============ reunioes — restrict select ============
DROP POLICY IF EXISTS "Users can view reunioes" ON public.reunioes;

CREATE POLICY "Users can view own or store reunioes"
ON public.reunioes FOR SELECT TO authenticated
USING (
  auth.uid() = created_by
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'franqueador'::app_role)
  OR (loja_id IS NOT NULL AND loja_id = ANY (user_lojas_ids(auth.uid())))
);

-- ============ saas_audit_logs — remove anonymous insert ============
DROP POLICY IF EXISTS "platform_system_insert_audit" ON public.saas_audit_logs;

-- service_role bypasses RLS; keep only platform admin insert policy already present.

-- ============ Storage: assinaturas ============
DROP POLICY IF EXISTS "permitir upload anonimo de assinaturas" ON storage.objects;
DROP POLICY IF EXISTS "anyone view assinaturas" ON storage.objects;
DROP POLICY IF EXISTS "permitir visualizacao publica de assinaturas" ON storage.objects;
DROP POLICY IF EXISTS "permitir ver assinatura portal restrito" ON storage.objects;

-- ============ Storage: chat-anexos ============
DROP POLICY IF EXISTS "Upload de anexos permitido para todos" ON storage.objects;
DROP POLICY IF EXISTS "Acesso público aos anexos do chat" ON storage.objects;
DROP POLICY IF EXISTS "Exclusão de anexos permitida para todos" ON storage.objects;

CREATE POLICY "Authenticated upload chat-anexos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-anexos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated read chat-anexos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-anexos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated delete own chat-anexos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chat-anexos' AND owner = auth.uid());

-- ============ Storage: medicao-arquivos ============
DROP POLICY IF EXISTS "Medicao arquivos access" ON storage.objects;
DROP POLICY IF EXISTS "Medicao arquivos insert" ON storage.objects;
DROP POLICY IF EXISTS "Medicao arquivos update" ON storage.objects;
DROP POLICY IF EXISTS "Medicao arquivos delete" ON storage.objects;

UPDATE storage.buckets SET public = false WHERE id = 'medicao-arquivos';

CREATE POLICY "Authenticated read medicao-arquivos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'medicao-arquivos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated insert medicao-arquivos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'medicao-arquivos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated update own medicao-arquivos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'medicao-arquivos' AND owner = auth.uid())
WITH CHECK (bucket_id = 'medicao-arquivos' AND owner = auth.uid());

CREATE POLICY "Authenticated delete own medicao-arquivos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'medicao-arquivos' AND owner = auth.uid());
