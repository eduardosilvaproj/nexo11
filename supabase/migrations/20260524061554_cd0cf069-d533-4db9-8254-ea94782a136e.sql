-- Ajuste de RLS para logistica_tarefas
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.logistica_tarefas;
DROP POLICY IF EXISTS "auth read logistica_tarefas" ON public.logistica_tarefas;
DROP POLICY IF EXISTS "auth write logistica_tarefas" ON public.logistica_tarefas;

CREATE POLICY "Usuários veem tarefas de sua loja ou onde são responsáveis"
    ON public.logistica_tarefas
    FOR SELECT
    USING (
        loja_id IN (SELECT ur.loja_id FROM public.user_roles ur WHERE ur.user_id = auth.uid())
        OR responsavel_id = auth.uid()
        OR (auth.jwt() ->> 'role'::text) IN ('admin', 'gerente', 'franqueador', 'admin_master')
    );

CREATE POLICY "Operacionais e Admins podem atualizar tarefas"
    ON public.logistica_tarefas
    FOR UPDATE
    USING (
        loja_id IN (SELECT ur.loja_id FROM public.user_roles ur WHERE ur.user_id = auth.uid())
        OR responsavel_id = auth.uid()
        OR (auth.jwt() ->> 'role'::text) IN ('admin', 'gerente', 'franqueador', 'admin_master')
    )
    WITH CHECK (
        loja_id IN (SELECT ur.loja_id FROM public.user_roles ur WHERE ur.user_id = auth.uid())
        OR responsavel_id = auth.uid()
        OR (auth.jwt() ->> 'role'::text) IN ('admin', 'gerente', 'franqueador', 'admin_master')
    );
