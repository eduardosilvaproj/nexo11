ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS papel_comissao_id uuid NULL REFERENCES public.papeis_comissao(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS comissao_percentual numeric(6,3) NULL;

CREATE INDEX IF NOT EXISTS idx_usuarios_papel_comissao ON public.usuarios(papel_comissao_id);