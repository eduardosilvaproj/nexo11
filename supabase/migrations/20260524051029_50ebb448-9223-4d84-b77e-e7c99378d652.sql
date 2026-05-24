-- Alterar a tabela notificacoes para a nova estrutura
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notificacoes' AND column_name = 'user_id') THEN
    ALTER TABLE public.notificacoes RENAME COLUMN user_id TO usuario_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notificacoes' AND column_name = 'lida_em') THEN
    ALTER TABLE public.notificacoes RENAME COLUMN lida_em TO lida_at;
  END IF;
END $$;

-- Adicionar novos campos se não existirem
ALTER TABLE public.notificacoes 
ADD COLUMN IF NOT EXISTS loja_id UUID REFERENCES public.lojas(id),
ADD COLUMN IF NOT EXISTS perfil_destino TEXT,
ADD COLUMN IF NOT EXISTS prioridade TEXT NOT NULL DEFAULT 'media',
ADD COLUMN IF NOT EXISTS modulo TEXT NOT NULL DEFAULT 'geral',
ADD COLUMN IF NOT EXISTS titulo TEXT NOT NULL DEFAULT 'Notificação',
ADD COLUMN IF NOT EXISTS entidade_tipo TEXT,
ADD COLUMN IF NOT EXISTS entidade_id UUID,
ADD COLUMN IF NOT EXISTS lida BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS resolvida BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS resolvida_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Ajustar usuario_id para ser opcional
ALTER TABLE public.notificacoes ALTER COLUMN usuario_id DROP NOT NULL;

-- Atualizar lida
UPDATE public.notificacoes SET lida = (lida_at IS NOT NULL) WHERE lida IS FALSE AND lida_at IS NOT NULL;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_notificacoes_loja_id ON public.notificacoes(loja_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario_id ON public.notificacoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_perfil_destino ON public.notificacoes(perfil_destino);
CREATE INDEX IF NOT EXISTS idx_notificacoes_modulo ON public.notificacoes(modulo);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON public.notificacoes(lida);
CREATE INDEX IF NOT EXISTS idx_notificacoes_resolvida ON public.notificacoes(resolvida);
CREATE INDEX IF NOT EXISTS idx_notificacoes_created_at ON public.notificacoes(created_at);

-- Habilitar RLS
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Limpar políticas antigas se existirem
DROP POLICY IF EXISTS "Usuários veem notificações da própria loja" ON public.notificacoes;
DROP POLICY IF EXISTS "Usuários podem marcar suas notificações como lidas" ON public.notificacoes;
DROP POLICY IF EXISTS "Sistema e admins podem criar notificações" ON public.notificacoes;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notificacoes;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notificacoes;

-- Políticas de RLS
CREATE POLICY "Usuários veem notificações da própria loja" 
ON public.notificacoes 
FOR SELECT 
USING (
  loja_id IN (SELECT loja_id FROM public.usuarios WHERE id = auth.uid())
  AND (
    usuario_id = auth.uid() 
    OR perfil_destino IN (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'admin_master', 'gerente', 'franqueador'))
  )
);

CREATE POLICY "Usuários podem marcar suas notificações como lidas" 
ON public.notificacoes 
FOR UPDATE 
USING (
  loja_id IN (SELECT loja_id FROM public.usuarios WHERE id = auth.uid())
  AND (
    usuario_id = auth.uid() 
    OR perfil_destino IN (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'admin_master', 'gerente', 'franqueador'))
  )
);

CREATE POLICY "Sistema e admins podem criar notificações" 
ON public.notificacoes 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_notificacoes_updated_at ON public.notificacoes;
CREATE TRIGGER tr_notificacoes_updated_at
BEFORE UPDATE ON public.notificacoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
