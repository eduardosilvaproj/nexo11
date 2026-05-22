-- 1. Adicionar campo resumo_modulo na tabela acompanhamento_modulos
ALTER TABLE public.acompanhamento_modulos
ADD COLUMN IF NOT EXISTS resumo_modulo text;

-- 2. Criar tabela acompanhamento_acessos
CREATE TABLE IF NOT EXISTS public.acompanhamento_acessos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    serial text NOT NULL UNIQUE,
    nome_cliente text,
    ativo boolean NOT NULL DEFAULT true,
    expira_em timestamptz,
    ultimo_acesso_em timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS na nova tabela
ALTER TABLE public.acompanhamento_acessos ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de RLS para acompanhamento_acessos (apenas admin)
CREATE POLICY "Admin total access on acompanhamento_acessos"
ON public.acompanhamento_acessos
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role::text IN ('admin', 'admin_master')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role::text IN ('admin', 'admin_master')
    )
);

-- 4. Função RPC para validar acesso (Segura)
CREATE OR REPLACE FUNCTION public.validar_acesso_acompanhamento(p_serial text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Roda com privilégios do criador para acessar a tabela sem RLS público
SET search_path = public
AS $$
DECLARE
    v_acesso record;
BEGIN
    SELECT * INTO v_acesso
    FROM acompanhamento_acessos
    WHERE serial = p_serial;

    IF v_acesso.id IS NULL THEN
        RETURN jsonb_build_object('valido', false, 'mensagem', 'Código de acesso não encontrado.');
    END IF;

    IF NOT v_acesso.ativo THEN
        RETURN jsonb_build_object('valido', false, 'mensagem', 'Este código de acesso está inativo.');
    END IF;

    IF v_acesso.expira_em IS NOT NULL AND v_acesso.expira_em < now() THEN
        RETURN jsonb_build_object('valido', false, 'mensagem', 'Este código de acesso expirou.');
    END IF;

    -- Atualiza último acesso
    UPDATE acompanhamento_acessos
    SET ultimo_acesso_em = now()
    WHERE id = v_acesso.id;

    RETURN jsonb_build_object(
        'valido', true,
        'nome_cliente', v_acesso.nome_cliente,
        'mensagem', 'Acesso validado com sucesso.'
    );
END;
$$;

-- 5. Função RPC para buscar dados públicos (Segura)
CREATE OR REPLACE FUNCTION public.get_acompanhamento_publico(p_serial text)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_valido boolean;
BEGIN
    -- Verifica validade do serial novamente por segurança
    SELECT (validar_acesso_acompanhamento(p_serial)->>'valido')::boolean INTO v_valido;

    IF NOT v_valido THEN
        RETURN;
    END IF;

    -- Retorna apenas campos permitidos
    RETURN QUERY
    SELECT jsonb_build_object(
        'id', m.id,
        'nome', m.nome,
        'area', m.area,
        'resumo_modulo', m.resumo_modulo,
        'status', m.status,
        'percentual', m.percentual,
        'funcionalidades_json', m.funcionalidades_json,
        'processos_json', m.processos_json,
        'ok_items_json', m.ok_items_json,
        'revisar_items_json', m.revisar_items_json,
        'proximos_passos_json', m.proximos_passos_json,
        'print_url', m.print_url,
        'aprovado', m.aprovado,
        'aprovado_em', m.aprovado_em
    )
    FROM acompanhamento_modulos m
    ORDER BY m.ordem ASC;
END;
$$;

-- 6. Seed inicial
INSERT INTO public.acompanhamento_acessos (serial, nome_cliente, ativo)
VALUES ('NEXO-CLIENTE-2026-8XK2', 'Cliente Demonstração', true)
ON CONFLICT (serial) DO NOTHING;

-- Atualizar módulos existentes com resumo básico (Exemplo)
UPDATE public.acompanhamento_modulos
SET resumo_modulo = 'Módulo responsável pela gestão geral do sistema e visualização de indicadores principais.'
WHERE nome ILIKE '%Dashboard%' OR nome ILIKE '%Início%';

UPDATE public.acompanhamento_modulos
SET resumo_modulo = 'Módulo para controle de vendas, orçamentos e funil comercial.'
WHERE nome ILIKE '%Comercial%';
