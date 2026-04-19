import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

type Status = "pendente" | "agendado" | "concluido" | "pago";

const STATUS_STYLE: Record<Status, { bg: string; color: string; label: string }> = {
  pendente: { bg: "#F1F3F7", color: "#6B7A90", label: "Pendente" },
  agendado: { bg: "#E3F0FB", color: "#1E6FBF", label: "Agendado" },
  concluido: { bg: "#E6F4EA", color: "#05873C", label: "Concluído" },
  pago: { bg: "#EFE5FB", color: "#6E3FBF", label: "Pago" },
};

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const sb = supabase as unknown as { from: (t: string) => any };

export function AmbientesMontagemList() {
  const navigate = useNavigate();
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [montadorFiltro, setMontadorFiltro] = useState<string>("todos");
  const [periodoIni, setPeriodoIni] = useState<string>("");
  const [periodoFim, setPeriodoFim] = useState<string>("");

  // Montadores para filtro
  const { data: montadores = [] } = useQuery({
    queryKey: ["montadores-filtro"],
    queryFn: async () => {
      const { data } = await sb
        .from("tecnicos_montadores")
        .select("id, nome")
        .contains("funcoes", ["montador"])
        .eq("ativo", true)
        .order("nome");
      return (data ?? []) as Array<{ id: string; nome: string }>;
    },
  });

  // Ambientes (status_montagem ≠ pago)
  const { data: ambientes = [], isLoading } = useQuery({
    queryKey: ["ambientes-montagem-todos"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("contrato_ambientes")
        .select(
          "id, nome, valor_montador, status_montagem, data_montagem, montador_id, contrato_id, contratos:contrato_id(id, cliente_nome), tecnicos_montadores:montador_id(nome)",
        )
        .neq("status_montagem", "pago")
        .order("data_montagem", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const filtrados = useMemo(() => {
    return (ambientes ?? []).filter((a: any) => {
      if (statusFiltro !== "todos" && a.status_montagem !== statusFiltro) return false;
      if (montadorFiltro !== "todos" && a.montador_id !== montadorFiltro) return false;
      if (periodoIni && (!a.data_montagem || a.data_montagem < periodoIni)) return false;
      if (periodoFim && (!a.data_montagem || a.data_montagem > periodoFim)) return false;
      return true;
    });
  }, [ambientes, statusFiltro, montadorFiltro, periodoIni, periodoFim]);

  return (
    <div className="flex flex-col gap-4">
      {/* Filtros */}
      <div
        className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4"
        style={{ border: "0.5px solid #E8ECF2" }}
      >
        <div className="flex flex-col gap-1">
          <label style={{ fontSize: 11, color: "#6B7A90" }}>Status</label>
          <Select value={statusFiltro} onValueChange={setStatusFiltro}>
            <SelectTrigger style={{ width: 160, height: 34 }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="agendado">Agendado</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label style={{ fontSize: 11, color: "#6B7A90" }}>Montador</label>
          <Select value={montadorFiltro} onValueChange={setMontadorFiltro}>
            <SelectTrigger style={{ width: 200, height: 34 }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {montadores.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label style={{ fontSize: 11, color: "#6B7A90" }}>De</label>
          <Input
            type="date"
            value={periodoIni}
            onChange={(e) => setPeriodoIni(e.target.value)}
            style={{ height: 34, width: 160 }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label style={{ fontSize: 11, color: "#6B7A90" }}>Até</label>
          <Input
            type="date"
            value={periodoFim}
            onChange={(e) => setPeriodoFim(e.target.value)}
            style={{ height: 34, width: 160 }}
          />
        </div>
        <div className="ml-auto" style={{ fontSize: 12, color: "#6B7A90" }}>
          {filtrados.length} ambiente{filtrados.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Tabela */}
      <div
        className="rounded-xl bg-white"
        style={{ border: "0.5px solid #E8ECF2", overflow: "hidden" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: 980 }}>
            <thead style={{ backgroundColor: "#F7F9FC" }}>
              <tr>
                {["Contrato", "Cliente", "Ambiente", "Montador", "Data", "Valor", "Status"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-3 py-3 text-left"
                      style={{
                        fontSize: 11,
                        color: "#6B7A90",
                        fontWeight: 500,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Carregando...
                  </td>
                </tr>
              )}
              {!isLoading && filtrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Nenhum ambiente encontrado para os filtros aplicados.
                  </td>
                </tr>
              )}
              {filtrados.map((a: any) => {
                const status = (a.status_montagem ?? "pendente") as Status;
                const st = STATUS_STYLE[status];
                const data = a.data_montagem
                  ? format(new Date(a.data_montagem + "T00:00:00"), "dd/MM/yyyy")
                  : "—";
                return (
                  <tr
                    key={a.id}
                    onClick={() => navigate(`/contratos/${a.contrato_id}?tab=montagem`)}
                    className="cursor-pointer hover:bg-[#FAFBFD]"
                    style={{ borderTop: "0.5px solid #E8ECF2" }}
                  >
                    <td className="px-3 py-2 text-sm" style={{ color: "#0D1117", fontFamily: "monospace" }}>
                      #{String(a.contrato_id).slice(0, 4)}
                    </td>
                    <td className="px-3 py-2 text-sm" style={{ color: "#0D1117" }}>
                      {a.contratos?.cliente_nome ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-sm font-medium" style={{ color: "#0D1117" }}>
                      {a.nome}
                    </td>
                    <td className="px-3 py-2 text-sm" style={{ color: "#0D1117" }}>
                      {a.tecnicos_montadores?.nome ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-sm" style={{ color: "#0D1117", whiteSpace: "nowrap" }}>
                      {data}
                    </td>
                    <td className="px-3 py-2 text-sm" style={{ color: "#0D1117", whiteSpace: "nowrap" }}>
                      {fmtBRL(Number(a.valor_montador))}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="inline-flex rounded-full px-2 py-0.5"
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          backgroundColor: st.bg,
                          color: st.color,
                        }}
                      >
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
