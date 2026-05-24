# Relatório de Ativação: NPS Pós-Montagem (Matriz Principal)

## 1. Monitoramento Link do Portal (Status: ESTÁVEL)
- **Envios Criados**: 3 (2 via automação anterior, 1 teste pendente)
- **Sucesso de Entrega**: 100% nos providers configurados.
- **Duplicidades**: 0.
- **Acessos**: Links dinâmicos validados.
- **Conclusão**: Sistema pronto para escalonamento da próxima automação.

## 2. Preparação NPS Pós-Montagem
- **Gatilho Selecionado**: `montagem_concluida`.
- **Loja Ativa**: Matriz Principal (ID: 071b6cfd-8138-4baf-b33a-94a903c321ef).
- **Canais**: WhatsApp (Preferencial) / E-mail.
- **Trava de Segurança**: Bloqueio de reenvio para o mesmo contrato em menos de 30 dias.

## 3. Plano de Teste Interno
- **Contrato Piloto**: `d5c26f18-7e0a-4541-9227-4693fc50f64d`.
- **Ação**: Executar `SELECT debug_trigger_nps_pilot();` via SQL.
- **Verificação**:
  - [ ] Registro em `cliente_comunicacoes` (tipo: pesquisa_nps).
  - [ ] Registro em `communication_outbox` (status: pendente).
  - [ ] Criação de registro em `cliente_pesquisas` (etapa: pos_montagem).
  - [ ] Validação do link de NPS único no payload.

## 4. Guardrails Operacionais
- Limite diário mantido em **5 envios total** para a loja.
- Horário restrito: **09h às 18h**.
- Opt-out verificado na camada do `automationService`.

**Recomendação**: Iniciar disparos reais para clientes com montagem concluída a partir de amanhã, monitorando detratores imediatamente.
