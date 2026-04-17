
CREATE OR REPLACE FUNCTION public.portal_registrar_nps(
  _token text,
  _nota int,
  _comentario text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cid uuid;
  _exists boolean;
BEGIN
  IF _nota IS NULL OR _nota < 0 OR _nota > 10 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nota inválida');
  END IF;

  SELECT contrato_id INTO _cid
  FROM public.portal_tokens
  WHERE token = _token AND expires_at > now();

  IF _cid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Token inválido ou expirado');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.chamados_pos_venda
    WHERE contrato_id = _cid AND nps IS NOT NULL
  ) INTO _exists;

  IF _exists THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'NPS já registrado');
  END IF;

  INSERT INTO public.chamados_pos_venda (contrato_id, tipo, descricao, status, nps, nps_comentario, data_fechamento)
  VALUES (_cid, 'solicitacao'::chamado_tipo, 'NPS registrado pelo cliente', 'resolvido'::chamado_status, _nota, _comentario, now());

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.portal_registrar_nps(text, int, text) TO anon, authenticated;

-- Allow anon to read chamados_pos_venda for contracts with valid token (to know if NPS was given)
CREATE POLICY "Anon pode ler chamados com token válido"
ON public.chamados_pos_venda FOR SELECT
TO anon
USING (public.has_valid_portal_token(contrato_id));
