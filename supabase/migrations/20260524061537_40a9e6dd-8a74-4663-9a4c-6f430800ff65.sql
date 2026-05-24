-- Refinamento RLS para device_tokens
DROP POLICY IF EXISTS "Admins e Gerentes podem visualizar tokens da loja" ON public.device_tokens;
CREATE POLICY "Admins e Gerentes podem visualizar tokens da loja"
    ON public.device_tokens
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND loja_id = public.device_tokens.loja_id
            AND role::text IN ('admin', 'gerente', 'franqueador', 'admin_master')
        )
    );

-- Refinamento RLS para Comunicados
DROP POLICY IF EXISTS "Usuários podem ver comunicados ativos de sua loja ou globais" ON public.comunicados;
CREATE POLICY "Usuários podem ver comunicados ativos de sua loja ou globais"
    ON public.comunicados
    FOR SELECT
    USING (
        ativo = true 
        AND (
            loja_id IS NULL 
            OR loja_id IN (SELECT ur.loja_id FROM public.user_roles ur WHERE ur.user_id = auth.uid())
        )
        AND (
            perfil_destino IS NULL 
            OR perfil_destino = ANY (SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = auth.uid())
        )
    );

-- Permitir que Admins/Gerentes criem comunicados
CREATE POLICY "Admins e Gerentes podem gerenciar comunicados"
    ON public.comunicados
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND (loja_id = public.comunicados.loja_id OR public.comunicados.loja_id IS NULL)
            AND role::text IN ('admin', 'gerente', 'franqueador', 'admin_master')
        )
    );

-- Chat: Garantir que o criador da conversa adicione a si mesmo como participante
CREATE OR REPLACE FUNCTION public.auto_add_chat_creator_as_participant()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.chat_participantes (conversa_id, usuario_id, role)
    VALUES (NEW.id, auth.uid(), 'creator');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_auto_add_chat_creator ON public.chat_conversas;
CREATE TRIGGER tr_auto_add_chat_creator
    AFTER INSERT ON public.chat_conversas
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_add_chat_creator_as_participant();
