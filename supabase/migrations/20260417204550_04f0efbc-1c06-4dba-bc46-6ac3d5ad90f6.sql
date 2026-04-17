CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role, _loja_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (
        _loja_id IS NULL
        OR loja_id = _loja_id
        -- franqueador is intentionally global across stores
        OR role = 'franqueador'::app_role
      )
  )
$function$;