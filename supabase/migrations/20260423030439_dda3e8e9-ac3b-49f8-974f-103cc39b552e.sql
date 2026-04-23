-- 1) Atualizar a função de geração de comissões para respeitar vendedor/projetista designados
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

  SELECT id, valor_venda, status, vendedor_id, projetista_id INTO _contrato
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
      AND p.tipo::text = ANY(_tipos_papel)
  LOOP
    -- Se o papel é comercial, verificar se é o usuário designado
    IF _membro.tipo = 'vendedor' AND _membro.usuario_id != _contrato.vendedor_id THEN
      CONTINUE;
    ELSIF _membro.tipo = 'projetista' AND _membro.usuario_id != _contrato.projetista_id THEN
      CONTINUE;
    ELSIF _membro.tipo = 'vendedor_projetista' THEN
      -- Só gera vendedor_projetista se for a mesma pessoa e for o designado
      IF _contrato.vendedor_id != _contrato.projetista_id OR _membro.usuario_id != _contrato.vendedor_id THEN
        CONTINUE;
      END IF;
    END IF;

    -- Evitar duplicados para o mesmo gatilho
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

-- 2) Criar gatilho para gerar comissões comerciais quando o contrato for assinado
CREATE OR REPLACE FUNCTION public.trg_comissao_contrato_assinado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _amb_id uuid;
  _tipos text[];
BEGIN
  -- Gatilho: Quando 'assinado' muda para true
  IF NEW.assinado = true AND (OLD.assinado IS NULL OR OLD.assinado = false) THEN
    
    -- Definir quais papéis gerar com base na atribuição
    IF NEW.vendedor_id = NEW.projetista_id THEN
      _tipos := ARRAY['vendedor_projetista', 'gerente_comercial'];
    ELSE
      _tipos := ARRAY['vendedor', 'projetista', 'gerente_comercial'];
    END IF;

    -- Gerar para todos os ambientes do contrato
    FOR _amb_id IN SELECT id FROM contrato_ambientes WHERE contrato_id = NEW.id LOOP
      PERFORM public.gerar_comissoes_ambiente(_amb_id, 'contrato_assinado', _tipos);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comissao_contrato_assinado ON public.contratos;
CREATE TRIGGER trg_comissao_contrato_assinado
AFTER UPDATE ON public.contratos
FOR EACH ROW
EXECUTE FUNCTION public.trg_comissao_contrato_assinado();