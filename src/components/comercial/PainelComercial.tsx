import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Calendar, Clock, TrendingUp, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysBetween(a: Date, b: Date) {
  return Math.floor((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR");
}

function Metric({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  tone?: "default" | "warn" | "success" | "info";
}) {
  const toneStyles: Record<string, { bg: string; color: string }> = {
    default: { bg: "#F5F7FA", color: "#6B7A90" },
    warn: { bg: "#FFF4E5", color: "#B26A00" },
    success: { bg: "#E6F7EE", color: "#0E8A4F" },
    info: { bg: "#E6F3FF", color: "#1E6FBF" },
  };
  const t = toneStyles[tone];
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate" style={{ fontSize: 12, color: "#6B7A90", fontWeight: 500 }}>
            {label}
          </p>
          <p className="mt-1" style={{ fontSize: 24, fontWeight: 600, color: "#0D1117" }}>
            {value}
          </p>
        </div>
        <div
          className="flex items-center justify-center"
          style={{ width: 36, height: 36, borderRadius: 8, background: t.bg, color: t.color }}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}

export function PainelComercial({ onSelectLead }: { onSelectLead?: (lead: Lead) => void }) {
  const { perfil, user } = useAuth();
  const [escopo, setEscopo] = useState<"minha" | "equipe">("minha");

  const { data: leads = [] } = useQuery({
    queryKey: ["leads-painel", perfil?.loja_id],
    enabled: !!perfil?.loja_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("data_entrada", { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
  });

  const hoje = startOfDay(new Date());
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const meusLeads = useMemo(() => {
    if (escopo === "equipe") return leads;
    if (!user?.id) return [];
    return leads.filter((l) => l.vendedor_id === user.id);
  }, [leads, escopo, user?.id]);

  const novosHoje = meusLeads.filter(
    (l) => startOfDay(new Date(l.data_entrada)).getTime() === hoje.getTime(),
  ).length;

  const followUpPendentes = meusLeads.filter((l) => {
    if (["convertido", "perdido"].includes(l.status)) return false;
    const ref = l.data_ultimo_contato ?? l.data_entrada;
    return daysBetween(hoje, new Date(ref)) >= 3;
  }).length;

  const propostasAbertas = meusLeads.filter((l) => l.status === "proposta").length;

  const conversoesMes = meusLeads.filter((l) => {
    if (l.status !== "convertido") return false;
    return new Date(l.updated_at) >= inicioMes;
  }).length;

  // Semana (Dom..Sáb)
  const inicioSemana = (() => {
    const x = new Date(hoje);
    x.setDate(hoje.getDate() - hoje.getDay());
    return x;
  })();

  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(inicioSemana);
    d.setDate(inicioSemana.getDate() + i);
    return d;
  });

  const leadsPorDia = (dia: Date) =>
    meusLeads.filter((l) => {
      const ref = l.data_ultimo_contato ?? l.data_entrada;
      return startOfDay(new Date(ref)).getTime() === dia.getTime();
    });

  const acoesPendentes = meusLeads
    .filter((l) => {
      if (["convertido", "perdido"].includes(l.status)) return false;
      const ref = l.data_ultimo_contato ?? l.data_entrada;
      return daysBetween(hoje, new Date(ref)) >= 3;
    })
    .sort((a, b) => {
      const ra = new Date(a.data_ultimo_contato ?? a.data_entrada).getTime();
      const rb = new Date(b.data_ultimo_contato ?? b.data_entrada).getTime();
      return ra - rb;
    })
    .slice(0, 8);

  const alertas: { tipo: string; lead: Lead; dias: number }[] = [];
  meusLeads.forEach((l) => {
    if (["convertido", "perdido"].includes(l.status)) return;
    const ref = l.data_ultimo_contato ?? l.data_entrada;
    const d = daysBetween(hoje, new Date(ref));
    if (l.status === "proposta" && d >= 10) {
      alertas.push({ tipo: "Proposta parada", lead: l, dias: d });
    } else if (d >= 7) {
      alertas.push({ tipo: "Sem contato", lead: l, dias: d });
    }
  });

  return (
    <div className="space-y-4">
      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric icon={Users} label="Leads novos hoje" value={novosHoje} tone="info" />
        <Metric icon={Clock} label="Follow-ups pendentes" value={followUpPendentes} tone="warn" />
        <Metric icon={Calendar} label="Propostas abertas" value={propostasAbertas} tone="default" />
        <Metric icon={TrendingUp} label="Conversões do mês" value={conversoesMes} tone="success" />
      </div>

      {/* Agenda da semana */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#0D1117" }}>Agenda da semana</p>
            <p style={{ fontSize: 11, color: "#6B7A90" }}>
              Leads com contato ou retorno agendado
            </p>
          </div>
          <div
            className="inline-flex p-0.5"
            style={{ background: "#F5F7FA", borderRadius: 8 }}
          >
            {(["minha", "equipe"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setEscopo(k)}
                className="px-3 py-1 transition-colors"
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  borderRadius: 6,
                  background: escopo === k ? "#FFFFFF" : "transparent",
                  color: escopo === k ? "#0D1117" : "#6B7A90",
                  boxShadow: escopo === k ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                }}
              >
                {k === "minha" ? "Minha agenda" : "Equipe"}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-2">
          {diasSemana.map((d) => {
            const ehHoje = d.getTime() === hoje.getTime();
            const items = leadsPorDia(d);
            return (
              <div
                key={d.toISOString()}
                className="flex flex-col"
                style={{
                  background: ehHoje ? "#E6F3FF" : "#F9FAFB",
                  border: ehHoje ? "1px solid #1E6FBF" : "1px solid #E8ECF2",
                  borderRadius: 8,
                  padding: 8,
                  minHeight: 80,
                }}
              >
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 10, color: "#6B7A90", fontWeight: 600, textTransform: "uppercase" }}>
                    {DIAS_SEMANA[d.getDay()]}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: ehHoje ? "#1E6FBF" : "#0D1117",
                    }}
                  >
                    {d.getDate()}
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  {items.slice(0, 2).map((l) => (
                    <button
                      key={l.id}
                      onClick={() => onSelectLead?.(l)}
                      className="block w-full truncate text-left transition-colors hover:underline"
                      style={{ fontSize: 10, color: "#0D1117" }}
                      title={l.nome}
                    >
                      • {l.nome}
                    </button>
                  ))}
                  {items.length > 2 && (
                    <span style={{ fontSize: 10, color: "#6B7A90" }}>+{items.length - 2}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Ações pendentes + Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p style={{ fontSize: 13, fontWeight: 600, color: "#0D1117" }}>Ações pendentes</p>
            <span style={{ fontSize: 11, color: "#6B7A90" }}>
              {acoesPendentes.length} {acoesPendentes.length === 1 ? "lead" : "leads"}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {acoesPendentes.length === 0 ? (
              <p className="py-6 text-center" style={{ fontSize: 12, color: "#B0BAC9" }}>
                Nenhum follow-up pendente 🎉
              </p>
            ) : (
              acoesPendentes.map((l) => {
                const ref = l.data_ultimo_contato ?? l.data_entrada;
                const dias = daysBetween(hoje, new Date(ref));
                return (
                  <button
                    key={l.id}
                    onClick={() => onSelectLead?.(l)}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-[#F5F7FA]"
                  >
                    <div className="min-w-0">
                      <p className="truncate" style={{ fontSize: 13, fontWeight: 500, color: "#0D1117" }}>
                        {l.nome}
                      </p>
                      <p className="truncate" style={{ fontSize: 11, color: "#6B7A90" }}>
                        {l.contato || "Sem contato"} · último: {formatDate(ref)}
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: dias >= 7 ? "#B26A00" : "#6B7A90",
                        background: dias >= 7 ? "#FFF4E5" : "#F5F7FA",
                        padding: "2px 8px",
                        borderRadius: 999,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {dias}d
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p style={{ fontSize: 13, fontWeight: 600, color: "#0D1117" }}>Alertas</p>
            {alertas.length > 0 && (
              <span style={{ fontSize: 11, color: "#B26A00", fontWeight: 600 }}>
                {alertas.length}
              </span>
            )}
          </div>
          <div className="mt-3 space-y-2">
            {alertas.length === 0 ? (
              <p className="py-6 text-center" style={{ fontSize: 12, color: "#B0BAC9" }}>
                Sem alertas no momento
              </p>
            ) : (
              alertas.slice(0, 8).map((a) => (
                <button
                  key={a.lead.id}
                  onClick={() => onSelectLead?.(a.lead)}
                  className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-[#FFF8EE]"
                >
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "#B26A00" }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate" style={{ fontSize: 13, fontWeight: 500, color: "#0D1117" }}>
                      {a.lead.nome}
                    </p>
                    <p style={{ fontSize: 11, color: "#6B7A90" }}>
                      {a.tipo} · {a.dias} dias sem ação
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
