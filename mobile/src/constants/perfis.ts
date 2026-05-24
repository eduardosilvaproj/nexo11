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
  vendedor: ['home', 'agenda', 'tarefas', 'notificacoes', 'contratos', 'rh'],
  tecnico: ['home', 'agenda', 'tarefas', 'notificacoes', 'medicoes', 'conferencias', 'rh'],
  comprador: ['home', 'tarefas', 'notificacoes', 'compras', 'rh'],
  almoxarife: ['home', 'tarefas', 'notificacoes', 'separacoes', 'rh'],
  logistico: ['home', 'agenda', 'tarefas', 'notificacoes', 'entregas', 'rh'],
  montador: ['home', 'agenda', 'tarefas', 'notificacoes', 'montagens', 'rh'],
  financeiro: ['home', 'tarefas', 'notificacoes', 'financeiro', 'rh'],
  pos_venda: ['home', 'tarefas', 'notificacoes', 'chamados', 'rh'],
  gerente: ['home', 'agenda', 'tarefas', 'notificacoes', 'contratos', 'indicadores', 'rh'],
  admin: ['*'],
  franqueador: ['*'],
};

export function podeAcessar(perfil: Perfil | undefined, modulo: string): boolean {
  if (!perfil) return false;
  const lista = MODULOS_POR_PERFIL[perfil] || [];
  return lista.includes('*') || lista.includes(modulo);
}
