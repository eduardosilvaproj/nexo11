import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  UserPlus,
  PhoneForwarded,
  FileText,
  TrendingUp,
  AlertTriangle,
  Clock,
  Users,
  User,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysDiff(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function getWeekDays(today: Date) {
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
}

const WEEKDAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function PainelDoDia() {
  const { perfil } = useAuth();
  const [agendaMode, setAgendaMode] = useState<"minha" | "equipe">("minha");

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads", perfil?.loja_id],
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

  const today = useMemo(() => startOfDay(new Date()), []);
  const weekDays = useMemo(() => getWeekDays(today), [today]);

  const metrics = useMemo(() => {
    const todayStr = today.toISOString().slice(0, 10);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const leadsHoje = leads.filter(
      (l) => l.data_entrada && l.data_entrada.slice(0, 10) === todayStr
    ).length;

    const followUps = leads.filter((l) => {
      if (!l.data_ultimo_contato) return l.status === "atendimento" || l.status === "visita";
      const last = new Date(l.data_ultimo_contato);
      return (
        daysDiff(today, last) >= 2 &&
        !["convertido", "perdido"].includes(l.status)
      );
    }).length;

    const propostasAbertas = leads.filter((l) => l.status === "proposta").length;

    const conversoesMes = leads.filter(
      (l) =>
        l.status === "convertido" &&
        l.data_ultimo_contato &&
        new Date(l.data_ultimo_contato) >= monthStart
    ).length;

    return { leadsHoje, followUps, propostasAbertas, conversoesMes };
  }, [leads, today]);

  const pendingActions = useMemo(() => {
    const semContato = leads.filter((l) => {
      if (["convertido", "perdido"].includes(l.status)) return false;
      if (agendaMode === "minha" && l.vendedor_id !== perfil?.id) return false;
      const ref = l.data_ultimo_contato || l.data_entrada;
      if (!ref) return true;
      return daysDiff(today, new Date(ref)) >= 3;
    });

    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (7 - today.getDay()));

    const propostasExpirando = leads.filter((l) => {
      if (l.status !== "proposta") return false;
      if (agendaMode === "minha" && l.vendedor_id !== perfil?.id) return false;
      if (!l.data_ultimo_contato) return true;
      const lastContact = new Date(l.data_ultimo_contato);
      return daysDiff(today, lastContact) >= 5;
    });

    return { semContato, propostasExpirando };
  }, [leads, today, agendaMode, perfil?.id]);

  const alerts = useMemo(() => {
    const items: string[] = [];
    if (pendingActions.semContato.length >= 5) {
      items.push(
        `${pendingActions.semContato.length} leads sem contato há mais de 3 dias`
      );
    }
    if (pendingActions.propostasExpirando.length >= 3) {
      items.push(
        `${pendingActions.propostasExpirando.length} propostas podem estar esfriando`
      );
    }
    const perdidosMes = leads.filter(
      (l) =>
        l.status === "perdido" &&
        l.data_ultimo_contato &&
        new Date(l.data_ultimo_contato) >= new Date(today.getFullYear(), today.getMonth(), 1)
    ).length;
    if (perdidosMes >= 3) {
      items.push(`${perdidosMes} leads perdidos este mês — revisar abordagem`);
    }
    return items;
  }, [leads, pendingActions, today]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Carregando painel...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<UserPlus className="h-4 w-4" />}
          label="Leads novos hoje"
          value={metrics.leadsHoje}
          color="#1E6FBF"
        />
        <MetricCard
          icon={<PhoneForwarded className="h-4 w-4" />}
          label="Follow-ups pendentes"
          value={metrics.followUps}
          color="#E5A000"
        />
        <MetricCard
          icon={<FileText className="h-4 w-4" />}
          label="Propostas abertas"
          value={metrics.propostasAbertas}
          color="#7C3AED"
        />
        <MetricCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Conversões do mês"
          value={metrics.conversoesMes}
          color="#12B76A"
        />
      </div>

      {/* Week Agenda */}
      <Card className="p-4" style={{ border: "1px solid #E8ECF2" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "#0D1117" }}>
            Agenda da semana
          </h2>
          <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: "#F5F7FA" }}>
            <button
              onClick={() => setAgendaMode("minha")}
              className="flex items-center gap-1 rounded-md px-3 py-1.5 transition-colors"
              style={{
                fontSize: 12,
                fontWeight: 500,
                background: agendaMode === "minha" ? "#FFFFFF" : "transparent",
                color: agendaMode === "minha" ? "#1E6FBF" : "#6B7A90",
                boxShadow: agendaMode === "minha" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
              }}
            >
              <User className="h-3 w-3" /> Minha agenda
            </button>
            <button
              onClick={() => setAgendaMode("equipe")}
              className="flex items-center gap-1 rounded-md px-3 py-1.5 transition-colors"
              style={{
                fontSize: 12,
                fontWeight: 500,
                background: agendaMode === "equipe" ? "#FFFFFF" : "transparent",
                color: agendaMode === "equipe" ? "#1E6FBF" : "#6B7A90",
                boxShadow: agendaMode === "equipe" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
              }}
            >
              <Users className="h-3 w-3" /> Equipe
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const isToday = day.toDateString() === today.toDateString();
            const dayLeads = leads.filter((l) => {
              if (agendaMode === "minha" && l.vendedor_id !== perfil?.id) return false;
              const ref = l.data_ultimo_contato || l.data_entrada;
              return ref && ref.slice(0, 10) === day.toISOString().slice(0, 10);
            });
            return (
              <div
                key={day.toISOString()}
                className="flex flex-col items-center rounded-lg p-2 transition-colors"
                style={{
                  background: isToday ? "#EBF4FF" : "#F9FAFB",
                  border: isToday ? "1.5px solid #1E6FBF" : "1px solid #E8ECF2",
                }}
              >
                <span style={{ fontSize: 11, color: "#6B7A90", fontWeight: 500 }}>
                  {WEEKDAY_NAMES[day.getDay()]}
                </span>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: isToday ? 700 : 500,
                    color: isToday ? "#1E6FBF" : "#0D1117",
                  }}
                >
                  {day.getDate()}
                </span>
                {dayLeads.length > 0 && (
                  <span
                    className="mt-1 inline-flex items-center justify-center rounded-full"
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      background: isToday ? "#1E6FBF" : "#E8ECF2",
                      color: isToday ? "#FFFFFF" : "#6B7A90",
                      width: 18,
                      height: 18,
                    }}
                  >
                    {dayLeads.length}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Ações Pendentes */}
      <Card className="p-4" style={{ border: "1px solid #E8ECF2" }}>
        <h2 className="mb-3" style={{ fontSize: 14, fontWeight: 600, color: "#0D1117" }}>
          Ações pendentes
        </h2>

        {pendingActions.semContato.length === 0 &&
        pendingActions.propostasExpirando.length === 0 ? (
          <p style={{ fontSize: 13, color: "#6B7A90" }}>
            Nenhuma ação pendente no momento.
          </p>
        ) : (
          <div className="space-y-2">
            {pendingActions.semContato.slice(0, 5).map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{ background: "#FFF8E6", border: "1px solid #F5E6B8" }}
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" style={{ color: "#E5A000" }} />
                  <span style={{ fontSize: 13, color: "#0D1117" }}>
                    <strong>{lead.nome}</strong> — sem contato há{" "}
                    {daysDiff(today, new Date(lead.data_ultimo_contato || lead.data_entrada || ""))} dias
                  </span>
                </div>
                <Badge variant="outline" style={{ fontSize: 11, color: "#E5A000", borderColor: "#E5A000" }}>
                  Follow-up
                </Badge>
              </div>
            ))}

            {pendingActions.propostasExpirando.slice(0, 5).map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{ background: "#F3EEFF", border: "1px solid #E0D4F5" }}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5" style={{ color: "#7C3AED" }} />
                  <span style={{ fontSize: 13, color: "#0D1117" }}>
                    <strong>{lead.nome}</strong> — proposta pode estar esfriando
                  </span>
                </div>
                <Badge variant="outline" style={{ fontSize: 11, color: "#7C3AED", borderColor: "#7C3AED" }}>
                  Proposta
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Alertas */}
      {alerts.length > 0 && (
        <Card className="p-4" style={{ border: "1px solid #FECACA", background: "#FFF5F5" }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4" style={{ color: "#E53935" }} />
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "#E53935" }}>Alertas</h2>
          </div>
          <ul className="space-y-1.5">
            {alerts.map((alert, i) => (
              <li key={i} className="flex items-center gap-2" style={{ fontSize: 13, color: "#0D1117" }}>
                <span style={{ width: 4, height: 4, borderRadius: 999, background: "#E53935", flexShrink: 0 }} />
                {alert}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card
      className="flex items-center gap-3 p-4"
      style={{ border: "1px solid #E8ECF2" }}
    >
      <div
        className="flex items-center justify-center rounded-lg"
        style={{ width: 36, height: 36, background: `${color}12`, color }}
      >
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 22, fontWeight: 700, color: "#0D1117", lineHeight: 1.1 }}>
          {value}
        </p>
        <p style={{ fontSize: 12, color: "#6B7A90", marginTop: 2 }}>{label}</p>
      </div>
    </Card>
  );
}
