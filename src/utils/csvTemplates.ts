export const generateCSVTemplate = (type: string): string => {
  const templates: Record<string, string[]> = {
    clientes: [
      'nome;telefone;email;cpf_cnpj;cidade;endereco;observacoes',
      'Exemplo Cliente;11999999999;cliente@exemplo.com;123.456.789-00;São Paulo;Rua Exemplo, 123;Cliente vip'
    ],
    fornecedores: [
      'nome;cnpj;telefone;email;categoria;observacoes',
      'Fornecedor Top;12.345.678/0001-99;11888888888;contato@fornecedor.com;Ferragens;Entrega rápida'
    ],
    estoque: [
      'codigo;nome;categoria;unidade;quantidade_inicial;estoque_minimo;custo_unitario;localizacao',
      'COR-001;Corrediça Telescópica 45cm;Ferragens;par;50;10;25.50;Prateleira A1'
    ],
    contratos: [
      'numero;cliente_nome;cliente_documento;valor_venda;status;vendedor_email;data_venda;previsao_entrega;observacoes',
      '2024001;João Silva;123.456.789-00;15000.00;em_andamento;vendedor@nexo.com;2024-05-01;2024-06-15;Cozinha completa'
    ],
    financeiro: [
      'tipo;contrato_numero;cliente_fornecedor_nome;descricao;valor;vencimento;status;forma_pagamento;categoria;observacoes',
      'receber;2024001;João Silva;Parcela 01/03;5000.00;2024-06-01;pendente;boleto;;Entrada',
      'pagar;;Fornecedor Top;Compra de Ferragens;1200.00;2024-05-25;pendente;pix;Materia Prima;Ref contrato 2024001'
    ]
  };

  const template = templates[type] || ['coluna1;coluna2', 'valor1;valor2'];
  return template.join('\n');
};
