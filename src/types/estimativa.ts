// Types para o módulo de Estimativa de Orçamento via PDF

export type TipoProjeto = 'residencial' | 'comercial' | 'corporativo';
export type PadraoAcabamento = 'economico' | 'medio' | 'alto' | 'luxo';

export interface ContextoEstimativa {
  tipo_projeto: TipoProjeto;
  padrao: PadraoAcabamento;
  orcamento_cliente?: number;
  observacoes?: string;
}

export const MULTIPLICADOR_PADRAO: Record<PadraoAcabamento, number> = {
  economico: 0.7,
  medio: 1.0,
  alto: 1.3,
  luxo: 1.6,
};

export const LABEL_TIPO_PROJETO: Record<TipoProjeto, string> = {
  residencial: 'Residencial',
  comercial: 'Comercial',
  corporativo: 'Corporativo',
};

export const LABEL_PADRAO: Record<PadraoAcabamento, string> = {
  economico: 'Econômico',
  medio: 'Médio',
  alto: 'Alto Padrão',
  luxo: 'Luxo',
};

export interface ComparacaoOrcamento {
  orcamento_cliente: number;
  estimativa_media: number;
  diferenca_valor: number;
  diferenca_pct: number;
}

export interface MovelIdentificado {
  id: string;
  ambiente: string;
  tipo: 'aereo' | 'base' | 'torre' | 'painel' | 'nicho' | 'gaveta' | 'prateleira' | 'guarda_roupa' | 'bancada' | 'rack' | 'divisoria' | 'outro';
  descricao: string;
  largura?: number;
  altura?: number;
  profundidade?: number;
  quantidade: number;
  observacoes?: string;
  alertas?: string[];
}

export interface EstimativaPreco {
  movel_id: string;
  preco_minimo: number;
  preco_maximo: number;
  preco_medio: number;
  base_calculo: string;
}

export interface ValidacaoTecnica {
  movel_id: string;
  conforme: boolean;
  alertas: string[];
  recomendacoes: string[];
}

export interface DadosProjeto {
  nome_cliente?: string;
  nome_obra?: string;
  arquiteto?: string;
  data_projeto?: string;
}

export interface RelatorioEstimativa {
  id: string;
  pdf_url: string;
  data_analise: string;
  status: 'processando' | 'concluido' | 'erro';
  dados_projeto?: DadosProjeto;
  moveis: MovelIdentificado[];
  estimativas: EstimativaPreco[];
  validacoes: ValidacaoTecnica[];
  total_minimo: number;
  total_maximo: number;
  total_medio: number;
  observacoes_gerais: string[];
  erro?: string;
  contexto?: ContextoEstimativa;
  comparacao_orcamento?: ComparacaoOrcamento;
}

export interface TabelaPrecoBase {
  tipo_movel: string;
  preco_m2_min: number;
  preco_m2_max: number;
  preco_m3_min?: number;
  preco_m3_max?: number;
}
