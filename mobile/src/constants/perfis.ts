// Mantém paridade com src/lib/permissions.ts do web
export type Perfil =
  | 'vendedor'
  | 'tecnico'
  | 'comprador'
  | 'almoxarife'
  | 'logistico'
  | 'montador'
  | 'financeiro'
  | 'pos_venda'
  | 'gerente'
  | 'admin'
  | 'franqueador';

export const MODULOS_POR_PERFIL: Record<Perfil, string[]> = {
  vendedor: ['home', 'agenda', 'tarefas', 'notificacoes', 'contratos'],
  tecnico: ['home', 'agenda', 'tarefas', 'notificacoes', 'medicoes', 'conferencias'],
  comprador: ['home', 'tarefas', 'notificacoes', 'compras'],
  almoxarife: ['home', 'tarefas', 'notificacoes', 'separacoes'],
  logistico: ['home', 'agenda', 'tarefas', 'notificacoes', 'entregas'],
  montador: ['home', 'agenda', 'tarefas', 'notificacoes', 'montagens'],
  financeiro: ['home', 'tarefas', 'notificacoes', 'financeiro'],
  pos_venda: ['home', 'tarefas', 'notificacoes', 'chamados'],
  gerente: ['home', 'agenda', 'tarefas', 'notificacoes', 'contratos', 'indicadores'],
  admin: ['*'],
  franqueador: ['*'],
};

export function podeAcessar(perfil: Perfil | undefined, modulo: string): boolean {
  if (!perfil) return false;
  const lista = MODULOS_POR_PERFIL[perfil] || [];
  return lista.includes('*') || lista.includes(modulo);
}
