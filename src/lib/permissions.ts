import { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export interface UserContext {
  roles: AppRole[];
  loja_id?: string | null;
}

export type PermissionAction =
  | "comercial.view"
  | "clientes.view"
  | "contratos.view"
  | "tecnico.view"
  | "producao.view"
  | "logistica.view"
  | "logistica.update"
  | "montagem.view"
  | "montagem.update"
  | "pos_venda.view"
  | "dre.view"
  | "financeiro.view"
  | "financeiro.manage" // pagar, estornar, cancelar
  | "comissoes.view"
  | "comissoes.manage" // aprovar, pagar
  | "compras.view"
  | "compras.manage"
  | "almoxarifado.view"
  | "almoxarifado.manage" // criar item, movimentar
  | "equipe.view"
  | "equipe.manage"
  | "lojas.view"
  | "lojas.manage"
  | "analytics.view"
  | "notificacoes.view"
  | "notificacoes.manage"
  | "integracoes.view"
  | "configuracoes.view"
  | "implantacao.view"
  | "implantacao.manage"
  | "documentos.view"
  | "documentos.emit"
  | "documentos.cancel"
  | "documentos.accept"
  | "documentos.sign"
  | "documentos.attach"
  | "documentos.financeiro.view"
  | "documentos.financeiro.emit"
  | "evidencias.view"
  | "evidencias.create"
  | "evidencias.delete"
  | "financeiro.evidencias.view";

const ROLE_PERMISSIONS: Record<AppRole, PermissionAction[]> = {
  admin_master: [
    "comercial.view", "clientes.view", "contratos.view", "tecnico.view", "producao.view",
    "logistica.view", "logistica.update", "montagem.view", "montagem.update", "pos_venda.view",
    "dre.view", "financeiro.view", "financeiro.manage", "comissoes.view", "comissoes.manage",
    "compras.view", "compras.manage", "almoxarifado.view", "almoxarifado.manage", "equipe.view",
    "equipe.manage", "lojas.view", "lojas.manage", "analytics.view", "notificacoes.view", 
    "notificacoes.manage", "integracoes.view", "configuracoes.view", "implantacao.view", 
    "implantacao.manage", "documentos.view", "documentos.emit", "documentos.cancel", 
    "documentos.financeiro.view", "documentos.financeiro.emit"
  ],
  admin: [
    "comercial.view", "clientes.view", "contratos.view", "tecnico.view", "producao.view",
    "logistica.view", "logistica.update", "montagem.view", "montagem.update", "pos_venda.view",
    "dre.view", "financeiro.view", "financeiro.manage", "comissoes.view", "comissoes.manage",
    "compras.view", "compras.manage", "almoxarifado.view", "almoxarifado.manage", "equipe.view",
    "equipe.manage", "lojas.view", "lojas.manage", "analytics.view", "notificacoes.view", 
    "notificacoes.manage", "integracoes.view", "configuracoes.view", "implantacao.view", 
    "implantacao.manage", "documentos.view", "documentos.emit", "documentos.cancel", 
    "documentos.financeiro.view", "documentos.financeiro.emit"
  ],
  franqueador: [
    "comercial.view", "clientes.view", "contratos.view", "pos_venda.view",
    "dre.view", "financeiro.view", "comissoes.view", "lojas.view", "equipe.view", 
    "analytics.view", "notificacoes.view", "documentos.view", "documentos.financeiro.view"
  ],
  gerente: [
    "comercial.view", "clientes.view", "contratos.view", "tecnico.view", "producao.view",
    "logistica.view", "logistica.update", "montagem.view", "montagem.update", "pos_venda.view",
    "dre.view", "financeiro.view", "financeiro.manage", "comissoes.view", "comissoes.manage",
    "compras.view", "compras.manage", "almoxarifado.view", "almoxarifado.manage", "equipe.view",
    "equipe.manage", "analytics.view", "notificacoes.view", "notificacoes.manage", 
    "integracoes.view", "configuracoes.view", "implantacao.view", "implantacao.manage",
    "documentos.view", "documentos.emit", "documentos.cancel", "documentos.financeiro.view", 
    "documentos.financeiro.emit"
  ],
  vendedor: [
    "comercial.view", "clientes.view", "contratos.view", "pos_venda.view", "notificacoes.view",
    "documentos.view"
  ],
  tecnico: [
    "contratos.view", "tecnico.view", "producao.view", "logistica.view", "montagem.view", 
    "notificacoes.view", "documentos.view"
  ],
  medidor: [
    "contratos.view", "tecnico.view", "notificacoes.view", "documentos.view"
  ],
  conferente: [
    "contratos.view", "tecnico.view", "notificacoes.view", "documentos.view"
  ],
  montador: [
    "montagem.view", "montagem.update", "notificacoes.view", "documentos.view"
  ],
  comprador: [
    "compras.view", "compras.manage", "almoxarifado.view", "notificacoes.view",
    "documentos.view", "documentos.emit"
  ],
  almoxarife: [
    "almoxarifado.view", "almoxarifado.manage", "compras.view", "notificacoes.view",
    "documentos.view", "documentos.emit"
  ],
  logistico: [
    "logistica.view", "logistica.update", "notificacoes.view", "documentos.view", "documentos.emit"
  ],
  financeiro: [
    "financeiro.view", "financeiro.manage", "comissoes.view", "comissoes.manage", "dre.view", 
    "contratos.view", "notificacoes.view", "documentos.view", "documentos.emit", 
    "documentos.financeiro.view", "documentos.financeiro.emit"
  ],
  pos_venda: [
    "pos_venda.view", "clientes.view", "contratos.view", "notificacoes.view", "documentos.view"
  ]
};

export function canPerform(userRoles: AppRole[], action: PermissionAction): boolean {
  if (userRoles.includes("admin_master")) return true;
  return userRoles.some(role => ROLE_PERMISSIONS[role]?.includes(action));
}

export function canAccessModule(userRoles: AppRole[], module: string): boolean {
  const action = `${module}.view` as PermissionAction;
  return canPerform(userRoles, action);
}
