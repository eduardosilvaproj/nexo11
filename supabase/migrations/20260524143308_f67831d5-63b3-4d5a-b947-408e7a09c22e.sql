-- Função genérica para disparar o motor de automações a partir de eventos de contrato
CREATE OR REPLACE FUNCTION public.trigger_automation_on_event()
RETURNS TRIGGER AS $$
DECLARE
  v_cliente_id UUID;
  v_cliente_contato TEXT;
  v_cliente_email TEXT;
  v_cliente_whatsapp TEXT;
  v_regra RECORD;
  v_exec_id UUID;
BEGIN
  -- Tentar capturar cliente_id se não estiver no metadata
  IF NEW.metadata->>'cliente_id' IS NULL THEN
    SELECT cliente_id INTO v_cliente_id FROM contratos WHERE id = NEW.contrato_id;
  ELSE
    v_cliente_id := (NEW.metadata->>'cliente_id')::UUID;
  END IF;

  -- Buscar dados de contato do cliente para enriquecer a execução
  SELECT 
    nome, 
    email, 
    COALESCE(celular, telefone) 
  INTO 
    v_cliente_contato, v_cliente_email, v_cliente_whatsapp
  FROM clientes 
  WHERE id = v_cliente_id;

  -- Registrar execução para cada regra ativa que coincida com o gatilho e loja
  FOR v_regra IN 
    SELECT * FROM automacao_regras 
    WHERE gatilho = NEW.tipo 
    AND loja_id = NEW.loja_id 
    AND ativo = true
  LOOP
    -- Verificar duplicidade se a regra tiver a trava configurada (ex: NPS)
    IF v_regra.condicoes->>'trava_duplicidade_dias' IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM automacao_execucoes 
        WHERE regra_id = v_regra.id 
        AND entidade_id = NEW.contrato_id::text
        AND created_at > now() - (v_regra.condicoes->>'trava_duplicidade_dias' || ' days')::interval
      ) THEN
        CONTINUE; -- Pula se já executou recentemente
      END IF;
    END IF;

    INSERT INTO automacao_execucoes (
      loja_id, 
      regra_id, 
      gatilho, 
      entidade_tipo, 
      entidade_id, 
      status, 
      resultado
    )
    VALUES (
      NEW.loja_id,
      v_regra.id,
      NEW.tipo,
      'contrato',
      NEW.contrato_id::text,
      'pendente',
      jsonb_build_object(
        'event_id', NEW.id,
        'cliente_id', v_cliente_id,
        'cliente_contato', v_cliente_contato,
        'cliente_email', v_cliente_email,
        'cliente_whatsapp', v_cliente_whatsapp,
        'metadata', NEW.metadata
      )
    )
    RETURNING id INTO v_exec_id;
    
    -- Nota: O processamento real da ação será feito via cron ou edge function 
    -- que monitora 'automacao_execucoes' com status 'pendente'.
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger à tabela contrato_eventos
DROP TRIGGER IF EXISTS trg_automation_on_event ON contrato_eventos;
CREATE TRIGGER trg_automation_on_event
AFTER INSERT ON contrato_eventos
FOR EACH ROW
EXECUTE FUNCTION public.trigger_automation_on_event();
