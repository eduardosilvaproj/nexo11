import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";

type StatusMontagem = "pendente" | "agendado" | "concluido" | "pago";

interface Ambiente {
  id: string;
  contrato_id: string;
  loja_id: string;
  nome: string;
  valor_bruto: number;
  desconto_percentual: number;
  valor_liquido: number;
  montador_id: string | null;
  percentual_montador: number;
  valor_montador: number;
  status_montagem: StatusMontagem;
  data_montagem: string | null;
  observacoes: string | null;
}

interface MontadorOpt {
  id: string;
  nome: string;
  percentual_padrao: number;
  ativo: boolean;
}

const STATUS_STYLE: Record<StatusMontagem, { bg: string; color: string; label: string }> = {
  pendente: { bg: "#F1F3F7", color: "#6B7A90", label: "Pendente" },
  agendado: { bg: "#E3F0FB", color: "#1E6FBF", label: "Agendado" },
  concluido: { bg: "#E6F4EA", color: "#05873C", label: "Concluído" },
  pago: { bg: "#EFE5FB", color: "#6E3FBF", label: "Pago" },
};

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

// Helper typed any-cast for tables not yet in generated types
const sb = supabase as unknown as {
  from: (t: string) => any;
};

interface Props {
  contratoId: string;
  contratoLojaId: string;
}

