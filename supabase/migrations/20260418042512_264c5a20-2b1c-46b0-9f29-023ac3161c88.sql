CREATE OR REPLACE FUNCTION public.portal_token_contrato_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT pt.contrato_id
  FROM public.portal_tokens pt
  WHERE pt.token = COALESCE((current_setting('request.headers', true)::json ->> 'x-portal-token'), '')
    AND pt.expires_at > now()
  LIMIT 1
$function$;