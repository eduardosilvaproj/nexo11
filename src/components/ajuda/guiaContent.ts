export const guiaCategorias = [
  {
    id: "xml",
    titulo: "Processamento de XML",
    descricao: "Como interpretar as divergências entre o XML Original (Budget) e o Conferido (Order).",
    topicos: [
      {
        pergunta: "Por que a variação está vermelha?",
        resposta: "A variação fica vermelha quando o custo conferido (Order) é mais de 10% superior ao custo original (Budget). Isso bloqueia a aprovação automática."
      },
      {
        pergunta: "O que é o XML de Conferência?",
        resposta: "É o arquivo gerado após a conferência técnica, contendo os custos reais de produção que serão enviados para a fábrica."
      }
    ]
  },
  {
    id: "status",
    titulo: "Estados do Ambiente",
    descricao: "Entenda o ciclo de vida de um ambiente na conferência.",
    topicos: [
      {
        pergunta: "Quando o status muda para 'Aprovado'?",
        resposta: "Somente após o checklist estar 100% preenchido, o XML conferido ter sido processado e o botão 'Aprovar Ambiente' ser clicado manualmente."
      },
      {
        pergunta: "O que significa 'Em Conferência'?",
        resposta: "Indica que o XML conferido já foi enviado, mas o checklist ainda não foi concluído ou a aprovação final não foi realizada."
      }
    ]
  }
];
