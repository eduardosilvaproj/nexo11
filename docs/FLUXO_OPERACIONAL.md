# Fluxo Operacional Ponta a Ponta - NEXO

Este documento descreve como os dados fluem através do sistema, garantindo rastreabilidade e eficiência.

## Diagrama de Fluxo
`Comercial` -> `Contrato` -> `Medição` -> `Conferência` -> `Compras` -> `Almoxarifado` -> `Logística` -> `Montagem` -> `Pós-venda` -> `Resultados (DRE/Analytics)`

---

### 1. Comercial / Vendas
- **Objetivo**: Captar o desejo do cliente e formalizar a proposta.
- **Responsável**: Vendedor.
- **Entrada**: Lead / Necessidade do Cliente.
- **Saída**: Contrato Assinado.
- **Linha do Tempo**: "Venda Iniciada", "Proposta Gerada".

### 2. Medição Técnica
- **Objetivo**: Validar as medidas no local para evitar erros de projeto.
- **Responsável**: Técnico de Medição.
- **Entrada**: Contrato assinado.
- **Saída**: Medição Aprovada.
- **Notificação**: Envia alerta para Conferência.

### 3. Conferência de Projeto
- **Objetivo**: Garantir que o projeto "encaixa" nas medidas e segue os padrões de engenharia.
- **Responsável**: Conferente / Engenheiro.
- **Entrada**: Medição aprovada.
- **Saída**: Projeto Liberado para Compra.
- **Linha do Tempo**: "Conferência Finalizada".

### 4. Compras / Suprimentos
- **Objetivo**: Adquirir as matérias-primas e componentes necessários.
- **Responsável**: Comprador.
- **Entrada**: Solicitação gerada pela Conferência.
- **Saída**: Ordem de Compra enviada ao fornecedor.
- **Financeiro**: Gera previsão no Contas a Pagar.

### 5. Almoxarifado / Recebimento
- **Objetivo**: Controlar a entrada física dos materiais e organizar a saída para obra.
- **Responsável**: Almoxarife.
- **Entrada**: Nota Fiscal / Material do Fornecedor.
- **Saída**: Kit de Montagem separado.
- **Notificação**: Alerta de "Material Disponível" para Logística.

### 6. Logística / Entrega
- **Objetivo**: Levar o material até o cliente final com segurança.
- **Responsável**: Coordenador de Logística.
- **Entrada**: Kit separado no Almoxarifado.
- **Saída**: Comprovante de entrega assinado.
- **Linha do Tempo**: "Saída para entrega", "Entregue no cliente".

### 7. Montagem
- **Objetivo**: Instalação final do produto.
- **Responsável**: Equipe de Montagem.
- **Entrada**: Material entregue e ambiente liberado.
- **Saída**: Termo de Conclusão de Obra.
- **Notificação**: Alerta para Pós-venda realizar pesquisa de satisfação.

### 8. Financeiro e Comissões
- **Objetivo**: Liquidação de valores e pagamento de prêmios.
- **Responsável**: Financeiro.
- **Entrada**: Contrato (Receita) e Compras/Custos (Despesa).
- **Saída**: Baixas bancárias e extrato de comissões.
- **Resultados**: Alimenta DRE e Analytics em tempo real.

### 9. Pós-venda / Assistência
- **Objetivo**: Manter a satisfação do cliente após a entrega.
- **Responsável**: Analista de Pós-venda.
- **Entrada**: Solicitação do cliente ou rotina de pesquisa.
- **Saída**: Chamado encerrado com sucesso.
- **Linha do Tempo**: Registro de todo o histórico de interação.
