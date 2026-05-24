-- Remover o índice único global que está travando a criação de novas matrizes
DROP INDEX IF EXISTS public.uq_lojas_matriz_unica;
