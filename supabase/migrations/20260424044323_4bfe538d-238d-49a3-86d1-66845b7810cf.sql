-- Alterar o tipo da coluna assinatura_hash de uuid para text (se necessário)
-- Usamos USING para converter caso já existam dados ou se o tipo atual for incompatível diretamente
ALTER TABLE public.contratos ALTER COLUMN assinatura_hash TYPE text USING assinatura_hash::text;

-- Garantir os outros tipos solicitados (usando os nomes reais das colunas na tabela)
ALTER TABLE public.contratos ALTER COLUMN assinatura_nome TYPE text USING assinatura_nome::text;
ALTER TABLE public.contratos ALTER COLUMN assinatura_ip TYPE text USING assinatura_ip::text;
ALTER TABLE public.contratos ALTER COLUMN assinatura_user_agent TYPE text USING assinatura_user_agent::text;
ALTER TABLE public.contratos ALTER COLUMN data_assinatura TYPE timestamptz USING data_assinatura::timestamptz;
