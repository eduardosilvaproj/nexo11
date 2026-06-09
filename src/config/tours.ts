// ============================================
// Tour Configurations — Tours contextuais por página
// ============================================

import { PageTourConfig } from '@/components/PageTour';

export const tourConfigs: PageTourConfig[] = [
  {
    id: 'comercial',
    version: 1,
    steps: [
      {
        target: '[data-tour="comercial-filtros"]',
        title: 'Filtros inteligentes',
        description: 'Use os filtros para encontrar leads por status, vendedor, valor ou período. Filtros são salvos automaticamente.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="comercial-novo"]',
        title: 'Cadastro rápido de lead',
        description: 'Clique aqui para cadastrar um novo lead. Use o atalho N para abrir o modal rapidamente.',
        placement: 'left',
      },
      {
        target: '[data-tour="comercial-funil"]',
        title: 'Funil de vendas',
        description: 'Visualize o funil completo: lead → qualificação → proposta → fechamento. Arraste cards entre as etapas.',
        placement: 'top',
      },
    ],
  },
  {
    id: 'contratos',
    version: 1,
    steps: [
      {
        target: '[data-tour="contratos-status"]',
        title: 'Status do contrato',
        description: 'Cada contrato tem um status que indica onde está no fluxo: rascunho, pendente, assinado, em produção, etc.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="contratos-novo"]',
        title: 'Novo contrato',
        description: 'Crie um contrato a partir de uma proposta ou do zero. Preencha os dados do cliente, projeto e valores.',
        placement: 'left',
      },
    ],
  },
  {
    id: 'capture',
    version: 1,
    steps: [
      {
        target: '[data-tour="capture-import"]',
        title: 'Importar planta',
        description: 'Cole dados JSON de uma planta ou faça upload de um arquivo DWG. O sistema detecta paredes, portas e janelas.',
        placement: 'right',
      },
      {
        target: '[data-tour="capture-preview"]',
        title: 'Preview 3D em tempo real',
        description: 'Veja o modelo 3D antes de gerar o SKP. Use o mouse para rotacionar e scroll para zoom.',
        placement: 'left',
      },
      {
        target: '[data-tour="capture-export"]',
        title: 'Exportar para Promob',
        description: 'Baixe em GLB, GLTF ou converta online para SKP e importe no Promob Connect.',
        placement: 'top',
      },
    ],
  },
  {
    id: 'analytics',
    version: 1,
    steps: [
      {
        target: '[data-tour="analytics-filtros"]',
        title: 'Filtros de período',
        description: 'Compare períodos diferentes para identificar tendências. Use atalho T para trocar o período.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="analytics-kpis"]',
        title: 'KPIs principais',
        description: 'Os indicadores mais importantes do seu negócio. Personalize quais KPIs aparecem aqui.',
        placement: 'right',
      },
    ],
  },
];
