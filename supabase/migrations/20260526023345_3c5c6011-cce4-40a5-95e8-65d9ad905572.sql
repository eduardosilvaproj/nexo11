-- =========================================================
-- MIGRATION: Unificar cadastro de pessoas
-- Cria tabela `pessoas` como fonte única de dados pessoais,
-- unificando `usuarios` (com login) e `tecnicos_montadores` (sem login).
-- =========================================================

-- 1. Criar tabela pessoas
CREATE TABLE public.pessoas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  nome text NOT NULL,
  email text,
  telefone text,
  funcoes text[] NOT NULL DEFAULT '{}',
  funcoes_app_habilitadas text[] DEFAULT '{}',
  percentual_padrao numeric NOT NULL DEFAULT 0,
  papel_comissao_id uuid REFERENCES public.papeis_comissao(id) ON DELETE SET NULL,
  comissao_percentual numeric,
  ativo boolean NOT NULL DEFAULT true,
  loja_id uuid REFERENCES public.lojas(id) ON DELETE SET NULL,
  tipo text NOT NULL DEFAULT 'colaborador',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger updated_at
CREATE TRIGGER trg_pessoas_updated BEFORE UPDATE ON public.pessoas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Migrar dados de usuarios (colaboradores com login)
INSERT INTO public.pessoas (id, auth_user_id, nome, email, funcoes, funcoes_app_habilitadas, papel_comissao_id, comissao_percentual, loja_id, tipo, created_at, updated_at)
SELECT
  id,
  id,
  nome,
  email,
  COALESCE(funcoes, '{}'),
  COALESCE(funcoes_app_habilitadas, '{}'),
  papel_comissao_id,
  comissao_percentual,
  loja_id,
  'colaborador',
  created_at,
  updated_at
FROM public.usuarios;

-- 3. Migrar dados de tecnicos_montadores (prestadores sem login)
INSERT INTO public.pessoas (id, nome, email, telefone, funcoes, percentual_padrao, ativo, loja_id, tipo, created_at, updated_at)
SELECT
  id,
  nome,
  email,
  telefone,
  funcoes,
  percentual_padrao,
  ativo,
  loja_id,
  'prestador',
  created_at,
  updated_at
FROM public.tecnicos_montadores
WHERE id NOT IN (SELECT id FROM public.pessoas);

-- 4. Redirecionar FKs de contrato_ambientes
ALTER TABLE public.contrato_ambientes DROP CONSTRAINT IF EXISTS contrato_ambientes_montador_id_fkey;
ALTER TABLE public.contrato_ambientes DROP CONSTRAINT IF EXISTS contrato_ambientes_medidor_id_fkey;
ALTER TABLE public.contrato_ambientes DROP CONSTRAINT IF EXISTS contrato_ambientes_conferente_id_fkey;

ALTER TABLE public.contrato_ambientes
  ADD CONSTRAINT contrato_ambientes_montador_id_fkey FOREIGN KEY (montador_id) REFERENCES public.pessoas(id) ON DELETE SET NULL,
  ADD CONSTRAINT contrato_ambientes_medidor_id_fkey FOREIGN KEY (medidor_id) REFERENCES public.pessoas(id) ON DELETE SET NULL,
  ADD CONSTRAINT contrato_ambientes_conferente_id_fkey FOREIGN KEY (conferente_id) REFERENCES public.pessoas(id) ON DELETE SET NULL;

-- 5. RLS
ALTER TABLE public.pessoas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pessoas visiveis pela loja"
ON public.pessoas FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'franqueador'::app_role)
  OR (
    loja_id = current_loja_id()
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
      OR has_role(auth.uid(), 'tecnico'::app_role)
      OR has_role(auth.uid(), 'montador'::app_role)
      OR has_role(auth.uid(), 'vendedor'::app_role)
      OR auth.uid() = auth_user_id
    )
  )
);

CREATE POLICY "Pessoas insert por admin/gerente"
ON public.pessoas FOR INSERT TO authenticated
WITH CHECK (
  loja_id = current_loja_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
);

CREATE POLICY "Pessoas update por admin/gerente"
ON public.pessoas FOR UPDATE TO authenticated
USING (
  loja_id = current_loja_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
)
WITH CHECK (
  loja_id = current_loja_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
);

CREATE POLICY "Pessoas delete por admin"
ON public.pessoas FOR DELETE TO authenticated
USING (
  loja_id = current_loja_id()
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- 6. Índices úteis
CREATE INDEX idx_pessoas_loja_id ON public.pessoas(loja_id);
CREATE INDEX idx_pessoas_auth_user_id ON public.pessoas(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX idx_pessoas_funcoes ON public.pessoas USING gin(funcoes);
CREATE INDEX idx_pessoas_tipo ON public.pessoas(tipo);
