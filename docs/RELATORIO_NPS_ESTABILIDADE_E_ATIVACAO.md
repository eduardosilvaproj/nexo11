# Relatório de Estabilidade e Ativação NPS - Matriz Principal

## 1. Monitoramento NPS Pós-Montagem
- **Status Operacional**: Estável.
- **Automação**: `NPS Pós-Montagem Piloto` ativa.
- **Execuções**: 1 execução processada com sucesso (Gatilho: `montagem_concluida`).
- **Comunicação**: Outbox gerado corretamente para WhatsApp/Email.
- **Falhas/Duplicidades**: 0 detectadas.
- **Opt-out**: Respeitado via filtros nativos do motor.

## 2. Validação de Integridade
- **Banco de Dados**: Tabelas `cliente_pesquisas` e `portal_tokens` integradas.
- **Histórico**: Registro automático em `contrato_eventos` validado.
- **Alertas**: Alerta de estabilidade registrado em `communication_alerts`.

## 3. Alerta de Detrator
- **Mecanismo**: Trigger `trg_log_nps` configurado para monitorar notas < 7.
- **Ação**: Criação de alerta interno e destaque no contrato.

## 4. Nova Automação: NPS Pós-Pós-Venda
- **Status**: **ATIVADA EM PILOTO**.
- **Gatilho**: Resolução de chamado (`status = 'resolvido'`).
- **Guardrails**: 
  - Trava de duplicidade: 60 dias.
  - Validação de NPS recente.
  - Respeito a horário (09h-18h) e limite (5/dia).

## Recomendação
Avançar para monitoramento assistido da nova automação NPS Pós-Pós-Venda por 72h.
