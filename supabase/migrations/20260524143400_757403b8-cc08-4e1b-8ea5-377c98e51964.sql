-- Alterar tipo da coluna para TEXT para máxima compatibilidade
ALTER TABLE public.automacao_execucoes ALTER COLUMN entidade_id TYPE TEXT;

-- Atualizar o trigger com a lógica simplificada (TEXT = TEXT)
CREATE OR REPLACE FUNCTION public.trigger_automation_on_event()
RETURNS TRIGGER AS $$
DECLARE
  v_cliente_id UUID;
  v_cliente_contato TEXT;
  v_cliente_email TEXT;
  v_cliente_whatsapp TEXT;
  v_regra RECORD;
  v_exec_id UUID;
  v_entidade_id_text TEXT;
BEGIN
  v_entidade_id_text := NEW.contrato_id::TEXT;

  -- Tentar capturar cliente_id
  IF NEW.metadata->>'cliente_id' IS NULL THEN
    SELECT cliente_id INTO v_cliente_id FROM contratos WHERE id = NEW.contrato_id;
  ELSE
    v_cliente_id := (NEW.metadata->>'cliente_id')::UUID;
  END IF;

  -- Buscar dados de contato
  SELECT nome, email, COALESCE(celular, telefone) 
  INTO v_cliente_contato, v_cliente_email, v_cliente_whatsapp
  FROM clientes WHERE id = v_cliente_id;

  -- Registrar execução
  FOR v_regra IN 
    SELECT * FROM automacao_regras 
    WHERE gatilho = NEW.tipo AND loja_id = NEW.loja_id AND ativo = true
  LOOP
    -- Trava de duplicidade
    IF v_regra.condicoes->>'trava_duplicidade_dias' IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM automacao_execucoes 
        WHERE regra_id = v_regra.id 
        AND entidade_id = v_entidade_id_text
        AND created_at > (now() - ( (v_regra.condicoes->>'trava_duplicidade_dias')::INTEGER * interval '1 day' ))
      ) THEN
        CONTINUE;
      END IF;
    END IF;

    INSERT INTO automacao_execucoes (
      loja_id, regra_id, gatilho, entidade_tipo, entidade_id, status, resultado
    )
    VALUES (
      NEW.loja_id,
      v_regra.id,
      NEW.tipo,
      'contrato',
      v_entidade_id_text,
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
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
