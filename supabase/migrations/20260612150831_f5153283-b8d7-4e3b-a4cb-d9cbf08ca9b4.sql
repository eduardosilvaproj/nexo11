DROP TABLE IF EXISTS public.backup_producao_terceirizada_full;
CREATE TABLE public.backup_producao_terceirizada_full AS SELECT * FROM public.producao_terceirizada;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.backup_producao_terceirizada_full TO authenticated;
GRANT ALL ON public.backup_producao_terceirizada_full TO service_role;
ALTER TABLE public.backup_producao_terceirizada_full ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_master full access backup_prod_terc" ON public.backup_producao_terceirizada_full FOR ALL TO authenticated USING (public.is_admin_master()) WITH CHECK (public.is_admin_master());

TRUNCATE TABLE public.producao_terceirizada RESTART IDENTITY CASCADE;