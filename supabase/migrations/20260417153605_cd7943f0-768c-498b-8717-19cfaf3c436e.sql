-- 1) Tabela
CREATE TABLE IF NOT EXISTS public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contrato_id uuid,
  tipo text NOT NULL,
  mensagem text NOT NULL,
  link text,
  lida_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_user_unread
  ON public.notificacoes (user_id, created_at DESC)
  WHERE lida_em IS NULL;

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- 2) RLS: usuário só vê e marca como lida as próprias; INSERT só por funções SECURITY DEFINER (sem policy)
DROP POLICY IF EXISTS "Notificacoes: ver as proprias" ON public.notificacoes;
CREATE POLICY "Notificacoes: ver as proprias"
ON public.notificacoes FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Notificacoes: marcar como lida" ON public.notificacoes;
CREATE POLICY "Notificacoes: marcar como lida"
ON public.notificacoes FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 3) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;

-- 4) Trigger: contrato chega em "tecnico" -> notifica todos os técnicos da loja
CREATE OR REPLACE FUNCTION public.trg_notif_contrato_tecnico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  numero text;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status = 'tecnico'::contrato_status
     AND OLD.status IS DISTINCT FROM NEW.status THEN

    numero := '#' || lpad(substring(NEW.id::text, 1, 4), 4, '0');

    INSERT INTO public.notificacoes (user_id, contrato_id, tipo, mensagem, link)
    SELECT
      ur.user_id,
      NEW.id,
      'contrato_tecnico',
      format('Contrato %s (%s) aguarda validação técnica', numero, NEW.cliente_nome),
      '/contratos/' || NEW.id
    FROM public.user_roles ur
    JOIN public.usuarios u ON u.id = ur.user_id
    WHERE ur.role = 'tecnico'::app_role
      AND u.loja_id = NEW.loja_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contrato_notif_tecnico ON public.contratos;
CREATE TRIGGER contrato_notif_tecnico
AFTER UPDATE ON public.contratos
FOR EACH ROW EXECUTE FUNCTION public.trg_notif_contrato_tecnico();

-- 5) Trigger: checklist técnico 100% concluído -> notifica vendedor responsável
CREATE OR REPLACE FUNCTION public.trg_notif_checklist_completo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total int;
  pendentes int;
  c record;
  numero text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.concluido = true AND OLD.concluido = false THEN
    SELECT count(*), count(*) FILTER (WHERE NOT concluido)
      INTO total, pendentes
      FROM public.checklists_tecnicos
     WHERE contrato_id = NEW.contrato_id;

    IF total > 0 AND pendentes = 0 THEN
      SELECT id, cliente_nome, vendedor_id
        INTO c
        FROM public.contratos
       WHERE id = NEW.contrato_id;

      IF c.vendedor_id IS NOT NULL THEN
        numero := '#' || lpad(substring(c.id::text, 1, 4), 4, '0');
        INSERT INTO public.notificacoes (user_id, contrato_id, tipo, mensagem, link)
        VALUES (
          c.vendedor_id,
          c.id,
          'checklist_completo',
          format('Contrato %s liberado para produção ✓', numero),
          '/contratos/' || c.id
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS checklist_notif_completo ON public.checklists_tecnicos;
CREATE TRIGGER checklist_notif_completo
AFTER UPDATE ON public.checklists_tecnicos
FOR EACH ROW EXECUTE FUNCTION public.trg_notif_checklist_completo();