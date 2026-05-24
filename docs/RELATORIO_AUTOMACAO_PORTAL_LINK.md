# Relatório de Ativação: Automação Link do Portal (Matriz Principal)

## 1. Resumo da Saúde (Assinatura Pendente)
- **Envios Recentes**: 2 (E-mail e WhatsApp)
- **Sucessos**: 2
- **Falhas/Retries**: 0
- **Duplicidades**: Nenhuma detectada.
- **Opt-outs**: Respeitados.

## 2. Nova Automação: Link do Portal
- **Status**: Ativa (Somente Matriz Principal)
- **Gatilho**: Criação de contrato ou mudança para status 'tecnico'/'producao'.
- **Canal**: Inteligente (Prefere e-mail, fallback para WhatsApp).
- **Proteção**: Bloqueio de duplicidade se enviado nas últimas 24h para o mesmo contrato.

## 3. Testes Internos Realizados
- **ID Contrato Teste**: `d5c26f18-7e0a-4541-9227-4693fc50f64d`
- **Registro em cliente_comunicacoes**: Sucesso (ID: `ce8ef9e7-d4ad-4d6f-b790-263eefc08bcb`)
- **Fila Outbox**: Sucesso (ID: `9da813b7-b97d-453a-899a-ab668637ce24`)
- **Destinatário**: `cliente_teste@example.com` (Email)
- **Conteúdo**: Link dinâmico gerado corretamente.

## 4. Próximos Passos (Próximas 24-72h)
1. Monitorar taxa de abertura do link no portal.
2. Validar webhooks de entrega/leitura para esta nova regra.
3. Coletar feedback do cliente piloto sobre a clareza da mensagem.
4. Manter limites de 5 envios/dia e horário comercial (09h-18h).

**Recomendação**: Manter operação piloto por 48h antes de liberar para o próximo grupo de clientes.
