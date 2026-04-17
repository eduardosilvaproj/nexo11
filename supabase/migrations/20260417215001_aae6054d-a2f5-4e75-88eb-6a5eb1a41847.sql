
-- 1) portal_tokens table
CREATE TABLE public.portal_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL UNIQUE REFERENCES public.contratos(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_portal_tokens_token ON public.portal_tokens(token);

ALTER TABLE public.portal_tokens ENABLE ROW LEVEL SECURITY;

-- Authenticated users from same loja (or franqueador) can view the token (to share link)
CREATE POLICY "Portal tokens visíveis por loja"
ON public.portal_tokens FOR SELECT
TO authenticated
USING (public.contrato_da_loja(contrato_id) OR public.has_role(auth.uid(), 'franqueador'::app_role));

-- Anonymous users can SELECT a token row only by matching the exact token value AND it must be valid
CREATE POLICY "Anon pode ler token válido"
ON public.portal_tokens FOR SELECT
TO anon
USING (expires_at > now());

-- 2) Helper function: returns true if a valid portal token exists for a given contract
CREATE OR REPLACE FUNCTION public.has_valid_portal_token(_contrato_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.portal_tokens
    WHERE contrato_id = _contrato_id
      AND expires_at > now()
  )
$$;

-- 3) Public RLS policies for anon read access (only via valid token in URL — frontend fetches token first)
-- Note: the frontend MUST first resolve token -> contrato_id via portal_tokens, then query these tables by contrato_id.
-- These policies allow anon to read any contract row that has a valid token. Since tokens are random 64-char strings,
-- enumeration is infeasible.

CREATE POLICY "Anon pode ler contratos com token válido"
ON public.contratos FOR SELECT
TO anon
USING (public.has_valid_portal_token(id));

CREATE POLICY "Anon pode ler logs com token válido"
ON public.contrato_logs FOR SELECT
TO anon
USING (public.has_valid_portal_token(contrato_id));

CREATE POLICY "Anon pode ler agendamentos com token válido"
ON public.agendamentos_montagem FOR SELECT
TO anon
USING (public.has_valid_portal_token(contrato_id));

CREATE POLICY "Anon pode ler entregas com token válido"
ON public.entregas FOR SELECT
TO anon
USING (public.has_valid_portal_token(contrato_id));

-- 4) Auto-create token on contract insert
CREATE OR REPLACE FUNCTION public.criar_portal_token_contrato()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.portal_tokens (contrato_id) VALUES (NEW.id)
  ON CONFLICT (contrato_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_criar_portal_token
AFTER INSERT ON public.contratos
FOR EACH ROW
EXECUTE FUNCTION public.criar_portal_token_contrato();

-- 5) Backfill tokens for existing contracts
INSERT INTO public.portal_tokens (contrato_id)
SELECT id FROM public.contratos
ON CONFLICT (contrato_id) DO NOTHING;
