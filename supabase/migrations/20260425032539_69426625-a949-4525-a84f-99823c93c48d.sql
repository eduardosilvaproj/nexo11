-- Adicionar colunas de funções à tabela de usuários
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS funcoes TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS funcoes_app_habilitadas TEXT[] DEFAULT '{}';

-- Migrar dados de user_roles para o novo campo funcoes (opcional, dependendo se o sistema já está em uso intenso)
-- Nota: Como o sistema está em desenvolvimento, vamos tentar consolidar.
-- Se existirem roles, vamos inseri-los no array de funções do usuário correspondente.
DO $$ 
BEGIN
    UPDATE public.usuarios u
    SET funcoes = ARRAY(
        SELECT DISTINCT role::text 
        FROM public.user_roles ur 
        WHERE ur.user_id = u.id
    )
    WHERE EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id);
END $$;

COMMENT ON COLUMN public.usuarios.funcoes IS 'Funções do usuário: vendedor, projetista, tecnico, conferente, montador, motorista, gerente, financeiro, administrador';
COMMENT ON COLUMN public.usuarios.funcoes_app_habilitadas IS 'Funções habilitadas para acesso via App Mobile';