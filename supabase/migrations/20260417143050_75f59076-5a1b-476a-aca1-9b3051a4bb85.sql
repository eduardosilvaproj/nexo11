ALTER TABLE public.chamados_pos_venda
  ADD COLUMN IF NOT EXISTS custo numeric(14,2) NOT NULL DEFAULT 0;

-- Substituir trigger de retrabalho por uma versão que soma chamados também
CREATE OR REPLACE FUNCTION public.outros_custos_sync_dre(_contrato_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  total_prev numeric(14,2);
  total_real numeric(14,2);
BEGIN
  SELECT
    COALESCE(SUM(custo), 0),
    COALESCE(SUM(custo) FILTER (WHERE resolvido), 0)
    INTO total_prev, total_real
  FROM public.retrabalhos
  WHERE contrato_id = _contrato_id;

  total_prev := total_prev + COALESCE((
    SELECT SUM(custo) FROM public.chamados_pos_venda WHERE contrato_id = _contrato_id
  ), 0);

  total_real := total_real + COALESCE((
    SELECT SUM(custo) FROM public.chamados_pos_venda
    WHERE contrato_id = _contrato_id AND status = 'resolvido'
  ), 0);

  UPDATE public.dre_contrato
     SET outros_custos_previstos = total_prev,
         outros_custos_reais = total_real
   WHERE contrato_id = _contrato_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.retrabalho_sync_dre()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM public.outros_custos_sync_dre(COALESCE(NEW.contrato_id, OLD.contrato_id));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.chamado_sync_dre()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM public.outros_custos_sync_dre(COALESCE(NEW.contrato_id, OLD.contrato_id));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chamado_sync_dre ON public.chamados_pos_venda;
CREATE TRIGGER trg_chamado_sync_dre
AFTER INSERT OR UPDATE OF custo, status OR DELETE ON public.chamados_pos_venda
FOR EACH ROW EXECUTE FUNCTION public.chamado_sync_dre();