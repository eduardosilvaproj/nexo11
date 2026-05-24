-- 1. Fix the audit log trigger function with correct column names
CREATE OR REPLACE FUNCTION public.log_saas_action()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.saas_audit_logs (actor_user_id, acao, entidade, entidade_id, detalhes)
    VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id 
            ELSE NEW.id 
        END,
        jsonb_build_object(
            'old', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
            'new', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
        )
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Grant Platform Admin access to the specific user
INSERT INTO public.platform_user_roles (user_id, role)
SELECT 'f890bc47-04ac-49f1-a3c4-4c737b5524f3', 'platform_admin'
WHERE NOT EXISTS (
    SELECT 1 FROM public.platform_user_roles 
    WHERE user_id = 'f890bc47-04ac-49f1-a3c4-4c737b5524f3' AND role = 'platform_admin'
);

-- 3. Ensure standard admin and admin_master roles are set for store-level operations
INSERT INTO public.user_roles (user_id, role, loja_id)
SELECT 'f890bc47-04ac-49f1-a3c4-4c737b5524f3', 'admin', NULL
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = 'f890bc47-04ac-49f1-a3c4-4c737b5524f3' AND role = 'admin' AND loja_id IS NULL
);

INSERT INTO public.user_roles (user_id, role, loja_id)
SELECT 'f890bc47-04ac-49f1-a3c4-4c737b5524f3', 'admin_master', NULL
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = 'f890bc47-04ac-49f1-a3c4-4c737b5524f3' AND role = 'admin_master' AND loja_id IS NULL
);
