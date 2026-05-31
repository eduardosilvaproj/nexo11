import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users } from "lucide-react";

const sb = supabase as unknown as { from: (t: string) => any };

function diffHoras(ini?: string | null, fim?: string | null): number {
  if (!ini || !fim) return 0;
  const [h1, m1] = ini.split(":").map(Number);
  const [h2, m2] = fim.split(":").map(Number);
  return Math.max(0, (h2 + m2 / 60) - (h1 + m1 / 60));
}

type Periodo = "mes_atual" | "ultimos_30" | "custom";

export function MontagemProdutividade() {
  const { perfil } = useAuth();
  const lojaId = perfil?.loja_id;

  const [periodo, setPeriodo] = useState<Periodo>("mes_atual");
  const [customIni, setCustomIni] = useState("");
  const [customFim, setCustomFim] = useState("");

  const { inicioStr, fimStr } = useMemo(() => {
    const hoje = new Date();
    if (periodo === "mes_atual") {
      return {
        inicioStr: format(startOfMonth(hoje), "yyyy-MM-dd"),
        fimStr: format(endOfMonth(hoje), "yyyy-MM-dd"),
      };
    }
    if (periodo === "ultimos_30") {
      return {
        inicioStr: format(subDays(hoje, 30), "yyyy-MM-dd"),
        fimStr: format(hoje, "yyyy-MM-dd"),
      };
    }
    return {
      inicioStr: customIni || format(startOfMonth(hoje), "yyyy-MM-dd"),
      fimStr: customFim || format(endOfMonth(hoje), "yyyy-MM-dd"),
    };
  }, [periodo, customIni, customFim]);

  const { data: agendamentos = [] } = useQuery({
    queryKey: ["montagem-produtividade", lojaId, inicioStr, fimStr],
    queryFn: async () => {
      let query = sb
        .from("agendamentos_montagem")
        .select("id, data, hora_inicio, hora_fim, status, retrabalho, equipe_id, equipes(id, nome, cor)")
        .gte("data", inicioStr)
        .lte("data", fimStr);
      if (lojaId) query = query.eq("loja_id", lojaId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        data: string;
        hora_inicio: string | null;
        hora_fim: string | null;
        status: string;
        retrabalho: boolean;
        equipe_id: string;
        equipes: { id: string; nome: string; cor: string } | null;
      }>;
    },
    enabled: !!lojaId,
  });

  const rows = useMemo(() => {
    const map = new Map<
      string,
      { nome: string; cor: string; total: number; concluidas: number; retrabalhos: number; horas: number }
    >();

    agendamentos.forEach((a) => {
      const eq = a.equipes;
      if (!eq) return;
      let row = map.get(eq.id);
      if (!row) {
        row = { nome: eq.nome, cor: eq.cor, total: 0, concluidas: 0, retrabalhos: 0, horas: 0 };
        map.set(eq.id, row);
      }
      row.total++;
      if (a.status === "concluido") {
        row.concluidas++;
        row.horas += diffHoras(a.hora_inicio, a.hora_fim);
      }
      if (a.retrabalho) row.retrabalhos++;
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [agendamentos]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        total: acc.total + r.total,
        concluidas: acc.concluidas + r.concluidas,
        retrabalhos: acc.retrabalhos + r.retrabalhos,
        horas: acc.horas + r.horas,
      }),
      { total: 0, concluidas: 0, retrabalhos: 0, horas: 0 }
    );
  }, [rows]);

  function getRowColor(row: { total: number; retrabalhos: number; concluidas: number }) {
    const taxaRetrabalho = row.total > 0 ? row.retrabalhos / row.total : 0;
    if (taxaRetrabalho > 0.2) return "#FEF2F2"; // red bg for high retrabalho
    const taxaConclusao = row.total > 0 ? row.concluidas / row.total : 0;
    if (taxaConclusao >= 0.8) return "#F0FDF4"; // green bg for good productivity
    return "transparent";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Users size={16} color="#1E6FBF" />
        <h3 style={{ fontSize: 15, fontWeight: 600, color: "#0D1117", margin: 0 }}>
          Produtividade por Equipe
        </h3>
      </div>

      {/* Period selector */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <Label style={{ fontSize: 11, color: "#6B7A90" }}>Período</Label>
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
            <SelectTrigger style={{ width: 180 }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mes_atual">Mês Atual</SelectItem>
              <SelectItem value="ultimos_30">Últimos 30 dias</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {periodo === "custom" && (
          <>
            <div>
              <Label style={{ fontSize: 11, color: "#6B7A90" }}>Início</Label>
              <Input
                type="date"
                value={customIni}
                onChange={(e) => setCustomIni(e.target.value)}
                style={{ width: 150, fontSize: 12 }}
              />
            </div>
            <div>
              <Label style={{ fontSize: 11, color: "#6B7A90" }}>Fim</Label>
              <Input
                type="date"
                value={customFim}
                onChange={(e) => setCustomFim(e.target.value)}
                style={{ width: 150, fontSize: 12 }}
              />
            </div>
          </>
        )}
      </div>

      {/* Table */}
      <div
        style={{
          borderRadius: 12,
          border: "0.5px solid #E8ECF2",
          overflow: "hidden",
          background: "#fff",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#F6F8FA" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, color: "#6B7A90", fontWeight: 600 }}>Equipe</th>
              <th style={{ padding: "10px 12px", textAlign: "center", fontSize: 11, color: "#6B7A90", fontWeight: 600 }}>Montagens</th>
              <th style={{ padding: "10px 12px", textAlign: "center", fontSize: 11, color: "#6B7A90", fontWeight: 600 }}>Concluídas</th>
              <th style={{ padding: "10px 12px", textAlign: "center", fontSize: 11, color: "#6B7A90", fontWeight: 600 }}>Retrabalhos</th>
              <th style={{ padding: "10px 12px", textAlign: "center", fontSize: 11, color: "#6B7A90", fontWeight: 600 }}>Horas</th>
              <th style={{ padding: "10px 12px", textAlign: "center", fontSize: 11, color: "#6B7A90", fontWeight: 600 }}>Média h/mont.</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#6B7A90", fontSize: 12 }}>
                  Nenhum dado no período selecionado
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const media = row.concluidas > 0 ? (row.horas / row.concluidas).toFixed(1) : "-";
              return (
                <tr key={row.nome} style={{ background: getRowColor(row), borderTop: "1px solid #E8ECF2" }}>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: row.cor }} />
                      <span style={{ fontWeight: 500, color: "#0D1117" }}>{row.nome}</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "center", color: "#0D1117" }}>{row.total}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center", color: "#12B76A", fontWeight: 600 }}>{row.concluidas}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center", color: row.retrabalhos > 0 ? "#E53935" : "#0D1117", fontWeight: row.retrabalhos > 0 ? 600 : 400 }}>
                    {row.retrabalhos}
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "center", color: "#0D1117" }}>{row.horas.toFixed(1)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center", color: "#6B7A90" }}>{media}</td>
                </tr>
              );
            })}
            {/* Totals row */}
            {rows.length > 0 && (
              <tr style={{ borderTop: "2px solid #E8ECF2", background: "#F6F8FA" }}>
                <td style={{ padding: "10px 12px", fontWeight: 700, color: "#0D1117" }}>Total</td>
                <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: "#0D1117" }}>{totals.total}</td>
                <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: "#12B76A" }}>{totals.concluidas}</td>
                <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: "#E53935" }}>{totals.retrabalhos}</td>
                <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: "#0D1117" }}>{totals.horas.toFixed(1)}</td>
                <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: "#6B7A90" }}>
                  {totals.concluidas > 0 ? (totals.horas / totals.concluidas).toFixed(1) : "-"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
