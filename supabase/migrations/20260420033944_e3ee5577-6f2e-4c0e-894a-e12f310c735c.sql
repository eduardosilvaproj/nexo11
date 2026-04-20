-- Função genérica para gerar comissões por ambiente
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
BEGIN
  SELECT id, contrato_id, loja_id INTO _amb
  FROM contrato_ambientes WHERE id = _ambiente_id;
  IF _amb.id IS NULL THEN RETURN; END IF;

  SELECT id, valor_venda, status INTO _contrato
  FROM contratos WHERE id = _amb.contrato_id;
  IF _contrato.id IS NULL OR _contrato.status = 'cancelado' THEN RETURN; END IF;

  SELECT count(*) INTO _total_amb
  FROM contrato_ambientes WHERE contrato_id = _amb.contrato_id;
  IF _total_amb = 0 THEN RETURN; END IF;

  _base := COALESCE(_contrato.valor_venda, 0) / _total_amb;

  FOR _membro IN
    SELECT u.id AS usuario_id, u.papel_comissao_id, u.comissao_percentual, p.tipo
    FROM usuarios u
    JOIN papeis_comissao p ON p.id = u.papel_comissao_id
    WHERE u.loja_id = _amb.loja_id
      AND p.ativo = true
      AND p.tipo = ANY(_tipos_papel)
  LOOP
    -- evitar duplicados
    IF EXISTS (
      SELECT 1 FROM comissoes
      WHERE ambiente_id = _ambiente_id
        AND usuario_id = _membro.usuario_id
        AND gatilho = _gatilho
    ) THEN CONTINUE; END IF;

    _valor := ROUND(_base * COALESCE(_membro.comissao_percentual, 0) / 100, 2);

    INSERT INTO comissoes (
      contrato_id, loja_id, ambiente_id, usuario_id, papel_id,
      base_calculo, percentual, valor, status, gatilho, data_gatilho
    ) VALUES (
      _amb.contrato_id, _amb.loja_id, _ambiente_id, _membro.usuario_id, _membro.papel_comissao_id,
      _base, _membro.comissao_percentual, _valor, 'liberada', _gatilho, now()
    );
  END LOOP;
END;
$$;

-- Trigger: quando ambiente fica com medição OU conferência concluída → gerente_operacional
CREATE OR REPLACE FUNCTION public.trg_comissao_ambiente_tecnico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.status_medicao = 'concluido' AND OLD.status_medicao IS DISTINCT FROM 'concluido')
     OR (NEW.status_conferencia = 'concluido' AND OLD.status_conferencia IS DISTINCT FROM 'concluido') THEN
    PERFORM public.gerar_comissoes_ambiente(
      NEW.id,
      'ambiente_tecnico_concluido',
      ARRAY['gerente_operacional']
    );
  END IF;

  IF NEW.status_montagem = 'concluido' AND OLD.status_montagem IS DISTINCT FROM 'concluido' THEN
    PERFORM public.gerar_comissoes_ambiente(
      NEW.id,
      'ambiente_montagem_concluido',
      ARRAY['gerente_operacional','gerente_montagem']
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comissao_ambiente ON public.contrato_ambientes;
CREATE TRIGGER trg_comissao_ambiente
AFTER UPDATE ON public.contrato_ambientes
FOR EACH ROW
EXECUTE FUNCTION public.trg_comissao_ambiente_tecnico();