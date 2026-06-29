import { describe, it, expect } from "vitest";
import { canPerform, canAccessModule, type AppRole } from "./permissions";

describe("canPerform — bypass de admin", () => {
  it("admin_master pode qualquer acao, mesmo as mais sensiveis", () => {
    expect(canPerform(["admin_master"], "financeiro.manage")).toBe(true);
    expect(canPerform(["admin_master"], "lojas.manage")).toBe(true);
    expect(canPerform(["admin_master"], "rh.audit_logs.view")).toBe(true);
  });

  it("admin pode qualquer acao (bypass)", () => {
    expect(canPerform(["admin"], "financeiro.manage")).toBe(true);
    expect(canPerform(["admin"], "comissoes.manage")).toBe(true);
  });

  it("bypass vale mesmo combinado com role fraco", () => {
    expect(canPerform(["vendedor", "admin_master"], "lojas.manage")).toBe(true);
  });
});

describe("canPerform — roles especificos", () => {
  it("vendedor tem as permissoes do seu conjunto", () => {
    expect(canPerform(["vendedor"], "comercial.view")).toBe(true);
    expect(canPerform(["vendedor"], "documentos.sign")).toBe(true);
  });

  it("vendedor NAO tem permissoes fora do seu conjunto", () => {
    expect(canPerform(["vendedor"], "financeiro.manage")).toBe(false);
    expect(canPerform(["vendedor"], "lojas.manage")).toBe(false);
    expect(canPerform(["vendedor"], "logistica.update")).toBe(false);
  });

  it("logistico pode atualizar logistica, mas nao mexe em financeiro", () => {
    expect(canPerform(["logistico"], "logistica.update")).toBe(true);
    expect(canPerform(["logistico"], "campo.entregas")).toBe(true);
    expect(canPerform(["logistico"], "financeiro.manage")).toBe(false);
  });

  it("financeiro gerencia financeiro mas nao logistica", () => {
    expect(canPerform(["financeiro"], "financeiro.manage")).toBe(true);
    expect(canPerform(["financeiro"], "comissoes.manage")).toBe(true);
    expect(canPerform(["financeiro"], "logistica.update")).toBe(false);
  });

  it("rh acessa modulo de RH mas nao o comercial", () => {
    expect(canPerform(["rh"], "rh.funcionarios.manage")).toBe(true);
    expect(canPerform(["rh"], "rh.documentos_sensiveis.view")).toBe(true);
    expect(canPerform(["rh"], "comercial.view")).toBe(false);
  });

  it("franqueador ve DRE e financeiro mas nao opera logistica", () => {
    expect(canPerform(["franqueador"], "dre.view")).toBe(true);
    expect(canPerform(["franqueador"], "financeiro.manage")).toBe(true);
    expect(canPerform(["franqueador"], "logistica.update")).toBe(false);
  });
});

describe("canPerform — multiplos roles (uniao de permissoes)", () => {
  it("combina permissoes de dois roles distintos", () => {
    // vendedor (comercial) + logistico (logistica) -> tem ambas
    expect(canPerform(["vendedor", "logistico"], "comercial.view")).toBe(true);
    expect(canPerform(["vendedor", "logistico"], "logistica.update")).toBe(true);
  });

  it("dois roles fracos nao concedem permissao que nenhum tem", () => {
    expect(canPerform(["vendedor", "tecnico"], "financeiro.manage")).toBe(false);
  });
});

describe("canPerform — bordas", () => {
  it("lista de roles vazia nao concede nada", () => {
    expect(canPerform([], "comercial.view")).toBe(false);
    expect(canPerform([], "logistica.view")).toBe(false);
  });

  it("role desconhecido (fora do mapa) nao quebra e retorna false", () => {
    // simula role que existe no enum mas sem entrada no mapa (defensivo)
    expect(canPerform(["__inexistente__" as AppRole], "comercial.view")).toBe(false);
  });
});

describe("canAccessModule", () => {
  it("monta a acao <modulo>.view e respeita o bypass de admin", () => {
    expect(canAccessModule(["admin"], "financeiro")).toBe(true);
    expect(canAccessModule(["admin_master"], "lojas")).toBe(true);
  });

  it("concede acesso ao modulo quando o role tem <modulo>.view", () => {
    expect(canAccessModule(["vendedor"], "comercial")).toBe(true);
    expect(canAccessModule(["logistico"], "logistica")).toBe(true);
  });

  it("nega acesso ao modulo quando o role nao tem <modulo>.view", () => {
    expect(canAccessModule(["vendedor"], "financeiro")).toBe(false);
    expect(canAccessModule(["montador"], "comercial")).toBe(false);
  });
});
