# Runbook Operacional: Comunicação Oficial NEXO

## 1. Visão Geral
O NEXO utiliza uma Central de Envios (Outbox) para gerenciar comunicações via E-mail Transacional (Resend) e WhatsApp Business API (Meta). Todas as mensagens são enfileiradas na tabela `communication_outbox` e processadas pela Edge Function `process-outbox`.

## 2. Fluxo de Envio
1. **Geração**: Automações ou ações manuais criam registros na `communication_outbox` com status `pendente`.
2. **Processamento**: A função `process-outbox` verifica quota, horário, opt-in e envia ao provider.
3. **Webhooks**: Os providers notificam a Edge Function `communication-webhook` sobre entregas e leituras.

## 3. Modo Dry Run
- Quando ativado nas configurações da loja, as mensagens são geradas e marcadas como enviadas, mas nenhum e-mail ou WhatsApp real é disparado.
- Útil para homologação de novos fluxos de automação.

## 4. Ativação de Provider por Loja
1. Acesse a Central de Comunicação > Canais & Configurações.
2. Configure as API Keys (serão mascaradas após salvar).
3. Ative primeiro em **Dry Run**.
4. Use o botão **Enviar Teste** para validar a integração.
5. Verifique se o status na fila muda para "Enviado" (ou "Falhou" com erro descritivo).
6. Desative o Dry Run para liberar envios reais.

## 5. Resolução de Falhas
- **Status Falhou**: Verifique a coluna "Erro" na fila de envios.
- **Reprocessar**: Clique no ícone de "Refresh" na mensagem falhada para tentar novamente.
- **Quota Atingida**: Aumente o limite diário nas configurações da loja ou aguarde o dia seguinte.
- **Fora do Horário**: A mensagem ficará pendente até o próximo horário permitido.

## 6. Cancelamento e Rollback
- Para interromper envios em massa, desative o canal nas configurações ou mude para Dry Run.
- Mensagens pendentes podem ser canceladas individualmente na fila.

## 7. Monitoramento e Alertas
- **Stuck Queue**: Mensagens em "processando" há muito tempo indicam falha na função.
- **High Failure Rate**: Mais de 20% de falha em 1h gera alerta crítico.
- **Webhook Silence**: Se nenhum status for atualizado em 24h, verifique as configurações do webhook no painel do provider.
