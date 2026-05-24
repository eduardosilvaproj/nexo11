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
  | "financeiro.evidencias.view"
  | "campo.view"
  | "campo.medicoes"
  | "campo.entregas"
  | "campo.montagens"
  | "campo.pos_venda"
  | "campo.almoxarifado"
  | "rh.view"
  | "rh.manage"
  | "rh.funcionarios.view"
  | "rh.funcionarios.manage"
  | "rh.solicitacoes.view"
  | "rh.solicitacoes.create"
  | "rh.solicitacoes.approve"
  | "rh.documentos.view"
  | "rh.documentos.manage"
  | "rh.ausencias.view"
  | "rh.ausencias.manage"
  | "rh.escalas.view"
  | "rh.escalas.manage"
  | "rh.disponibilidade.view"
  | "rh.disponibilidade.manage"
  | "agenda.equipe.view"
  | "agenda.equipe.manage";

const ROLE_PERMISSIONS: Record<AppRole, PermissionAction[]> = {
  admin_master: [
    "comercial.view", "clientes.view", "contratos.view", "tecnico.view", "producao.view",
    "logistica.view", "logistica.update", "montagem.view", "montagem.update", "pos_venda.view",
    "dre.view", "financeiro.view", "financeiro.manage", "comissoes.view", "comissoes.manage",
    "compras.view", "compras.manage", "almoxarifado.view", "almoxarifado.manage", "equipe.view",
    "equipe.manage", "lojas.view", "lojas.manage", "analytics.view", "notificacoes.view", 
    "notificacoes.manage", "integracoes.view", "configuracoes.view", "implantacao.view", 
    "implantacao.manage", "documentos.view", "documentos.emit", "documentos.cancel", 
    "documentos.accept", "documentos.sign", "documentos.attach", "documentos.financeiro.view", 
    "documentos.financeiro.emit", "evidencias.view", "evidencias.create", "evidencias.delete", 
    "financeiro.evidencias.view", "campo.view", "campo.medicoes", "campo.entregas", 
    "campo.montagens", "campo.pos_venda", "campo.almoxarifado",
    "rh.view", "rh.manage", "rh.funcionarios.view", "rh.funcionarios.manage", 
    "rh.solicitacoes.view", "rh.solicitacoes.create", "rh.solicitacoes.approve", 
    "rh.documentos.view", "rh.documentos.manage", "rh.ausencias.view", "rh.ausencias.manage",
    "rh.escalas.view", "rh.escalas.manage", "rh.disponibilidade.view", "rh.disponibilidade.manage",
    "agenda.equipe.view", "agenda.equipe.manage"
  ],
  admin: [
    "comercial.view", "clientes.view", "contratos.view", "tecnico.view", "producao.view",
    "logistica.view", "logistica.update", "montagem.view", "montagem.update", "pos_venda.view",
    "dre.view", "financeiro.view", "financeiro.manage", "comissoes.view", "comissoes.manage",
    "compras.view", "compras.manage", "almoxarifado.view", "almoxarifado.manage", "equipe.view",
    "equipe.manage", "lojas.view", "lojas.manage", "analytics.view", "notificacoes.view", 
    "notificacoes.manage", "integracoes.view", "configuracoes.view", "implantacao.view", 
    "implantacao.manage", "documentos.view", "documentos.emit", "documentos.cancel", 
    "documentos.accept", "documentos.sign", "documentos.attach", "documentos.financeiro.view", 
    "documentos.financeiro.emit", "evidencias.view", "evidencias.create", "evidencias.delete", 
    "financeiro.evidencias.view", "campo.view", "campo.medicoes", "campo.entregas", 
    "campo.montagens", "campo.pos_venda", "campo.almoxarifado",
    "rh.view", "rh.manage", "rh.funcionarios.view", "rh.funcionarios.manage", 
    "rh.solicitacoes.view", "rh.solicitacoes.create", "rh.solicitacoes.approve", 
    "rh.documentos.view", "rh.documentos.manage", "rh.ausencias.view", "rh.ausencias.manage"
  ],
  franqueador: [
    "comercial.view", "clientes.view", "contratos.view", "pos_venda.view",
    "dre.view", "financeiro.view", "comissoes.view", "lojas.view", "equipe.view", 
    "analytics.view", "notificacoes.view", "documentos.view", "documentos.financeiro.view",
    "evidencias.view", "rh.view", "rh.funcionarios.view"
  ],
  gerente: [
    "comercial.view", "clientes.view", "contratos.view", "tecnico.view", "producao.view",
    "logistica.view", "logistica.update", "montagem.view", "montagem.update", "pos_venda.view",
    "dre.view", "financeiro.view", "financeiro.manage", "comissoes.view", "comissoes.manage",
    "compras.view", "compras.manage", "almoxarifado.view", "almoxarifado.manage", "equipe.view",
    "equipe.manage", "analytics.view", "notificacoes.view", "notificacoes.manage", 
    "integracoes.view", "configuracoes.view", "implantacao.view", "implantacao.manage",
    "documentos.view", "documentos.emit", "documentos.cancel", "documentos.accept", 
    "documentos.sign", "documentos.attach", "documentos.financeiro.view", 
    "documentos.financeiro.emit", "evidencias.view", "evidencias.create", "evidencias.delete", 
    "financeiro.evidencias.view", "campo.view", "campo.medicoes", "campo.entregas", 
    "campo.montagens", "campo.pos_venda", "campo.almoxarifado",
    "rh.view", "rh.manage", "rh.funcionarios.view", "rh.funcionarios.manage", 
    "rh.solicitacoes.view", "rh.solicitacoes.create", "rh.solicitacoes.approve", 
    "rh.documentos.view", "rh.documentos.manage", "rh.ausencias.view", "rh.ausencias.manage"
  ],
  rh: [
    "rh.view", "rh.manage", "rh.funcionarios.view", "rh.funcionarios.manage", 
    "rh.solicitacoes.view", "rh.solicitacoes.create", "rh.solicitacoes.approve", 
    "rh.documentos.view", "rh.documentos.manage", "rh.ausencias.view", "rh.ausencias.manage",
    "equipe.view", "notificacoes.view"
  ],
  vendedor: [
    "comercial.view", "clientes.view", "contratos.view", "pos_venda.view", "notificacoes.view",
    "documentos.view", "documentos.accept", "documentos.sign", "evidencias.view", "evidencias.create",
    "rh.solicitacoes.create", "rh.solicitacoes.view"
  ],
  tecnico: [
    "contratos.view", "tecnico.view", "producao.view", "logistica.view", "montagem.view", 
    "notificacoes.view", "documentos.view", "evidencias.view", "evidencias.create",
    "campo.view", "campo.medicoes", "rh.solicitacoes.create", "rh.solicitacoes.view"
  ],
  medidor: [
    "contratos.view", "tecnico.view", "notificacoes.view", "documentos.view", 
    "evidencias.view", "evidencias.create", "campo.view", "campo.medicoes",
    "rh.solicitacoes.create", "rh.solicitacoes.view"
  ],
  conferente: [
    "contratos.view", "tecnico.view", "notificacoes.view", "documentos.view", 
    "evidencias.view", "evidencias.create", "campo.view", "campo.medicoes",
    "rh.solicitacoes.create", "rh.solicitacoes.view"
  ],
  montador: [
    "montagem.view", "montagem.update", "notificacoes.view", "documentos.view", 
    "documentos.accept", "documentos.sign", "evidencias.view", "evidencias.create",
    "campo.view", "campo.montagens", "rh.solicitacoes.create", "rh.solicitacoes.view"
  ],
  comprador: [
    "compras.view", "compras.manage", "almoxarifado.view", "notificacoes.view",
    "documentos.view", "documentos.emit", "evidencias.view", "evidencias.create",
    "rh.solicitacoes.create", "rh.solicitacoes.view"
  ],
  almoxarife: [
    "almoxarifado.view", "almoxarifado.manage", "compras.view", "notificacoes.view",
    "documentos.view", "documentos.emit", "evidencias.view", "evidencias.create",
    "campo.view", "campo.almoxarifado", "rh.solicitacoes.create", "rh.solicitacoes.view"
  ],
  logistico: [
    "logistica.view", "logistica.update", "notificacoes.view", "documentos.view", 
    "documentos.emit", "documentos.accept", "documentos.sign", "evidencias.view", "evidencias.create",
    "campo.view", "campo.entregas", "rh.solicitacoes.create", "rh.solicitacoes.view"
  ],
  financeiro: [
    "financeiro.view", "financeiro.manage", "comissoes.view", "comissoes.manage", "dre.view", 
    "contratos.view", "notificacoes.view", "documentos.view", "documentos.emit", 
    "documentos.financeiro.view", "documentos.financeiro.emit", "evidencias.view", 
    "evidencias.create", "financeiro.evidencias.view", "rh.solicitacoes.create", "rh.solicitacoes.view"
  ],
  pos_venda: [
    "pos_venda.view", "clientes.view", "contratos.view", "notificacoes.view", "documentos.view",
    "evidencias.view", "evidencias.create", "campo.view", "campo.pos_venda",
    "rh.solicitacoes.create", "rh.solicitacoes.view"
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