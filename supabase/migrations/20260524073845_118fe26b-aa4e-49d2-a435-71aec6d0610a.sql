-- Add dry_run to settings
ALTER TABLE public.communication_settings ADD COLUMN IF NOT EXISTS dry_run BOOLEAN DEFAULT true;

-- Add dry_run and metadata to outbox
ALTER TABLE public.communication_outbox ADD COLUMN IF NOT EXISTS dry_run BOOLEAN DEFAULT false;
ALTER TABLE public.communication_outbox ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Function to check daily limit and hours
CREATE OR REPLACE FUNCTION public.check_communication_quota(
    p_loja_id UUID,
    p_canal TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_settings RECORD;
    v_count INTEGER;
    v_now_time TIME;
BEGIN
    -- Get settings for the store/channel
    SELECT * INTO v_settings 
    FROM public.communication_settings 
    WHERE loja_id = p_loja_id AND canal = p_canal AND ativo = true;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Check hours if configured
    v_now_time := current_time::TIME;
    IF v_settings.horario_inicio IS NOT NULL AND v_settings.horario_fim IS NOT NULL THEN
        IF v_settings.horario_inicio < v_settings.horario_fim THEN
            IF NOT (v_now_time >= v_settings.horario_inicio AND v_now_time <= v_settings.horario_fim) THEN
                RETURN FALSE;
            END IF;
        ELSE
            -- Case for hours crossing midnight (e.g., 22:00 to 06:00)
            IF NOT (v_now_time >= v_settings.horario_inicio OR v_now_time <= v_settings.horario_fim) THEN
                RETURN FALSE;
            END IF;
        END IF;
    END IF;

    -- Check daily limit if configured
    IF v_settings.limite_diario IS NOT NULL THEN
        SELECT count(*) INTO v_count
        FROM public.communication_outbox
        WHERE loja_id = p_loja_id 
          AND canal = p_canal 
          AND status IN ('enviado', 'entregue', 'lido')
          AND dry_run = false
          AND created_at >= current_date;

        IF v_count >= v_settings.limite_diario THEN
            RETURN FALSE;
        END IF;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
