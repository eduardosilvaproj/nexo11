import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Agendamento {
  id: string;
  contrato_id: string;
  cliente_nome: string;
  data_agendada: string;
  horario: string | null;
  endereco: string | null;
  responsavel_nome: string | null;
  tipo: "medicao" | "conferencia";
}

export function AgendaMedicoes() {
  const { perfil, user } = useAuth();
  const navigate = useNavigate();
  const [mesAtual, setMesAtual] = useState(new Date());

  const ano = mesAtual.getFullYear();
  const mes = mesAtual.getMonth();
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();

  const { data: agendamentos = [] } = useQuery({
    queryKey: ["tecnico-agenda", ano, mes, perfil?.loja_id],
    queryFn: async () => {
      const inicio = `${ano}-${String(mes + 1).padStart(2, "0")}-01`;
      const fim = `${ano}-${String(mes + 1).padStart(2, "0")}-${diasNoMes}`;

      const { data, error } = await (supabase as any)
        .from("tecnico_agendamentos")
        .select("id, contrato_id, data_agendada, horario, endereco, tipo, contratos(cliente_nome), responsavel:pessoas!tecnico_agendamentos_responsavel_id_fkey(nome)")
        .eq("loja_id", perfil!.loja_id!)
        .gte("data_agendada", inicio)
        .lte("data_agendada", fim)
        .order("data_agendada", { ascending: true })
        .order("horario", { ascending: true });

      if (error) return [];
      return (data ?? []).map((a: any) => ({
        id: a.id,
        contrato_id: a.contrato_id,
        cliente_nome: a.contratos?.cliente_nome || "—",
        data_agendada: a.data_agendada,
        horario: a.horario,
        endereco: a.endereco,
        responsavel_nome: a.responsavel?.nome || null,
        tipo: a.tipo,
      })) as Agendamento[];
    },
    enabled: !!perfil?.loja_id,
  });

  function agendamentosDoDia(dia: number) {
    const dataStr = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    return agendamentos.filter(a => a.data_agendada === dataStr);
  }

  const hoje = new Date();
  const isHoje = (dia: number) =>
    dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear();

  const mesNome = mesAtual.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="rounded-xl bg-white p-4" style={{ border: "0.5px solid #E8ECF2" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-500" />
          <h4 className="text-sm font-semibold text-slate-900 capitalize">{mesNome}</h4>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => setMesAtual(new Date(ano, mes - 1, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => setMesAtual(new Date(ano, mes + 1, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 gap-px mb-1">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-slate-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Grid do calendário */}
      <div className="grid grid-cols-7 gap-px">
        {/* Espaços vazios antes do primeiro dia */}
        {Array.from({ length: primeiroDia }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[60px]" />
        ))}

        {/* Dias do mês */}
        {Array.from({ length: diasNoMes }).map((_, i) => {
          const dia = i + 1;
          const eventos = agendamentosDoDia(dia);
          return (
            <div
              key={dia}
              className={`min-h-[60px] rounded-lg p-1 border transition-colors ${
                isHoje(dia) ? "border-blue-300 bg-blue-50/50" : "border-transparent hover:bg-slate-50"
              }`}
            >
              <div className={`text-[10px] font-medium mb-0.5 ${isHoje(dia) ? "text-blue-600" : "text-slate-600"}`}>
                {dia}
              </div>
              {eventos.slice(0, 2).map(ev => (
                <div
                  key={ev.id}
                  className="text-[9px] rounded px-1 py-0.5 mb-0.5 truncate cursor-pointer hover:opacity-80"
                  style={{
                    backgroundColor: ev.tipo === "medicao" ? "#E6F0FF" : "#EEEDFB",
                    color: ev.tipo === "medicao" ? "#1E6FBF" : "#7F77DD",
                  }}
                  title={`${ev.horario || ""} ${ev.cliente_nome} ${ev.endereco ? "- " + ev.endereco : ""}`}
                  onClick={() => navigate(`/contratos/${ev.contrato_id}/medicao`)}
                >
                  {ev.horario ? `${ev.horario} ` : ""}{ev.cliente_nome}
                </div>
              ))}
              {eventos.length > 2 && (
                <div className="text-[9px] text-slate-400 px-1">+{eventos.length - 2}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lista do dia atual */}
      {(() => {
        const eventosHoje = agendamentosDoDia(hoje.getDate());
        if (mes !== hoje.getMonth() || ano !== hoje.getFullYear() || eventosHoje.length === 0) return null;
        return (
          <div className="mt-4 border-t pt-3">
            <h5 className="text-xs font-semibold text-slate-700 mb-2">Hoje</h5>
            <div className="space-y-2">
              {eventosHoje.map(ev => (
                <div
                  key={ev.id}
                  className="flex items-center gap-3 rounded-lg border p-2 cursor-pointer hover:bg-slate-50"
                  onClick={() => navigate(`/contratos/${ev.contrato_id}/medicao`)}
                >
                  <div
                    className="w-1 h-8 rounded-full"
                    style={{ backgroundColor: ev.tipo === "medicao" ? "#1E6FBF" : "#7F77DD" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-900 truncate">{ev.cliente_nome}</div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                      {ev.horario && <span>{ev.horario}</span>}
                      {ev.endereco && (
                        <>
                          <MapPin className="h-2.5 w-2.5" />
                          <span className="truncate">{ev.endereco}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {ev.responsavel_nome && (
                    <span className="text-[10px] text-slate-400">{ev.responsavel_nome}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
