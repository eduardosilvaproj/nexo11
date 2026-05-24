-- Drop duplicate table and related policies/functions
DROP POLICY IF EXISTS anon_portal_contrato_view ON public.contratos;
DROP POLICY IF EXISTS anon_portal_loja_view ON public.lojas;
DROP POLICY IF EXISTS anon_portal_docs_view ON public.documentos_emitidos;
DROP POLICY IF EXISTS anon_portal_events_view ON public.contrato_eventos;
DROP POLICY IF EXISTS anon_portal_ambientes_view ON public.contrato_ambientes;
DROP POLICY IF EXISTS anon_portal_entregas_view ON public.entregas;
DROP POLICY IF EXISTS anon_portal_montagem_view ON public.agendamentos_montagem;

DROP FUNCTION IF EXISTS public.get_portal_contrato_id();
DROP FUNCTION IF EXISTS public.portal_cliente_validar_token(text);
DROP FUNCTION IF EXISTS public.portal_cliente_abrir_chamado(text, text, uuid, text, text);

DROP TABLE IF EXISTS public.cliente_portal_acessos CASCADE;

-- Enhance portal_tokens with revocation and audit fields
ALTER TABLE public.portal_tokens 
  ADD COLUMN IF NOT EXISTS revogado BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ultimo_acesso_em TIMESTAMPTZ;

-- Allow admins/gerentes/vendedores to manage portal_tokens (currently blocked)
DROP POLICY IF EXISTS "portal_tokens block insert" ON public.portal_tokens;
DROP POLICY IF EXISTS "portal_tokens block update" ON public.portal_tokens;
DROP POLICY IF EXISTS "portal_tokens block delete" ON public.portal_tokens;

CREATE POLICY "Portal tokens insert por papéis"
  ON public.portal_tokens FOR INSERT TO authenticated
  WITH CHECK (
    contrato_da_loja(contrato_id) 
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role) OR has_role(auth.uid(), 'vendedor'::app_role))
  );

CREATE POLICY "Portal tokens update por papéis"
  ON public.portal_tokens FOR UPDATE TO authenticated
  USING (
    contrato_da_loja(contrato_id) 
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role) OR has_role(auth.uid(), 'vendedor'::app_role))
  );

-- Update portal_token_contrato_id to respect revocation
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
       AND pt.revogado = false
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
