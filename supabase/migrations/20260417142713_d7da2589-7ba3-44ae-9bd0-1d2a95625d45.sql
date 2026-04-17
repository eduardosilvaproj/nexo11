CREATE TABLE IF NOT EXISTS public.retrabalhos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  motivo text NOT NULL,
  responsavel uuid,
  custo numeric(14,2) NOT NULL DEFAULT 0,
  resolvido boolean NOT NULL DEFAULT false,
  data_resolucao timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_retrabalhos_contrato ON public.retrabalhos(contrato_id);

ALTER TABLE public.retrabalhos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Retrabalhos visíveis por contrato"
ON public.retrabalhos FOR SELECT
TO authenticated
USING (public.contrato_da_loja(contrato_id) OR public.has_role(auth.uid(), 'franqueador'));

CREATE POLICY "Retrabalhos gerenciados pela loja"
ON public.retrabalhos FOR ALL
TO authenticated
USING (public.contrato_da_loja(contrato_id))
WITH CHECK (public.contrato_da_loja(contrato_id));

CREATE TRIGGER trg_retrabalhos_updated_at
BEFORE UPDATE ON public.retrabalhos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Sync DRE: soma dos custos de retrabalho como "outros custos"
CREATE OR REPLACE FUNCTION public.retrabalho_sync_dre()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_contrato uuid;
  total_prev numeric(14,2);
  total_real numeric(14,2);
BEGIN
  v_contrato := COALESCE(NEW.contrato_id, OLD.contrato_id);
  SELECT
    COALESCE(SUM(custo), 0),
    COALESCE(SUM(custo) FILTER (WHERE resolvido), 0)
    INTO total_prev, total_real
  FROM public.retrabalhos
  WHERE contrato_id = v_contrato;

  UPDATE public.dre_contrato
     SET outros_custos_previstos = total_prev,
         outros_custos_reais = total_real
   WHERE contrato_id = v_contrato;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_retrabalho_sync_dre
AFTER INSERT OR UPDATE OR DELETE ON public.retrabalhos
FOR EACH ROW EXECUTE FUNCTION public.retrabalho_sync_dre();