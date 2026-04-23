ALTER TABLE public.contratos ADD COLUMN projetista_id UUID REFERENCES public.usuarios(id);
ALTER TABLE public.orcamentos ADD COLUMN projetista_id UUID REFERENCES public.usuarios(id);