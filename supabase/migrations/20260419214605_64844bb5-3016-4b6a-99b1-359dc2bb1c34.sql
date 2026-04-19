
CREATE OR REPLACE FUNCTION public.portal_token_contrato_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT contrato_id FROM (
    SELECT pt.contrato_id, pt.expires_at
      FROM public.portal_tokens pt
     WHERE pt.token = COALESCE((current_setting('request.headers', true)::json ->> 'x-portal-token'), '')
       AND pt.expires_at > now()
    UNION ALL
    SELECT pa.contrato_id, pa.expires_at
      FROM public.portal_acessos pa
     WHERE pa.token = COALESCE((current_setting('request.headers', true)::json ->> 'x-portal-token'), '')
       AND pa.expires_at > now()
       AND pa.contrato_id IS NOT NULL
  ) t
  WHERE contrato_id IS NOT NULL
  ORDER BY expires_at DESC
  LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.has_valid_portal_token(_contrato_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.portal_tokens
    WHERE contrato_id = _contrato_id
      AND expires_at > now()
      AND token = COALESCE((current_setting('request.headers', true)::json ->> 'x-portal-token'), '')
  ) OR EXISTS (
    SELECT 1 FROM public.portal_acessos
    WHERE contrato_id = _contrato_id
      AND expires_at > now()
      AND token = COALESCE((current_setting('request.headers', true)::json ->> 'x-portal-token'), '')
  )
$function$;
