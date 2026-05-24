-- Add last_webhook_at to monitor health
ALTER TABLE public.communication_settings ADD COLUMN IF NOT EXISTS last_webhook_at TIMESTAMP WITH TIME ZONE;

-- Create alerts table
CREATE TABLE IF NOT EXISTS public.communication_alerts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    loja_id UUID REFERENCES public.lojas(id) ON DELETE CASCADE,
    canal TEXT NOT NULL,
    tipo TEXT NOT NULL, -- 'auth_error', 'high_failure_rate', 'stuck_queue', 'limit_reached', 'webhook_silence'
    severidade TEXT NOT NULL DEFAULT 'warning', -- 'info', 'warning', 'critical'
    mensagem TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    resolvido BOOLEAN DEFAULT false,
    resolvido_em TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on alerts
ALTER TABLE public.communication_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View alerts by store" ON public.communication_alerts
    FOR SELECT TO authenticated
    USING (loja_id IN (SELECT u.loja_id FROM usuarios u WHERE u.id = auth.uid()) OR has_role(auth.uid(), 'franqueador'));

-- View for settings with masked secrets
CREATE OR REPLACE VIEW public.v_communication_settings AS
SELECT 
    id,
    loja_id,
    canal,
    provider,
    ativo,
    remetente,
    horario_inicio,
    horario_fim,
    limite_diario,
    dry_run,
    last_webhook_at,
    created_at,
    updated_at,
    -- Mask sensitive data in configuracao
    (
        SELECT jsonb_object_agg(key, 
            CASE 
                WHEN key ILIKE '%key%' OR key ILIKE '%secret%' OR key ILIKE '%token%' THEN 
                    to_jsonb(
                        CASE 
                            WHEN length(value#>>'{}') > 10 THEN '***' || right(value#>>'{}', 4)
                            ELSE '********'
                        END
                    )
                ELSE value 
            END
        )
        FROM jsonb_each(configuracao)
    ) as configuracao_masked
FROM public.communication_settings;

-- View for Communication Metrics
CREATE OR REPLACE VIEW public.v_communication_metrics AS
WITH daily_stats AS (
    SELECT 
        loja_id,
        canal,
        status,
        count(*) as total,
        avg(CASE WHEN processado_em IS NOT NULL AND created_at IS NOT NULL THEN EXTRACT(EPOCH FROM (processado_em - created_at)) END) as avg_process_time,
        avg(CASE WHEN entregue_em IS NOT NULL AND enviado_em IS NOT NULL THEN EXTRACT(EPOCH FROM (entregue_em - enviado_em)) END) as avg_delivery_time
    FROM public.communication_outbox
    WHERE created_at > now() - interval '24 hours'
    GROUP BY loja_id, canal, status
)
SELECT 
    loja_id,
    canal,
    COALESCE(SUM(total) FILTER (WHERE status = 'pendente'), 0) as pendentes,
    COALESCE(SUM(total) FILTER (WHERE status = 'enviado'), 0) as enviados,
    COALESCE(SUM(total) FILTER (WHERE status = 'falhou'), 0) as falhas,
    COALESCE(SUM(total) FILTER (WHERE status = 'ignorado'), 0) as opt_outs,
    COALESCE(SUM(total) FILTER (WHERE status = 'entregue'), 0) as entregues,
    AVG(avg_process_time) as tempo_medio_processamento,
    AVG(avg_delivery_time) as tempo_medio_entrega
FROM daily_stats
GROUP BY loja_id, canal;

-- Grant access to views
GRANT SELECT ON public.v_communication_settings TO authenticated;
GRANT SELECT ON public.v_communication_metrics TO authenticated;

-- Function to check for communication anomalies
CREATE OR REPLACE FUNCTION public.check_communication_anomalies()
RETURNS void AS $$
DECLARE
    r RECORD;
BEGIN
    -- 1. Detect stuck messages (processando for more than 15 mins)
    INSERT INTO public.communication_alerts (loja_id, canal, tipo, severidade, mensagem)
    SELECT DISTINCT loja_id, canal, 'stuck_queue', 'critical', 'Existem mensagens presas no status processando há mais de 15 minutos.'
    FROM public.communication_outbox
    WHERE status = 'processando' AND updated_at < now() - interval '15 minutes'
    ON CONFLICT (id) DO NOTHING; -- No unique constraint here besides id, but the logic should prevent duplicates if called frequently

    -- 2. Detect high failure rate (more than 20% in last hour, min 10 msgs)
    FOR r IN (
        SELECT loja_id, canal, 
               count(*) as total,
               count(*) FILTER (WHERE status = 'falhou') as falhas
        FROM public.communication_outbox
        WHERE created_at > now() - interval '1 hour'
        GROUP BY loja_id, canal
        HAVING count(*) >= 10 AND (count(*) FILTER (WHERE status = 'falhou')::float / count(*)) > 0.2
    ) LOOP
        INSERT INTO public.communication_alerts (loja_id, canal, tipo, severidade, mensagem, metadata)
        VALUES (r.loja_id, r.canal, 'high_failure_rate', 'critical', 'Taxa de falha elevada detectada ( > 20% ).', jsonb_build_object('total', r.total, 'falhas', r.falhas));
    END LOOP;

    -- 3. Webhook silence (if active and last_webhook_at > 24h)
    INSERT INTO public.communication_alerts (loja_id, canal, tipo, severidade, mensagem)
    SELECT loja_id, canal, 'webhook_silence', 'warning', 'Nenhum evento de webhook recebido nas últimas 24 horas.'
    FROM public.communication_settings
    WHERE ativo = true AND (last_webhook_at IS NULL OR last_webhook_at < now() - interval '24 hours');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
