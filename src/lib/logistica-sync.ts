// =========================================================
// logistica-sync: logica PURA de sincronizacao das trilhas
// =========================================================
// Estas funcoes nao tocam Supabase nem React. Concentram as DECISOES
// das fases de unificacao (deduplicacao, guardas anti-duplicata,
// detector de divergencia) para serem testadas sem banco.
// Os componentes/serviços fazem o I/O e delegam a decisao para ca.
// =========================================================

export type Fase =
  | "aguardando_fabrica"
  | "em_producao"
  | "recebendo"
  | "no_deposito"
  | "a_agendar"
  | "agendado"
  | "em_rota"
  | "entregue"
  | "reagendado"
  | "cancelado";

export type Origem = "producao_terceirizada" | "entregas" | "expedicoes_almoxarifado";

// Ordem do fluxo — usada para achar a "fase mais avancada" e ordenar.
// reagendado e lateral (= agendado); cancelado e terminal lateral.
export const FASE_ORDEM: Record<Fase, number> = {
  cancelado: 0,
  aguardando_fabrica: 1,
  em_producao: 2,
  recebendo: 3,
  no_deposito: 4,
  a_agendar: 5,
  agendado: 6,
  reagendado: 6,
  em_rota: 7,
  entregue: 8,
};

// ---------------------------------------------------------
// FASE B: quais contratos precisam de entrega origem=almoxarifado.
// ---------------------------------------------------------
// Regra: um contrato com pelo menos um item 'separado' precisa de UMA
// entrega (agrupa por contrato, nao por item). Idempotente: exclui os
// que ja possuem entrega origem=almoxarifado.
export interface ExpedicaoLike {
  contrato_id: string | null;
  status: string;
}

export function contratosComMaterialSeparado(expedicoes: ExpedicaoLike[]): string[] {
  return Array.from(
    new Set(
      expedicoes
        .filter((e) => e.status === "separado" && !!e.contrato_id)
        .map((e) => e.contrato_id as string)
    )
  );
}

// Dado os contratos com material separado e os que ja tem entrega de
// almoxarifado, devolve os que faltam criar. Esta e a guarda anti-duplicata
// da Fase B isolada para teste.
export function contratosFaltandoEntregaAlmox(
  contratosSeparados: string[],
  contratosComEntregaAlmox: string[]
): string[] {
  const jaTem = new Set(contratosComEntregaAlmox);
  // dedup defensivo na entrada tambem
  return Array.from(new Set(contratosSeparados)).filter((cid) => !jaTem.has(cid));
}

// ---------------------------------------------------------
// FASE 2 / item 1: guarda anti-duplicata por (contrato, origem).
// ---------------------------------------------------------
// Antes a guarda era "existe QUALQUER entrega? nao cria". Agora e por
// origem, para que recebimento e almoxarifado coexistam no mesmo contrato.
export interface EntregaLike {
  contrato_id: string;
  origem: string;
}

export function deveCriarEntrega(
  contratoId: string,
  origem: string,
  entregasExistentes: EntregaLike[]
): boolean {
  return !entregasExistentes.some(
    (e) => e.contrato_id === contratoId && e.origem === origem
  );
}

// ---------------------------------------------------------
// VISAO UNIFICADA: detector de divergencia.
// ---------------------------------------------------------
// Divergencia real = recebimento ja chegou ao deposito (no_deposito) mas
// NAO existe entrega na agenda para aquele contrato. Isso e o oposto de
// "0 divergencias por falta de vinculo": aqui exige que as trilhas estejam
// efetivamente ligadas (mesmo contrato_id) para detectar.
export interface LinhaUnificadaLike {
  origem: Origem;
  fase_canonica: Fase;
}

export function temDivergenciaNoDeposito(linhas: LinhaUnificadaLike[]): boolean {
  const recebimentoNoDeposito = linhas.some(
    (l) => l.origem === "producao_terceirizada" && l.fase_canonica === "no_deposito"
  );
  const temEntrega = linhas.some((l) => l.origem === "entregas");
  return recebimentoNoDeposito && !temEntrega;
}

// Fase mais avancada de um grupo (menos cancelado, que e lateral).
export function faseMaisAvancada(linhas: LinhaUnificadaLike[]): Fase {
  return linhas.reduce<Fase>((acc, l) => {
    return FASE_ORDEM[l.fase_canonica] > FASE_ORDEM[acc] ? l.fase_canonica : acc;
  }, "cancelado");
}
