# Checklist de QA - Validação Recorrente NEXO

Guia para testes rápidos e garantir a estabilidade do sistema antes de cada atualização ou semanalmente.

## 1. Rotas e Acessos
- [ ] Dashboard carrega em menos de 2 segundos?
- [ ] Login/Logout funcionando corretamente?
- [ ] Rota `/apresentacao` acessível sem login?
- [ ] Erro 404 para rotas inexistentes?

## 2. Permissões e Segurança
- [ ] Vendedor consegue acessar o DRE? (Deve ser Negado)
- [ ] Usuário de uma Loja A consegue ver contratos da Loja B? (Deve ser Negado via RLS)
- [ ] Botão de "Excluir" oculto para perfis sem permissão?
- [ ] RPCs protegidas retornam erro se chamadas manualmente sem permissão?

## 3. Fluxo de Estoque
- [ ] Entrada de nota aumenta o saldo corretamente?
- [ ] Saída para montagem abate o saldo?
- [ ] Alerta de estoque crítico aparece quando abaixo do limite?
- [ ] Histórico de movimentações bate com o saldo atual?

## 4. Fluxo Financeiro e DRE
- [ ] Lançamento de contrato gera Contas a Receber?
- [ ] Baixa de título atualiza o saldo bancário?
- [ ] DRE reflete apenas títulos "Pagos/Recebidos" (Visão de Caixa)?
- [ ] Cálculos de comissão não estão duplicados?

## 5. Analytics e Auditoria
- [ ] Gráficos do Analytics carregam dados reais?
- [ ] Linha do Tempo do contrato mostra quem fez a ação?
- [ ] Notificações são marcadas como lidas e somem do contador?

## 6. Interface e Responsividade
- [ ] Sidebar funciona bem no Mobile?
- [ ] Tabelas são legíveis em telas pequenas?
- [ ] Modal de cadastro fecha corretamente no botão cancelar?

## 7. Integridade Técnica
- [ ] `npm run build` passa sem erros?
- [ ] `npx tsc --noEmit` sem erros de tipagem?
- [ ] Não existem `console.log` de debug em produção?
- [ ] Não existem dados Mockados (fake) sendo exibidos?
