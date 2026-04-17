import { supabase } from "@/integrations/supabase/client";

export function diffHoras(ini?: string | null, fim?: string | null): number {
  if (!ini || !fim) return 0;
  const [h1, m1] = ini.split(":").map(Number);
  const [h2, m2] = fim.split(":").map(Number);
  const mins = h2 * 60 + m2 - (h1 * 60 + m1);
  return mins > 0 ? mins / 60 : 0;
}

export interface ConflictCheckParams {
  equipeId: string | null | undefined;
  data: string; // yyyy-MM-dd
  horaInicio: string | null | undefined;
  horaFim: string | null | undefined;
  capacidadeHorasDia?: number;
  excludeId?: string; // ao editar, ignora o próprio agendamento
}

export interface ConflictCheckResult {
  conflito: { id: string; hora_inicio: string | null; hora_fim: string | null } | null;
  excedeCapacidade: boolean;
  horasReservadas: number;
  horasNovas: number;
  capacidade: number;
  error?: string;
}

export async function checkAgendamentoConflict(
  p: ConflictCheckParams
): Promise<ConflictCheckResult> {
  const capacidade = p.capacidadeHorasDia ?? 8;
  const horasNovas = diffHoras(p.horaInicio, p.horaFim);
  const base: ConflictCheckResult = {
    conflito: null,
    excedeCapacidade: false,
    horasReservadas: 0,
    horasNovas,
    capacidade,
  };

  if (!p.equipeId || !p.data) return base;
  if (p.horaInicio && p.horaFim && p.horaInicio >= p.horaFim) {
    return { ...base, error: "Hora fim deve ser maior que hora início" };
  }

  let q = supabase
    .from("agendamentos_montagem")
    .select("id, hora_inicio, hora_fim")
    .eq("equipe_id", p.equipeId)
    .eq("data", p.data)
    .neq("status", "cancelado");
  if (p.excludeId) q = q.neq("id", p.excludeId);

  const { data: existentes = [] } = await q;

  const conflito =
    p.horaInicio && p.horaFim
      ? existentes.find(
          (a) =>
            a.hora_inicio &&
            a.hora_fim &&
            a.hora_inicio < p.horaFim! &&
            p.horaInicio! < a.hora_fim
        ) ?? null
      : null;

  const horasReservadas = existentes.reduce(
    (acc, a) => acc + diffHoras(a.hora_inicio, a.hora_fim),
    0
  );
  const excedeCapacidade = horasReservadas + horasNovas > capacidade;

  return {
    conflito: conflito as any,
    excedeCapacidade,
    horasReservadas,
    horasNovas,
    capacidade,
  };
}
