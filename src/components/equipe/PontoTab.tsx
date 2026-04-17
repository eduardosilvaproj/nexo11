import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Registro = {
  id: string;
  tipo: "entrada" | "saida";
  registrado_em: string;
};

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
function endOfTodayISO() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}
function fmtHM(date: Date) {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function fmtDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return `${h}h ${m}min`;
}

export function PontoRapidoCard() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [now, setNow] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);

  const { data: registros } = useQuery({
    queryKey: ["registros-ponto-hoje", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<Registro[]> => {
      const { data, error } = await supabase
        .from("registros_ponto")
        .select("id, tipo, registrado_em")
        .eq("usuario_id", user!.id)
        .gte("registrado_em", startOfTodayISO())
        .lte("registrado_em", endOfTodayISO())
        .order("registrado_em", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Registro[];
    },
  });

  const entrada = useMemo(
    () => registros?.find((r) => r.tipo === "entrada"),
    [registros],
  );
  const saida = useMemo(
    () => [...(registros ?? [])].reverse().find((r) => r.tipo === "saida"),
    [registros],
  );

  // Live counter while punched in
  useEffect(() => {
    if (!entrada || saida) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [entrada, saida]);

  async function registrar(tipo: "entrada" | "saida") {
    if (!user?.id) return;
    setSubmitting(true);
    try {
      const { data: u, error: uErr } = await supabase
        .from("usuarios")
        .select("loja_id")
        .eq("id", user.id)
        .maybeSingle();
      if (uErr) throw uErr;
      if (!u?.loja_id) throw new Error("Sua loja não está configurada");

      const { error } = await supabase.from("registros_ponto").insert({
        usuario_id: user.id,
        loja_id: u.loja_id,
        tipo,
      });
      if (error) throw error;
      toast.success(tipo === "entrada" ? "Entrada registrada" : "Saída registrada");
      qc.invalidateQueries({ queryKey: ["registros-ponto-hoje", user.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar ponto");
    } finally {
      setSubmitting(false);
    }
  }

  // Render states
  let body: JSX.Element;
  if (!entrada) {
    body = (
      <div className="flex items-center justify-between gap-4">
        <p style={{ fontSize: 14, color: "#FFFFFF" }}>
          Você ainda não registrou entrada hoje
        </p>
        <button
          disabled={submitting}
          onClick={() => registrar("entrada")}
          className="rounded-lg px-4 py-2 text-white disabled:opacity-60"
          style={{ backgroundColor: "#12B76A", fontSize: 13 }}
        >
          Registrar entrada →
        </button>
      </div>
    );
  } else if (!saida) {
    const elapsed = now - new Date(entrada.registrado_em).getTime();
    body = (
      <div className="flex items-center justify-between gap-4">
        <div>
          <p style={{ fontSize: 13, color: "#12B76A" }}>
            Entrada registrada às {fmtHM(new Date(entrada.registrado_em))}
          </p>
          <p style={{ fontSize: 20, fontWeight: 600, color: "#FFFFFF", marginTop: 4 }}>
            {fmtDuration(elapsed)} trabalhados
          </p>
        </div>
        <button
          disabled={submitting}
          onClick={() => registrar("saida")}
          className="rounded-lg px-4 py-2 text-white disabled:opacity-60"
          style={{ backgroundColor: "#E53935", fontSize: 13 }}
        >
          Registrar saída
        </button>
      </div>
    );
  } else {
    const total =
      new Date(saida.registrado_em).getTime() -
      new Date(entrada.registrado_em).getTime();
    body = (
      <div>
        <p style={{ fontSize: 13, color: "#9DA8B8" }}>Ponto do dia concluído ✓</p>
        <p style={{ fontSize: 20, fontWeight: 600, color: "#FFFFFF", marginTop: 4 }}>
          {fmtDuration(total)}
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl"
      style={{ backgroundColor: "#0D1117", padding: 20 }}
    >
      {body}
    </div>
  );
}

export function PontoTab() {
  return (
    <div className="flex flex-col gap-4">
      <PontoRapidoCard />
    </div>
  );
}
