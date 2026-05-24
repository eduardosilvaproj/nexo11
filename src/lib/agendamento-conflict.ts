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
  rhConflito?: { funcionario: string; motivo: string } | null;
  error?: string;
}

export async function checkRHAvailability(
  equipeId: string,
  dataInicio: string,
  dataFim: string
): Promise<{ funcionario: string; motivo: string } | null> {
  // Get team members
  const { data: membros } = await supabase
    .from("equipe_membros")
    .select("user_id")
    .eq("equipe_id", equipeId);
  
  if (!membros || membros.length === 0) return null;

  for (const membro of membros) {
    if (!membro.user_id) continue;

    // Find rh_funcionario
    const { data: func } = await supabase
      .from("rh_funcionarios")
      .select("id, nome")
      .eq("user_id", membro.user_id)
      .maybeSingle();

    if (func) {
      const { data: disp } = await supabase.rpc("calcular_disponibilidade_funcionario", {
        p_funcionario_id: func.id,
        p_data_inicio: dataInicio,
        p_data_fim: dataFim
      });

      const res = disp as { status: string; motivo: string | null };
      if (res && res.status !== 'disponivel') {
        return {
          funcionario: func.nome,
          motivo: res.motivo || res.status
        };
      }
    }
  }

  return null;
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
    rhConflito: null,
  };

  if (!p.equipeId || !p.data) return base;
  if (p.horaInicio && p.horaFim && p.horaInicio >= p.horaFim) {
    return { ...base, error: "Hora fim deve ser maior que hora início" };
  }

  // RH Check
  if (p.horaInicio && p.horaFim) {
    const dataInicio = `${p.data}T${p.horaInicio}:00Z`; // Approximation, should consider timezone
    const dataFim = `${p.data}T${p.horaFim}:00Z`;
    const rhConflito = await checkRHAvailability(p.equipeId, dataInicio, dataFim);
    if (rhConflito) {
      return { ...base, rhConflito };
    }
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
    rhConflito: null, // If we reached here, there's no rhConflito (or we'd have returned early)
  };
}
