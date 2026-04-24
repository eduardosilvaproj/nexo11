-- 1. Ativar Realtime para a tabela de mensagens
-- Primeiro verifica se a publicação existe, se não cria (embora normalmente o Supabase já tenha a 'supabase_realtime')
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Adiciona a tabela à publicação
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_mensagens;

-- 2. Corrigir e Reforçar as Políticas RLS
-- Remove as políticas antigas muito permissivas
DROP POLICY IF EXISTS "Leitura de mensagens permitida" ON public.chat_mensagens;
DROP POLICY IF EXISTS "Inserção de mensagens permitida" ON public.chat_mensagens;
DROP POLICY IF EXISTS "Atualização de leitura permitida" ON public.chat_mensagens;

-- Nova política de SELECT (Leitura)
CREATE POLICY "Clientes podem ler suas próprias mensagens"
    ON public.chat_mensagens
    FOR SELECT
    TO anon
    USING (contrato_id = portal_token_contrato_id());

CREATE POLICY "Equipe pode ler todas as mensagens"
    ON public.chat_mensagens
    FOR SELECT
    TO authenticated
    USING (true);

-- Nova política de INSERT (Envio)
CREATE POLICY "Clientes podem enviar mensagens para seu contrato"
    ON public.chat_mensagens
    FOR INSERT
    TO anon
    WITH CHECK (contrato_id = portal_token_contrato_id());

CREATE POLICY "Equipe pode enviar mensagens"
    ON public.chat_mensagens
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Nova política de UPDATE (Marcar como lida)
CREATE POLICY "Clientes podem atualizar mensagens de seu contrato"
    ON public.chat_mensagens
    FOR UPDATE
    TO anon
    USING (contrato_id = portal_token_contrato_id());

CREATE POLICY "Equipe pode atualizar mensagens"
    ON public.chat_mensagens
    FOR UPDATE
    TO authenticated
    USING (true);
