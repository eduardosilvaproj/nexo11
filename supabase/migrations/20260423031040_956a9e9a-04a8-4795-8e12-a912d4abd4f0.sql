CREATE OR REPLACE FUNCTION public.gerar_comissoes_ambiente(
  _ambiente_id uuid,
  _gatilho text,
  _tipos_papel text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _amb record;
  _contrato record;
  _total_amb int;
  _membro record;
  _base numeric;
  _valor numeric;
  _tipo_solicitado text;
  _usuario_id uuid;
  _perc numeric;
BEGIN
  SELECT id, contrato_id, loja_id INTO _amb
  FROM contrato_ambientes WHERE id = _ambiente_id;
  IF _amb.id IS NULL THEN RETURN; END IF;

  SELECT id, valor_venda, status, vendedor_id, projetista_id INTO _contrato
  FROM contratos WHERE id = _amb.contrato_id;
  IF _contrato.id IS NULL OR _contrato.status = 'cancelado' THEN RETURN; END IF;

  SELECT count(*) INTO _total_amb
  FROM contrato_ambientes WHERE contrato_id = _amb.contrato_id;
  IF _total_amb = 0 THEN RETURN; END IF;

  _base := COALESCE(_contrato.valor_venda, 0) / _total_amb;

  FOREACH _tipo_solicitado IN ARRAY _tipos_papel LOOP
    _usuario_id := NULL;
    _perc := NULL;

    -- Identificar usuário e percentual com base no tipo solicitado
    IF _tipo_solicitado = 'vendedor' THEN
      _usuario_id := _contrato.vendedor_id;
      -- Pega o percentual do usuário se o papel dele for 'vendedor', senão pega o padrão da loja para 'vendedor'
      SELECT COALESCE(
        CASE WHEN p.tipo = 'vendedor' THEN u.comissao_percentual ELSE p.percentual_padrao END,
        0
      ) INTO _perc
      FROM usuarios u
      JOIN papeis_comissao p ON p.id = u.papel_comissao_id
      WHERE u.id = _usuario_id;
      
      -- Se o usuário não tem o papel de vendedor, tenta buscar o padrão da loja
      IF _perc IS NULL OR _perc = 0 THEN
         SELECT percentual_padrao INTO _perc FROM papeis_comissao WHERE loja_id = _amb.loja_id AND tipo = 'vendedor' AND ativo = true LIMIT 1;
      END IF;

    ELSIF _tipo_solicitado = 'projetista' THEN
      _usuario_id := _contrato.projetista_id;
      SELECT COALESCE(
        CASE WHEN p.tipo = 'projetista' THEN u.comissao_percentual ELSE p.percentual_padrao END,
        0
      ) INTO _perc
      FROM usuarios u
      JOIN papeis_comissao p ON p.id = u.papel_comissao_id
      WHERE u.id = _usuario_id;

      IF _perc IS NULL OR _perc = 0 THEN
         SELECT percentual_padrao INTO _perc FROM papeis_comissao WHERE loja_id = _amb.loja_id AND tipo = 'projetista' AND ativo = true LIMIT 1;
      END IF;

    ELSIF _tipo_solicitado = 'vendedor_projetista' THEN
      _usuario_id := _contrato.vendedor_id;
      SELECT COALESCE(u.comissao_percentual, p.percentual_padrao, 0) INTO _perc
      FROM usuarios u
      JOIN papeis_comissao p ON p.id = u.papel_comissao_id
      WHERE u.id = _usuario_id;

    ELSIF _tipo_solicitado = 'gerente_comercial' THEN
      -- Pega o primeiro usuário com esse papel na loja
      SELECT u.id, COALESCE(u.comissao_percentual, p.percentual_padrao, 0) INTO _usuario_id, _perc
      FROM usuarios u
      JOIN papeis_comissao p ON p.id = u.papel_comissao_id
      WHERE u.loja_id = _amb.loja_id AND p.tipo = 'gerente_comercial' AND p.ativo = true LIMIT 1;
    END IF;

    -- Se encontramos um usuário e um percentual, gerar a comissão
    IF _usuario_id IS NOT NULL AND COALESCE(_perc, 0) > 0 THEN
      -- Evitar duplicados para o mesmo gatilho/tipo
      IF EXISTS (
        SELECT 1 FROM comissoes c
        JOIN papeis_comissao p ON p.id = c.papel_id
        WHERE c.ambiente_id = _ambiente_id
          AND c.usuario_id = _usuario_id
          AND c.gatilho = _gatilho
          AND p.tipo = _tipo_solicitado
      ) THEN CONTINUE; END IF;

      _valor := ROUND(_base * _perc / 100, 2);

      INSERT INTO comissoes (
        contrato_id, loja_id, ambiente_id, usuario_id, papel_id,
        base_calculo, percentual, valor, status, gatilho, data_gatilho
      ) 
      SELECT 
        _amb.contrato_id, _amb.loja_id, _ambiente_id, _usuario_id, papel_comissao_id,
        _base, _perc, _valor, 'liberada', _gatilho, now()
      FROM usuarios WHERE id = _usuario_id;
    END IF;
  END LOOP;
END;
$$;