// Types para o módulo de Estimativa de Orçamento via PDF

export interface DadosProjeto {
  nome_cliente?: string;
  nome_obra?: string;
  arquiteto?: string;
  data_projeto?: string;
}

export interface MovelIdentificado {
  id: string;
  ambiente: string;
  tipo: 'aereo' | 'base' | 'torre' | 'painel' | 'nicho' | 'gaveta' | 'outro' | string;
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
  comentarios_ambientes?: Record<string, string>;
  erro?: string;
}

export interface TabelaPrecoBase {
  tipo_movel: string;
  preco_m2_min: number;
  preco_m2_max: number;
  preco_m3_min?: number;
  preco_m3_max?: number;
}

export type TipoProjeto = 'residencial' | 'comercial' | 'corporativo' | string;

export const LABEL_TIPO_PROJETO: Record<string, string> = {
  residencial: 'Residencial',
  comercial: 'Comercial',
  corporativo: 'Corporativo',
};

export interface ContextoEstimativa {
  tipo_projeto?: TipoProjeto;
  orcamento_cliente?: number;
  observacoes?: string;
}
