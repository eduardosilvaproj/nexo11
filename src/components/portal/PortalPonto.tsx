import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  LogIn,
  LogOut,
  MapPin,
  Clock,
  CalendarDays,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

function getWeekDays() {
  const today = new Date();
  const days: Date[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  return days;
}

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function PortalPonto() {
  const { perfil } = useAuth();
  const pessoaId = perfil?.id;
  const queryClient = useQueryClient();
  const [geoStatus, setGeoStatus] = useState<string>("");

  // Today's records
  const { data: todayRecords } = useQuery({
    queryKey: ["portal-ponto-today", pessoaId],
    enabled: !!pessoaId,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("registros_ponto")
        .select("*")
        .eq("usuario_id", pessoaId)
        .gte("registrado_em", startOfTodayISO())
        .lte("registrado_em", endOfTodayISO())
        .order("registrado_em", { ascending: true });
      return data || [];
    },
  });

  // Week records
  const weekDays = getWeekDays();
  const weekStart = weekDays[0].toISOString();
  const weekEnd = new Date(weekDays[6].getTime() + 86400000 - 1).toISOString();

  const { data: weekRecords } = useQuery({
    queryKey: ["portal-ponto-week", pessoaId, weekStart],
    enabled: !!pessoaId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("registros_ponto")
        .select("*")
        .eq("usuario_id", pessoaId)
        .gte("registrado_em", weekStart)
        .lte("registrado_em", weekEnd)
        .order("registrado_em", { ascending: true });
      return data || [];
    },
  });

  // Month records
  const { start: monthStart, end: monthEnd } = getMonthRange();
  const { data: monthRecords } = useQuery({
    queryKey: ["portal-ponto-month", pessoaId, monthStart],
    enabled: !!pessoaId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("registros_ponto")
        .select("*")
        .eq("usuario_id", pessoaId)
        .gte("registrado_em", monthStart)
        .lte("registrado_em", monthEnd)
        .order("registrado_em", { ascending: true });
      return data || [];
    },
  });

  // Determine next punch type
  const lastRecord = (todayRecords || []).at(-1);
  const nextType: "entrada" | "saida" =
    !lastRecord || lastRecord.tipo === "saida" ? "entrada" : "saida";

  // Punch mutation
  const punchMutation = useMutation({
    mutationFn: async () => {
      let latitude: number | null = null;
      let longitude: number | null = null;

      // Try geolocation
      try {
        setGeoStatus("Obtendo localização...");
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
          });
        });
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
        setGeoStatus("");
      } catch {
        setGeoStatus("");
        // Continue without location
      }

      const { error } = await (supabase as any).from("registros_ponto").insert({
        usuario_id: pessoaId,
        loja_id: perfil?.loja_id,
        tipo: nextType,
        registrado_em: new Date().toISOString(),
        latitude,
        longitude,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(
        nextType === "entrada" ? "Entrada registrada!" : "Saída registrada!"
      );
      queryClient.invalidateQueries({ queryKey: ["portal-ponto"] });
      queryClient.invalidateQueries({ queryKey: ["portal-ponto-today"] });
      queryClient.invalidateQueries({ queryKey: ["portal-ponto-week"] });
      queryClient.invalidateQueries({ queryKey: ["portal-ponto-month"] });
    },
    onError: () => {
      toast.error("Erro ao registrar ponto. Tente novamente.");
    },
  });

  // Calculate today's hours
  const todayEntrada = (todayRecords || []).find((r: any) => r.tipo === "entrada");
  const todaySaida = (todayRecords || []).find((r: any) => r.tipo === "saida");
  const todayHours = todayEntrada
    ? fmtDuration(
        (todaySaida
          ? new Date(todaySaida.registrado_em).getTime()
          : Date.now()) - new Date(todayEntrada.registrado_em).getTime()
      )
    : "--";

  // Month summary
  const monthHoursMs = calculateTotalHours(monthRecords || []);
  const monthHours = fmtDuration(monthHoursMs);
  const monthDays = new Set(
    (monthRecords || []).map((r: any) =>
      new Date(r.registrado_em).toLocaleDateString("pt-BR")
    )
  ).size;

  return (
    <div className="space-y-4 pb-4">
      {/* Big Punch Button */}
      <div className="flex flex-col items-center py-6">
        <Button
          onClick={() => punchMutation.mutate()}
          disabled={punchMutation.isPending}
          className="w-40 h-40 rounded-full text-white text-lg font-bold shadow-lg"
          style={{
            backgroundColor: nextType === "entrada" ? "#12B76A" : "#E53935",
            fontSize: 16,
          }}
        >
          <div className="flex flex-col items-center gap-2">
            {nextType === "entrada" ? (
              <LogIn className="h-8 w-8" />
            ) : (
              <LogOut className="h-8 w-8" />
            )}
            <span>
              {punchMutation.isPending
                ? "Registrando..."
                : nextType === "entrada"
                ? "Bater Entrada"
                : "Bater Saída"}
            </span>
          </div>
        </Button>
        {geoStatus && (
          <div className="flex items-center gap-1 mt-2 text-xs" style={{ color: "#6B7A90" }}>
            <MapPin className="h-3 w-3" />
            {geoStatus}
          </div>
        )}
        <p className="text-xs mt-3" style={{ color: "#6B7A90" }}>
          {new Date().toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>

      {/* Today's Record */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-4 w-4" style={{ color: "#1E6FBF" }} />
          <h3 className="text-sm font-semibold" style={{ color: "#0D1117" }}>
            Hoje
          </h3>
        </div>
        <div
          className="rounded-2xl bg-white p-4"
          style={{ border: "0.5px solid #E8ECF2" }}
        >
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-[10px]" style={{ color: "#6B7A90" }}>Entrada</p>
              <p className="text-sm font-semibold" style={{ color: "#0D1117" }}>
                {todayEntrada ? fmtHM(new Date(todayEntrada.registrado_em)) : "--:--"}
              </p>
            </div>
            <div>
              <p className="text-[10px]" style={{ color: "#6B7A90" }}>Saída</p>
              <p className="text-sm font-semibold" style={{ color: "#0D1117" }}>
                {todaySaida ? fmtHM(new Date(todaySaida.registrado_em)) : "--:--"}
              </p>
            </div>
            <div>
              <p className="text-[10px]" style={{ color: "#6B7A90" }}>Horas</p>
              <p className="text-sm font-semibold" style={{ color: "#1E6FBF" }}>
                {todayHours}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Week History */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <CalendarDays className="h-4 w-4" style={{ color: "#1E6FBF" }} />
          <h3 className="text-sm font-semibold" style={{ color: "#0D1117" }}>
            Últimos 7 dias
          </h3>
        </div>
        <div className="space-y-1">
          {weekDays.map((day) => {
            const dayStr = day.toLocaleDateString("pt-BR");
            const dayRecords = (weekRecords || []).filter(
              (r: any) =>
                new Date(r.registrado_em).toLocaleDateString("pt-BR") === dayStr
            );
            const entrada = dayRecords.find((r: any) => r.tipo === "entrada");
            const saida = dayRecords.find((r: any) => r.tipo === "saida");
            const hours =
              entrada && saida
                ? fmtDuration(
                    new Date(saida.registrado_em).getTime() -
                      new Date(entrada.registrado_em).getTime()
                  )
                : entrada
                ? "em aberto"
                : "--";

            return (
              <div
                key={dayStr}
                className="flex items-center justify-between rounded-xl bg-white px-3 py-2"
                style={{ border: "0.5px solid #E8ECF2" }}
              >
                <span className="text-xs" style={{ color: "#6B7A90" }}>
                  {day.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric" })}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: "#0D1117" }}>
                    {entrada ? fmtHM(new Date(entrada.registrado_em)) : "--"}
                  </span>
                  <span className="text-xs" style={{ color: "#0D1117" }}>
                    {saida ? fmtHM(new Date(saida.registrado_em)) : "--"}
                  </span>
                  <Badge
                    variant="secondary"
                    className="text-[10px] min-w-[50px] justify-center"
                  >
                    {hours}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Monthly Summary */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="h-4 w-4" style={{ color: "#1E6FBF" }} />
          <h3 className="text-sm font-semibold" style={{ color: "#0D1117" }}>
            Resumo Mensal
          </h3>
        </div>
        <div
          className="rounded-2xl bg-white p-4"
          style={{ border: "0.5px solid #E8ECF2" }}
        >
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-bold" style={{ color: "#1E6FBF" }}>
                {monthHours}
              </p>
              <p className="text-[10px]" style={{ color: "#6B7A90" }}>Total horas</p>
            </div>
            <div>
              <p className="text-lg font-bold" style={{ color: "#0D1117" }}>
                {monthDays}
              </p>
              <p className="text-[10px]" style={{ color: "#6B7A90" }}>Dias</p>
            </div>
            <div>
              <p className="text-lg font-bold" style={{ color: "#E8A020" }}>
                0
              </p>
              <p className="text-[10px]" style={{ color: "#6B7A90" }}>Atrasos</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function calculateTotalHours(records: any[]) {
  let total = 0;
  for (let i = 0; i < records.length - 1; i++) {
    if (records[i].tipo === "entrada" && records[i + 1]?.tipo === "saida") {
      total +=
        new Date(records[i + 1].registrado_em).getTime() -
        new Date(records[i].registrado_em).getTime();
      i++; // skip the saida
    }
  }
  return total;
}
