# Checklist de Produção Assistida: Comunicação NEXO

## Fase 1: Configuração e Segurança
- [ ] API Keys configuradas via Painel (verificar mascaramento no frontend).
- [ ] RLS validado: Loja A não acessa envios da Loja B.
- [ ] Webhook configurado nos painéis do Resend e Meta (URL da Edge Function).
- [ ] Secrets (SERVICE_ROLE_KEY) seguros nas Edge Functions.

## Fase 2: Homologação Interna (Dry Run)
- [ ] Ativar canal em modo Dry Run.
- [ ] Disparar automação de teste (ex: Assinatura Pendente).
- [ ] Validar registro na outbox e histórico no contrato.
- [ ] Validar que nenhum envio real ocorreu.

## Fase 3: Teste Real Interno
- [ ] Enviar Teste Real para e-mail/WhatsApp da equipe interna.
- [ ] Validar recebimento da mensagem.
- [ ] Validar atualização de status para "Entregue" e "Lido" via Webhook.

## Fase 4: Piloto com Cliente Real (1-2 clientes)
- [ ] Ativar envio real para loja selecionada.
- [ ] Monitorar dashboard de métricas por 24h.
- [ ] Validar se o cliente recebeu e interagiu (Portal do Cliente).
- [ ] Verificar opt-out: Cliente que pediu descadastro não recebe mais automações.

## Fase 5: Liberação Gradual
- [ ] Ativar automações de forma faseada (NPS -> Documentos -> Pós-venda).
- [ ] Monitorar taxa de falha e alertas.
- [ ] Validar se os limites diários estão sendo respeitados.

## Critérios de Sucesso
- Taxa de falha < 2%.
- Tempo médio de entrega < 1 minuto.
- 100% das mensagens reais com histórico no contrato.
- Sem exposição de dados sensíveis em logs ou UI.
