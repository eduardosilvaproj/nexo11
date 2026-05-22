-- Ajustar as policies da tabela public.acompanhamento_modulos para permitir SELECT, INSERT, UPDATE e DELETE somente para usuários autenticados com role admin na tabela public.user_roles.

DROP POLICY IF EXISTS "Admins can manage modules" ON public.acompanhamento_modulos;
DROP POLICY IF EXISTS "Admins can manage acompanhamento_modulos" ON public.acompanhamento_modulos;

CREATE POLICY "Admins can manage acompanhamento_modulos"
ON public.acompanhamento_modulos
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Garantir que o RLS está habilitado
ALTER TABLE public.acompanhamento_modulos ENABLE ROW LEVEL SECURITY;
