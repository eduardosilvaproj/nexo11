DROP POLICY IF EXISTS "Service role full access" ON public.estimativas_cache;

REVOKE ALL ON public.estimativas_cache FROM anon;
REVOKE ALL ON public.estimativas_cache FROM authenticated;
GRANT ALL ON public.estimativas_cache TO service_role;