import { describe, it, expect } from "vitest";
import {
  diffHoras,
  encontrarSobreposicao,
  calcularCapacidade,
  type IntervaloAgendado,
} from "./agendamento-conflict";

describe("diffHoras", () => {
  it("calcula a diferenca em horas decimais", () => {
    expect(diffHoras("08:00", "12:00")).toBe(4);
    expect(diffHoras("08:00", "09:30")).toBe(1.5);
  });

  it("retorna 0 quando falta inicio ou fim", () => {
    expect(diffHoras(null, "12:00")).toBe(0);
    expect(diffHoras("08:00", null)).toBe(0);
    expect(diffHoras(undefined, undefined)).toBe(0);
  });

  it("retorna 0 para intervalo invertido ou nulo (nao negativo)", () => {
    expect(diffHoras("12:00", "08:00")).toBe(0);
    expect(diffHoras("08:00", "08:00")).toBe(0);
  });
});

describe("encontrarSobreposicao", () => {
  const ag = (id: string, hi: string, hf: string): IntervaloAgendado => ({
    id,
    hora_inicio: hi,
    hora_fim: hf,
  });

  it("detecta sobreposicao parcial", () => {
    const r = encontrarSobreposicao([ag("a", "08:00", "10:00")], "09:00", "11:00");
    expect(r?.id).toBe("a");
  });

  it("intervalos adjacentes NAO conflitam (fim == inicio)", () => {
    // 08-10 e 10-12 se encostam mas nao sobrepoem
    expect(encontrarSobreposicao([ag("a", "08:00", "10:00")], "10:00", "12:00")).toBeNull();
  });

  it("novo intervalo contido dentro do existente conflita", () => {
    const r = encontrarSobreposicao([ag("a", "08:00", "18:00")], "10:00", "11:00");
    expect(r?.id).toBe("a");
  });

  it("retorna null quando o novo intervalo nao tem horario", () => {
    expect(encontrarSobreposicao([ag("a", "08:00", "10:00")], null, null)).toBeNull();
  });

  it("ignora existentes sem horario definido", () => {
    expect(
      encontrarSobreposicao([{ id: "a", hora_inicio: null, hora_fim: null }], "09:00", "11:00")
    ).toBeNull();
  });

  it("retorna o primeiro conflito quando ha varios", () => {
    const r = encontrarSobreposicao(
      [ag("a", "08:00", "09:00"), ag("b", "08:30", "09:30")],
      "08:45",
      "09:15"
    );
    expect(r?.id).toBe("a");
  });

  it("sem conflito quando o novo intervalo esta totalmente fora", () => {
    expect(encontrarSobreposicao([ag("a", "08:00", "10:00")], "14:00", "16:00")).toBeNull();
  });
});

describe("calcularCapacidade", () => {
  const ag = (hi: string, hf: string): IntervaloAgendado => ({
    id: hi,
    hora_inicio: hi,
    hora_fim: hf,
  });

  it("soma horas reservadas e nao excede dentro da capacidade", () => {
    const r = calcularCapacidade([ag("08:00", "10:00")], 2, 8);
    expect(r.horasReservadas).toBe(2);
    expect(r.excedeCapacidade).toBe(false); // 2 + 2 = 4 <= 8
  });

  it("capacidade exata NAO excede (limite inclusivo)", () => {
    const r = calcularCapacidade([ag("08:00", "14:00")], 2, 8);
    expect(r.horasReservadas).toBe(6);
    expect(r.excedeCapacidade).toBe(false); // 6 + 2 = 8, nao excede
  });

  it("excede quando passa de 1 minuto da capacidade", () => {
    const r = calcularCapacidade([ag("08:00", "14:00")], 2.5, 8);
    expect(r.excedeCapacidade).toBe(true); // 6 + 2.5 = 8.5 > 8
  });

  it("sem reservas, so o novo agendamento", () => {
    const r = calcularCapacidade([], 5, 8);
    expect(r.horasReservadas).toBe(0);
    expect(r.excedeCapacidade).toBe(false);
  });

  it("acumula varias reservas", () => {
    const r = calcularCapacidade([ag("08:00", "10:00"), ag("10:00", "13:00")], 4, 8);
    expect(r.horasReservadas).toBe(5);
    expect(r.excedeCapacidade).toBe(true); // 5 + 4 = 9 > 8
  });
});
