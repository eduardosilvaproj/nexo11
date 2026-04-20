
DO $$
DECLARE
  loja uuid := '84343b1b-091e-4184-a1d8-b68ae18ec27a';
  uid_maria uuid;
  uid_joao  uuid;
  uid_ana   uuid;
BEGIN
  -- Maria
  SELECT id INTO uid_maria FROM auth.users WHERE email = 'maria.op@nexo.com';
  IF uid_maria IS NULL THEN
    uid_maria := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (uid_maria, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'maria.op@nexo.com', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('nome','Maria Operacional'), now(), now());
  END IF;

  -- João
  SELECT id INTO uid_joao FROM auth.users WHERE email = 'joao.mont@nexo.com';
  IF uid_joao IS NULL THEN
    uid_joao := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (uid_joao, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'joao.mont@nexo.com', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('nome','João Montagem'), now(), now());
  END IF;

  -- Ana
  SELECT id INTO uid_ana FROM auth.users WHERE email = 'ana.com@nexo.com';
  IF uid_ana IS NULL THEN
    uid_ana := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (uid_ana, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ana.com@nexo.com', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('nome','Ana Comercial'), now(), now());
  END IF;

  -- public.usuarios (trigger pode ter criado a linha; upsert garante loja/papel/%)
  INSERT INTO public.usuarios (id, loja_id, nome, email, papel_comissao_id, comissao_percentual) VALUES
    (uid_maria, loja, 'Maria Operacional', 'maria.op@nexo.com', '1311c13e-4e68-4b48-8f78-c2488cdc9e2d', 1.5),
    (uid_joao,  loja, 'João Montagem',     'joao.mont@nexo.com','e360b281-ccd1-4b29-8e15-fb5f95421e3f', 1.5),
    (uid_ana,   loja, 'Ana Comercial',     'ana.com@nexo.com',  '38817db6-a42b-426c-abf4-b458639fbbe2', 1.0)
  ON CONFLICT (id) DO UPDATE SET
    loja_id = EXCLUDED.loja_id,
    nome = EXCLUDED.nome,
    papel_comissao_id = EXCLUDED.papel_comissao_id,
    comissao_percentual = EXCLUDED.comissao_percentual;
END $$;
