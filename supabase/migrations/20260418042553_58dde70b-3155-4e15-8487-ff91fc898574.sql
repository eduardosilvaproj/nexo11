CREATE OR REPLACE FUNCTION public.has_valid_portal_token(_contrato_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.portal_tokens
    WHERE contrato_id = _contrato_id
      AND expires_at > now()
      AND token = COALESCE((current_setting('request.headers', true)::json ->> 'x-portal-token'), '')
  )
$function$;