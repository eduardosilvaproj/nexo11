-- Tabela de histórico imutável
CREATE TABLE public.contrato_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  acao text NOT NULL, -- 'status_avancado','checklist_completo','retrabalho_registrado','producao_concluida','logistica_confirmada','nps_registrado','outro'
  titulo text NOT NULL,
  descricao text,
  autor_id uuid,
  autor_nome text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contrato_logs_contrato ON public.contrato_logs(contrato_id, created_at DESC);

ALTER TABLE public.contrato_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Logs visíveis por contrato"
  ON public.contrato_logs FOR SELECT TO authenticated
  USING (public.contrato_da_loja(contrato_id) OR public.has_role(auth.uid(), 'franqueador'::app_role));

CREATE POLICY "Logs inseridos pela loja"
  ON public.contrato_logs FOR INSERT TO authenticated
  WITH CHECK (public.contrato_da_loja(contrato_id));

-- Sem políticas de UPDATE/DELETE: histórico é imutável.

-- Função utilitária para inserir log com nome do autor
CREATE OR REPLACE FUNCTION public.contrato_log_inserir(
  _contrato_id uuid,
  _acao text,
  _titulo text,
  _descricao text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _nome text;
BEGIN
  IF _uid IS NOT NULL THEN
    SELECT nome INTO _nome FROM public.usuarios WHERE id = _uid;
  END IF;
  INSERT INTO public.contrato_logs (contrato_id, acao, titulo, descricao, autor_id, autor_nome)
  VALUES (_contrato_id, _acao, _titulo, _descricao, _uid, _nome);
END;
$$;

-- Trigger: status do contrato avançou
CREATE OR REPLACE FUNCTION public.trg_log_contrato_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.contrato_log_inserir(
      NEW.id,
      'status_avancado',
      'Status avançado',
      format('De "%s" para "%s"', OLD.status, NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER contratos_log_status
  AFTER UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.trg_log_contrato_status();

-- Trigger: checklist técnico concluído (item) e 100%
CREATE OR REPLACE FUNCTION public.trg_log_checklist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total int;
  pendentes int;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.concluido = true AND OLD.concluido = false THEN
    PERFORM public.contrato_log_inserir(
      NEW.contrato_id,
      'checklist_completo',
      'Item do checklist concluído',
      NEW.item
    );

    SELECT count(*), count(*) FILTER (WHERE NOT concluido)
      INTO total, pendentes
      FROM public.checklists_tecnicos
     WHERE contrato_id = NEW.contrato_id;

    IF total > 0 AND pendentes = 0 THEN
      PERFORM public.contrato_log_inserir(
        NEW.contrato_id,
        'checklist_completo',
        'Checklist técnico 100% concluído',
        format('%s itens concluídos', total)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER checklists_tecnicos_log
  AFTER UPDATE ON public.checklists_tecnicos
  FOR EACH ROW EXECUTE FUNCTION public.trg_log_checklist();

-- Trigger: retrabalho registrado
CREATE OR REPLACE FUNCTION public.trg_log_retrabalho()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.contrato_log_inserir(
      NEW.contrato_id,
      'retrabalho_registrado',
      'Retrabalho registrado',
      NEW.motivo
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER retrabalhos_log
  AFTER INSERT ON public.retrabalhos
  FOR EACH ROW EXECUTE FUNCTION public.trg_log_retrabalho();

-- Trigger: produção concluída
CREATE OR REPLACE FUNCTION public.trg_log_op()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'concluido' AND OLD.status IS DISTINCT FROM 'concluido' THEN
    PERFORM public.contrato_log_inserir(
      NEW.contrato_id,
      'producao_concluida',
      'Produção concluída',
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ordens_producao_log
  AFTER UPDATE ON public.ordens_producao
  FOR EACH ROW EXECUTE FUNCTION public.trg_log_op();

-- Trigger: logística confirmada
CREATE OR REPLACE FUNCTION public.trg_log_entrega()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'confirmada' AND OLD.status IS DISTINCT FROM 'confirmada' THEN
    PERFORM public.contrato_log_inserir(
      NEW.contrato_id,
      'logistica_confirmada',
      'Entrega confirmada',
      COALESCE(NEW.transportadora, NULL)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER entregas_log
  AFTER UPDATE ON public.entregas
  FOR EACH ROW EXECUTE FUNCTION public.trg_log_entrega();

-- Trigger: NPS registrado
CREATE OR REPLACE FUNCTION public.trg_log_nps()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.nps IS NOT NULL)
     OR (TG_OP = 'UPDATE' AND NEW.nps IS NOT NULL AND NEW.nps IS DISTINCT FROM OLD.nps) THEN
    PERFORM public.contrato_log_inserir(
      NEW.contrato_id,
      'nps_registrado',
      'NPS registrado',
      format('Nota %s', NEW.nps)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER chamados_log_nps
  AFTER INSERT OR UPDATE ON public.chamados_pos_venda
  FOR EACH ROW EXECUTE FUNCTION public.trg_log_nps();