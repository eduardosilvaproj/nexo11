import { describe, it, expect } from "vitest";
import {
  contratosComMaterialSeparado,
  contratosFaltandoEntregaAlmox,
  deveCriarEntrega,
  temDivergenciaNoDeposito,
  faseMaisAvancada,
  type ExpedicaoLike,
  type EntregaLike,
  type LinhaUnificadaLike,
} from "@/lib/logistica-sync";

// =========================================================
// Roteiro de teste automatizado da unificacao logistica.
// Cobre as decisoes das fases sem tocar Supabase:
//   - Fase 2 / item 1: guarda anti-duplicata por (contrato, origem)
//   - Fase B: dedup/agrupamento + idempotencia da entrega de almoxarifado
//   - Visao Unificada: detector de divergencia e fase mais avancada
// =========================================================

describe("Fase B — contratosComMaterialSeparado", () => {
  it("agrupa por contrato: 1 entrada por contrato mesmo com varios itens", () => {
    const exp: ExpedicaoLike[] = [
      { contrato_id: "c1", status: "separado" },
      { contrato_id: "c1", status: "separado" },
      { contrato_id: "c2", status: "separado" },
    ];
    expect(contratosComMaterialSeparado(exp).sort()).toEqual(["c1", "c2"]);
  });

  it("ignora status != separado", () => {
    const exp: ExpedicaoLike[] = [
      { contrato_id: "c1", status: "carregado" },
      { contrato_id: "c2", status: "entregue" },
      { contrato_id: "c3", status: "separado" },
    ];
    expect(contratosComMaterialSeparado(exp)).toEqual(["c3"]);
  });

  it("ignora expedicoes sem contrato_id (orfas nao geram entrega)", () => {
    const exp: ExpedicaoLike[] = [
      { contrato_id: null, status: "separado" },
      { contrato_id: "c1", status: "separado" },
    ];
    expect(contratosComMaterialSeparado(exp)).toEqual(["c1"]);
  });

  it("lista vazia -> vazio", () => {
    expect(contratosComMaterialSeparado([])).toEqual([]);
  });
});

describe("Fase B — contratosFaltandoEntregaAlmox (idempotencia)", () => {
  it("exclui contratos que ja tem entrega de almoxarifado", () => {
    expect(contratosFaltandoEntregaAlmox(["c1", "c2", "c3"], ["c2"])).toEqual([
      "c1",
      "c3",
    ]);
  });

  it("recarga sem novidades -> nada a criar (idempotente)", () => {
    expect(contratosFaltandoEntregaAlmox(["c1", "c2"], ["c1", "c2"])).toEqual([]);
  });

  it("dedup defensivo de entradas repetidas", () => {
    expect(contratosFaltandoEntregaAlmox(["c1", "c1", "c2"], [])).toEqual([
      "c1",
      "c2",
    ]);
  });

  it("nenhuma entrega existente -> cria para todos", () => {
    expect(contratosFaltandoEntregaAlmox(["c1", "c2"], [])).toEqual(["c1", "c2"]);
  });
});

describe("Fase 2 / item 1 — deveCriarEntrega (guarda por origem)", () => {
  const existentes: EntregaLike[] = [
    { contrato_id: "c1", origem: "recebimento" },
  ];

  it("nao recria entrega de mesma origem (anti-duplicata)", () => {
    expect(deveCriarEntrega("c1", "recebimento", existentes)).toBe(false);
  });

  it("permite origem diferente no MESMO contrato (independencia)", () => {
    // c1 ja tem entrega de recebimento; almoxarifado deve poder criar a sua
    expect(deveCriarEntrega("c1", "almoxarifado", existentes)).toBe(true);
  });

  it("permite criar quando o contrato nao tem nenhuma entrega", () => {
    expect(deveCriarEntrega("c9", "recebimento", existentes)).toBe(true);
  });

  it("nao recria almoxarifado se ja existe almoxarifado", () => {
    const ex: EntregaLike[] = [{ contrato_id: "c1", origem: "almoxarifado" }];
    expect(deveCriarEntrega("c1", "almoxarifado", ex)).toBe(false);
  });
});

describe("Visao Unificada — temDivergenciaNoDeposito", () => {
  it("recebimento no_deposito SEM entrega -> divergencia", () => {
    const linhas: LinhaUnificadaLike[] = [
      { origem: "producao_terceirizada", fase_canonica: "no_deposito" },
    ];
    expect(temDivergenciaNoDeposito(linhas)).toBe(true);
  });

  it("recebimento no_deposito COM entrega -> sem divergencia", () => {
    const linhas: LinhaUnificadaLike[] = [
      { origem: "producao_terceirizada", fase_canonica: "no_deposito" },
      { origem: "entregas", fase_canonica: "a_agendar" },
    ];
    expect(temDivergenciaNoDeposito(linhas)).toBe(false);
  });

  it("recebimento ainda em producao -> sem divergencia (ainda nao chegou)", () => {
    const linhas: LinhaUnificadaLike[] = [
      { origem: "producao_terceirizada", fase_canonica: "em_producao" },
    ];
    expect(temDivergenciaNoDeposito(linhas)).toBe(false);
  });
});

describe("Visao Unificada — faseMaisAvancada", () => {
  it("pega a fase de maior ordem no grupo", () => {
    const linhas: LinhaUnificadaLike[] = [
      { origem: "producao_terceirizada", fase_canonica: "no_deposito" },
      { origem: "entregas", fase_canonica: "em_rota" },
    ];
    expect(faseMaisAvancada(linhas)).toBe("em_rota");
  });

  it("reagendado equivale a agendado (ordem 6) e nao supera em_rota", () => {
    const linhas: LinhaUnificadaLike[] = [
      { origem: "entregas", fase_canonica: "reagendado" },
      { origem: "entregas", fase_canonica: "em_rota" },
    ];
    expect(faseMaisAvancada(linhas)).toBe("em_rota");
  });

  it("grupo so com cancelado -> cancelado", () => {
    const linhas: LinhaUnificadaLike[] = [
      { origem: "entregas", fase_canonica: "cancelado" },
    ];
    expect(faseMaisAvancada(linhas)).toBe("cancelado");
  });
});
