-- Atualizar limite diário para piloto ampliado na Matriz Principal
UPDATE public.communication_settings
SET limite_diario = 10,
    updated_at = now()
WHERE loja_id = '071b6cfd-8138-4baf-b33a-94a903c321ef';

-- Garantir que automações de agendamento não enviem para status cancelado (refinamento de regra)
UPDATE public.automacao_regras
SET condicoes = condicoes || '{"status_agendamento_not": "cancelado"}'::jsonb
WHERE loja_id = '071b6cfd-8138-4baf-b33a-94a903c321ef' 
AND nome = 'Entrega/Montagem Agendada Piloto';