export function ContratoAmbientesTab({ contratoId, contratoLojaId }: Props) {
  const qc = useQueryClient();
  const { perfil } = useAuth();
  const lojaId = contratoLojaId || perfil?.loja_id || null;
  const [importing, setImporting] = useState(false);

  const { data: ambientes, isLoading } = useQuery<Ambiente[]>({
    queryKey: ["contrato_ambientes", contratoId],
    enabled: !!contratoId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("contrato_ambientes")
        .select("*")
        .eq("contrato_id", contratoId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Ambiente[];
    },
  });

  const { data: montadores } = useQuery<MontadorOpt[]>({
    queryKey: ["montadores-options", lojaId],
    enabled: !!lojaId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("montadores")
        .select("id, nome, percentual_padrao, ativo")
        .eq("loja_id", lojaId)
        .eq("ativo", true)
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MontadorOpt[];
    },
  });

  // Auto-import dos ambientes a partir do orçamento (categorias)
  useEffect(() => {
    const tryImport = async () => {
      if (!contratoId || !lojaId || isLoading) return;
      if ((ambientes?.length ?? 0) > 0) return;
      if (importing) return;
      setImporting(true);
      try {
        // Buscar orçamento convertido vinculado ao contrato; fallback para qualquer orçamento
        let { data: orc, error } = await supabase
          .from("orcamentos")
          .select("categorias")
          .eq("contrato_id", contratoId)
          .eq("status", "convertido")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (!orc) {
          const fb = await supabase
            .from("orcamentos")
            .select("categorias")
            .eq("contrato_id", contratoId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (fb.error) throw fb.error;
          orc = fb.data;
        }
        const catsRaw = (orc?.categorias as Array<Record<string, unknown>> | null) ?? [];
        // Filtrar apenas TABLEs (ambientes) — outros tipos (categorias agregadoras) são ignorados
        const cats = catsRaw.filter((c) => {
          const t = String((c as any).type ?? (c as any).tipo ?? "").toUpperCase();
          return !t || t === "TABLE";
        });
        if (!cats.length) return;
        const rows = cats.map((c) => {
          const tabela = Number(
            (c as any).tabela ?? (c as any).valor_bruto ?? (c as any).valor ?? (c as any).total ?? 0
          );
          return {
            contrato_id: contratoId,
            loja_id: lojaId,
            nome: String((c as any).description ?? (c as any).nome ?? (c as any).name ?? "Ambiente"),
            valor_bruto: tabela,
            desconto_percentual: 0,
            percentual_montador: 0,
            status_montagem: "pendente" as const,
          };
        });
        const { error: insErr } = await sb.from("contrato_ambientes").insert(rows);
        if (insErr) throw insErr;
        qc.invalidateQueries({ queryKey: ["contrato_ambientes", contratoId] });
        toast.success(`${rows.length} ambiente${rows.length === 1 ? "" : "s"} importado${rows.length === 1 ? "" : "s"} do orçamento`);
      } catch (e) {
        // Silencioso — usuário pode adicionar manualmente
        console.warn("Import ambientes:", e);
      } finally {
        setImporting(false);
      }
    };
    tryImport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contratoId, lojaId, ambientes?.length, isLoading]);

  const updateAmbiente = async (id: string, patch: Partial<Ambiente>) => {
    const { error } = await sb.from("contrato_ambientes").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["contrato_ambientes", contratoId] });
  };

  const handleMontadorChange = (a: Ambiente, montadorId: string) => {
    const realId = montadorId === "__none__" ? null : montadorId;
    const m = montadores?.find((x) => x.id === realId);
    updateAmbiente(a.id, {
      montador_id: realId,
      percentual_montador: m ? Number(m.percentual_padrao) : a.percentual_montador,
    });
  };

  const handleAddAmbiente = async () => {
    if (!lojaId) return;
    const { error } = await sb.from("contrato_ambientes").insert({
      contrato_id: contratoId,
      loja_id: lojaId,
      nome: "Novo ambiente",
      valor_bruto: 0,
      desconto_percentual: 0,
      percentual_montador: 0,
      status_montagem: "pendente",
    });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["contrato_ambientes", contratoId] });
  };

  const handleDelete = async (id: string) => {
    const { error } = await sb.from("contrato_ambientes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["contrato_ambientes", contratoId] });
  };

  const totals = useMemo(() => {
    const list = ambientes ?? [];
    const totalLiquido = list.reduce((s, a) => s + Number(a.valor_liquido || 0), 0);
    const totalMontador = list.reduce((s, a) => s + Number(a.valor_montador || 0), 0);
    const counts: Record<StatusMontagem, number> = { pendente: 0, agendado: 0, concluido: 0, pago: 0 };
    list.forEach((a) => { counts[a.status_montagem] = (counts[a.status_montagem] ?? 0) + 1; });
    return { totalLiquido, totalMontador, counts };
  }, [ambientes]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0D1117" }}>Ambientes</h2>
          <p style={{ fontSize: 12, color: "#6B7A90" }}>
            {importing ? "Importando ambientes do orçamento..." : "Gestão de ambientes, descontos e comissão por montador"}
          </p>
        </div>
        <Button onClick={handleAddAmbiente} style={{ backgroundColor: "#1E6FBF", color: "#fff" }}>
          <Plus className="mr-2 h-4 w-4" /> Novo Ambiente
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl bg-white" style={{ border: "0.5px solid #E8ECF2" }}>
        <table className="w-full">
          <thead style={{ backgroundColor: "#F7F9FC" }}>
            <tr>
              {["Ambiente", "Valor bruto", "Desc %", "Valor líquido", "Montador", "%", "Valor montador", "Status", "Ações"].map((h) => (
                <th key={h} className="px-3 py-3 text-left" style={{ fontSize: 11, color: "#6B7A90", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-muted-foreground">Carregando...</td></tr>
            )}
            {!isLoading && (ambientes?.length ?? 0) === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-muted-foreground">
                Nenhum ambiente cadastrado. Clique em "Novo Ambiente" ou importe um orçamento.
              </td></tr>
            )}
            {ambientes?.map((a) => {
              const st = STATUS_STYLE[a.status_montagem];
              return (
                <tr key={a.id} style={{ borderTop: "0.5px solid #E8ECF2" }}>
                  <td className="px-3 py-2">
                    <Input
                      defaultValue={a.nome}
                      onBlur={(e) => e.target.value !== a.nome && updateAmbiente(a.id, { nome: e.target.value })}
                      style={{ height: 32, fontSize: 13 }}
                    />
                  </td>
                  <td className="px-3 py-2" style={{ width: 120 }}>
                    <Input
                      type="number"
                      step="0.01"
                      defaultValue={Number(a.valor_bruto)}
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value) || 0;
                        if (v !== Number(a.valor_bruto)) updateAmbiente(a.id, { valor_bruto: v });
                      }}
                      style={{ height: 32, fontSize: 13 }}
                    />
                  </td>
                  <td className="px-3 py-2" style={{ width: 90 }}>
                    <Input
                      type="number"
                      step="0.01"
                      defaultValue={Number(a.desconto_percentual)}
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value) || 0;
                        if (v !== Number(a.desconto_percentual)) updateAmbiente(a.id, { desconto_percentual: v });
                      }}
                      style={{ height: 32, fontSize: 13 }}
                    />
                  </td>
                  <td className="px-3 py-2 text-sm font-medium" style={{ color: "#0D1117" }}>
                    {fmtBRL(Number(a.valor_liquido))}
                  </td>
                  <td className="px-3 py-2" style={{ minWidth: 160 }}>
                    <Select
                      value={a.montador_id ?? "__none__"}
                      onValueChange={(v) => handleMontadorChange(a, v)}
                    >
                      <SelectTrigger style={{ height: 32, fontSize: 13 }}>
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Sem montador —</SelectItem>
                        {montadores?.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2" style={{ width: 80 }}>
                    <Input
                      type="number"
                      step="0.01"
                      defaultValue={Number(a.percentual_montador)}
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value) || 0;
                        if (v !== Number(a.percentual_montador)) updateAmbiente(a.id, { percentual_montador: v });
                      }}
                      style={{ height: 32, fontSize: 13 }}
                    />
                  </td>
                  <td className="px-3 py-2 text-sm" style={{ color: "#0D1117" }}>
                    {fmtBRL(Number(a.valor_montador))}
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      value={a.status_montagem}
                      onValueChange={(v) => updateAmbiente(a.id, { status_montagem: v as StatusMontagem })}
                    >
                      <SelectTrigger style={{ height: 28, fontSize: 12, backgroundColor: st.bg, color: st.color, border: "none", fontWeight: 500, width: 120 }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="agendado">Agendado</SelectItem>
                        <SelectItem value="concluido">Concluído</SelectItem>
                        <SelectItem value="pago">Pago</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)}>
                      <Trash2 className="h-4 w-4" style={{ color: "#E53935" }} />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {(ambientes?.length ?? 0) > 0 && (
          <div
            className="grid gap-4 px-4 py-3"
            style={{
              gridTemplateColumns: "1fr 1fr 1fr",
              borderTop: "0.5px solid #E8ECF2",
              backgroundColor: "#F7F9FC",
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: "#6B7A90", textTransform: "uppercase", letterSpacing: "0.04em" }}>Total líquido ambientes</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#0D1117" }}>{fmtBRL(totals.totalLiquido)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#6B7A90", textTransform: "uppercase", letterSpacing: "0.04em" }}>Total a pagar montadores</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#6E3FBF" }}>{fmtBRL(totals.totalMontador)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#6B7A90", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Por status</div>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(STATUS_STYLE) as StatusMontagem[]).map((k) => (
                  <span key={k} style={{ fontSize: 12, padding: "2px 8px", borderRadius: 12, backgroundColor: STATUS_STYLE[k].bg, color: STATUS_STYLE[k].color, fontWeight: 500 }}>
                    {STATUS_STYLE[k].label}: {totals.counts[k]}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
