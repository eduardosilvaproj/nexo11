-- 1. user_roles: garantir WITH CHECK na ALL policy e bloquear inserts não-admin
DROP POLICY IF EXISTS "Admin gerencia papéis" ON public.user_roles;

CREATE POLICY "Admin seleciona papéis"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin insere papéis"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin atualiza papéis"
ON public.user_roles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin remove papéis"
ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Realtime: permitir canal user:<auth.uid()> para notificações
CREATE OR REPLACE FUNCTION public.realtime_canal_user_permitido(_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  IF _topic IS NULL OR position('user:' in _topic) <> 1 THEN
    RETURN false;
  END IF;
  BEGIN
    _id := substring(_topic from 6)::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;
  RETURN _id = auth.uid();
END;
$$;

-- Policies adicionais em realtime.messages para canais user:<id>
CREATE POLICY "Realtime: select canal user proprio"
ON realtime.messages FOR SELECT TO authenticated
USING (public.realtime_canal_user_permitido(realtime.topic()));

CREATE POLICY "Realtime: insert canal user proprio"
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (public.realtime_canal_user_permitido(realtime.topic()));
