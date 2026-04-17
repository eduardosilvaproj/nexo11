import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AppRole = "admin" | "gerente" | "vendedor" | "tecnico" | "montador" | "franqueador";

type Membro = { id: string; nome: string; role: AppRole };
type Contrato = {
  id: string;
  vendedor_id: string | null;
  valor_venda: number;
  status: string;
  data_criacao: string;
};
type DreRow = { contrato_id: string; margem_realizada: number };
type Lead = { vendedor_id: string | null; status: string; data_entrada: string };
type Ponto = { usuario_id: string; tipo: "entrada" | "saida"; registrado_em: string };

const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Admin",
  gerente: "Gerente",
  vendedor: "Vendedor",
  tecnico: "Técnico",
  montador: "Montador",
  franqueador: "Franqueador",
};

// Monthly goal per vendedor (fallback flat target — no DB field exists)
const META_MENSAL_VENDEDOR = 50000;

function buildMonthOptions(months = 12) {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    opts.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return opts;
}

function monthRange(value: string): { start: Date; end: Date } {
  const [y, m] = value.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);
  return { start, end };
}

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function fmtHours(ms: number) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h${m.toString().padStart(2, "0")}`;
}
function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function scoreColor(score: number) {
  if (score >= 71) return { bg: "#E6F7EE", fg: "#0E8A52" };
  if (score >= 41) return { bg: "#FEF3E2", fg: "#A05A0E" };
  return { bg: "#FDECEC", fg: "#A2231D" };
}
function pctColor(pct: number) {
  if (pct >= 100) return "#12B76A";
  if (pct >= 70) return "#E8A020";
  return "#E53935";
}

export function DesempenhoTab() {
  const monthOptions = useMemo(() => buildMonthOptions(12), []);
  const [mes, setMes] = useState<string>(monthOptions[0].value);
  const [membroId, setMembroId] = useState<string>("all");

  const { start, end } = useMemo(() => monthRange(mes), [mes]);

  // Members + roles
  const { data: membros } = useQuery({
    queryKey: ["desempenho-membros"],
    queryFn: async (): Promise<Membro[]> => {
      const { data: us, error } = await supabase
        .from("usuarios")
        .select("id, nome")
        .order("nome");
      if (error) throw error;
      const ids = (us ?? []).map((u) => u.id);
      if (!ids.length) return [];
      const { data: rs } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", ids);
      const roleByUser = new Map<string, AppRole>();
      rs?.forEach((r) => {
        if (!roleByUser.has(r.user_id)) roleByUser.set(r.user_id, r.role as AppRole);
      });
      return (us ?? []).map((u) => ({
        id: u.id,
        nome: u.nome,
        role: roleByUser.get(u.id) ?? "vendedor",
      }));
    },
  });

  // Contratos created in month
  const { data: contratos } = useQuery({
    queryKey: ["desempenho-contratos", mes],
    queryFn: async (): Promise<Contrato[]> => {
      const { data, error } = await supabase
        .from("contratos")
        .select("id, vendedor_id, valor_venda, status, data_criacao")
        .gte("data_criacao", start.toISOString())
        .lt("data_criacao", end.toISOString());
      if (error) throw error;
      return (data ?? []) as Contrato[];
    },
  });

  // DRE for those contratos
  const contratoIds = useMemo(() => (contratos ?? []).map((c) => c.id), [contratos]);
  const { data: dre } = useQuery({
    queryKey: ["desempenho-dre", contratoIds.join(",")],
    enabled: contratoIds.length > 0,
    queryFn: async (): Promise<DreRow[]> => {
      const { data, error } = await supabase
        .from("dre_contrato")
        .select("contrato_id, margem_realizada")
        .in("contrato_id", contratoIds);
      if (error) throw error;
      return (data ?? []) as DreRow[];
    },
  });

  // Leads (for conversion)
  const { data: leads } = useQuery({
    queryKey: ["desempenho-leads", mes],
    queryFn: async (): Promise<Lead[]> => {
      const { data, error } = await supabase
        .from("leads")
        .select("vendedor_id, status, data_entrada")
        .gte("data_entrada", start.toISOString())
        .lt("data_entrada", end.toISOString());
      if (error) throw error;
      return (data ?? []) as Lead[];
    },
  });

  // Ponto for the month
  const { data: pontos } = useQuery({
    queryKey: ["desempenho-pontos", mes],
    queryFn: async (): Promise<Ponto[]> => {
      const { data, error } = await supabase
        .from("registros_ponto")
        .select("usuario_id, tipo, registrado_em")
        .gte("registrado_em", start.toISOString())
        .lt("registrado_em", end.toISOString())
        .order("registrado_em", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Ponto[];
    },
  });

  const margemByContrato = useMemo(() => {
    const m = new Map<string, number>();
    dre?.forEach((d) => m.set(d.contrato_id, Number(d.margem_realizada) || 0));
    return m;
  }, [dre]);

  const horasByUser = useMemo(() => {
    const map = new Map<string, number>();
    const grouped = new Map<string, Ponto[]>();
    (pontos ?? []).forEach((p) => {
      const key = `${p.usuario_id}|${new Date(p.registrado_em).toDateString()}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(p);
    });
    grouped.forEach((recs, key) => {
      const userId = key.split("|")[0];
      const ent = recs.find((r) => r.tipo === "entrada");
      const sai = [...recs].reverse().find((r) => r.tipo === "saida");
      if (ent && sai) {
        const dur = new Date(sai.registrado_em).getTime() - new Date(ent.registrado_em).getTime();
        map.set(userId, (map.get(userId) ?? 0) + Math.max(0, dur));
      }
    });
    return map;
  }, [pontos]);

  const stats = useMemo(() => {
    const list = (membros ?? []).map((m) => {
      const contratosM = (contratos ?? []).filter((c) => c.vendedor_id === m.id);
      const faturamento = contratosM.reduce((s, c) => s + Number(c.valor_venda || 0), 0);
      const margens = contratosM
        .map((c) => margemByContrato.get(c.id))
        .filter((v): v is number => typeof v === "number");
      const margemMedia = margens.length
        ? margens.reduce((a, b) => a + b, 0) / margens.length
        : 0;
      const leadsM = (leads ?? []).filter((l) => l.vendedor_id === m.id);
      const conversao = leadsM.length
        ? (leadsM.filter((l) => l.status === "convertido").length / leadsM.length) * 100
        : 0;
      const horasMs = horasByUser.get(m.id) ?? 0;

      // Score (0–100): weighted blend; vendedores get conversion weight, others get hours weight
      let score = 0;
      if (m.role === "vendedor") {
        const fatPct = clamp((faturamento / META_MENSAL_VENDEDOR) * 100);
        score = Math.round(0.45 * fatPct + 0.3 * clamp(margemMedia * 2.5) + 0.25 * clamp(conversao));
      } else {
        const horasPct = clamp((horasMs / (160 * 3600000)) * 100);
        const margemPct = clamp(margemMedia * 2.5);
        score = Math.round(0.6 * horasPct + 0.4 * margemPct);
      }

      return { membro: m, contratos: contratosM.length, faturamento, margemMedia, conversao, horasMs, score };
    });
    return list;
  }, [membros, contratos, leads, margemByContrato, horasByUser]);

  const filteredStats = useMemo(
    () => (membroId === "all" ? stats : stats.filter((s) => s.membro.id === membroId)),
    [stats, membroId],
  );

  const vendedoresStats = useMemo(
    () => filteredStats.filter((s) => s.membro.role === "vendedor"),
    [filteredStats],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div style={{ width: 200 }}>
          <Select value={mes} onValueChange={setMes}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div style={{ width: 220 }}>
          <Select value={membroId} onValueChange={setMembroId}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todos os membros" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os membros</SelectItem>
              {(membros ?? []).map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div
        className="overflow-x-auto rounded-xl bg-white"
        style={{ border: "0.5px solid #E8ECF2", padding: 16 }}
      >
        <table className="w-full" style={{ fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #E8ECF2" }}>
              {["Membro", "Papel", "Contratos", "Faturamento", "Margem média", "Horas mês", "Score"].map(
                (h, i) => (
                  <th
                    key={h}
                    className="py-2 px-2"
                    style={{
                      fontSize: 12,
                      color: "#6B7A90",
                      fontWeight: 500,
                      textAlign: i >= 2 ? "right" : "left",
                    }}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {filteredStats.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center" style={{ color: "#6B7A90" }}>
                  Sem dados para este período
                </td>
              </tr>
            )}
            {filteredStats.map((s) => {
              const sc = scoreColor(s.score);
              return (
                <tr key={s.membro.id} style={{ borderBottom: "0.5px solid #E8ECF2" }}>
                  <td className="py-2 px-2" style={{ color: "#0D1117" }}>{s.membro.nome}</td>
                  <td className="py-2 px-2" style={{ color: "#6B7A90" }}>{ROLE_LABEL[s.membro.role]}</td>
                  <td className="py-2 px-2 text-right" style={{ color: "#0D1117" }}>{s.contratos}</td>
                  <td className="py-2 px-2 text-right" style={{ color: "#0D1117" }}>{fmtBRL(s.faturamento)}</td>
                  <td className="py-2 px-2 text-right" style={{ color: "#0D1117" }}>
                    {s.margemMedia.toFixed(1)}%
                  </td>
                  <td className="py-2 px-2 text-right" style={{ color: "#0D1117" }}>
                    {fmtHours(s.horasMs)}
                  </td>
                  <td className="py-2 px-2 text-right">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5"
                      style={{
                        backgroundColor: sc.bg,
                        color: sc.fg,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {s.score}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Vendedor cards */}
      {vendedoresStats.length > 0 && (
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#0D1117", marginBottom: 12 }}>
            Vendedores · meta mensal
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {vendedoresStats.map((s) => {
              const pct = (s.faturamento / META_MENSAL_VENDEDOR) * 100;
              const pctClamped = clamp(pct, 0, 100);
              const color = pctColor(pct);
              return (
                <div
                  key={s.membro.id}
                  className="rounded-xl bg-white p-4"
                  style={{ border: "0.5px solid #E8ECF2" }}
                >
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#0D1117" }}>
                    {s.membro.nome}
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {[
                      { label: "Contratos", value: String(s.contratos) },
                      { label: "Faturamento", value: fmtBRL(s.faturamento) },
                      { label: "Margem", value: `${s.margemMedia.toFixed(1)}%` },
                      { label: "Conversão", value: `${s.conversao.toFixed(0)}%` },
                    ].map((m) => (
                      <div key={m.label}>
                        <p style={{ fontSize: 11, color: "#6B7A90" }}>{m.label}</p>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "#0D1117", marginTop: 2 }}>
                          {m.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: 12, color: "#6B7A90" }}>
                        Meta: {fmtBRL(META_MENSAL_VENDEDOR)}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color }}>
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div
                      className="mt-1.5 h-2 w-full overflow-hidden rounded-full"
                      style={{ backgroundColor: "#F1F2F4" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pctClamped}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
