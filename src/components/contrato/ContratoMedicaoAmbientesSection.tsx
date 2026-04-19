import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StatusMed = "pendente" | "agendado" | "concluido" | "pago";
type Funcao = "medidor" | "conferente";

interface AmbienteRow {
  id: string;
  nome: string;
  valor_liquido: number;
  // dynamic fields read via key strings
  [key: string]: any;
}

interface PessoaOpt {
  id: string;
  nome: string;
  percentual_padrao: number;
}

const STATUS_STYLE: Record<StatusMed, { bg: string; color: string; label: string }> = {
  pendente: { bg: "#F1F3F7", color: "#6B7A90", label: "Pendente" },
  agendado: { bg: "#E3F0FB", color: "#1E6FBF", label: "Agendado" },
  concluido: { bg: "#E6F4EA", color: "#05873C", label: "Concluído" },
  pago: { bg: "#EFE5FB", color: "#6E3FBF", label: "Pago" },
};

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const sb = supabase as unknown as { from: (t: string) => any; rpc?: any };

interface Props {
  contratoId: string;
  lojaId: string | null | undefined;
  canEdit: boolean;
  funcao?: Funcao; // default: medidor
  titulo?: string;
  labelPessoa?: string;
  labelTotal?: string;
}

export function ContratoMedicaoAmbientesSection({
  contratoId,
  lojaId,
  canEdit,
  funcao = "medidor",
  titulo,
  labelPessoa,
  labelTotal,
}: Props) {
  const qc = useQueryClient();

  // Field name mapping per função
  const F = {
    pessoaId: funcao === "medidor" ? "medidor_id" : "conferente_id",
    pct: funcao === "medidor" ? "percentual_medidor" : "percentual_conferente",
    valor: funcao === "medidor" ? "valor_medidor" : "valor_conferente",
    status: funcao === "medidor" ? "status_medicao" : "status_conferencia",
    data: funcao === "medidor" ? "data_medicao" : "data_conferencia",
    dreCol: funcao === "medidor" ? null : null, // both go into outros_custos_reais via log; see Pago handler
  } as const;

  const tituloSec = titulo ?? (funcao === "medidor" ? "Medição por ambiente" : "Conferência por ambiente");
  const lblPessoa = labelPessoa ?? (funcao === "medidor" ? "Medidor" : "Conferente");
  const lblValor = funcao === "medidor" ? "Valor medidor" : "Valor conferente";
  const lblTotal = labelTotal ?? (funcao === "medidor" ? "Total a pagar medidores" : "Total a pagar conferentes");

  const { data: ambientes, isLoading } = useQuery<AmbienteRow[]>({
    queryKey: ["ambientes_med_conf", contratoId],
    enabled: !!contratoId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("contrato_ambientes")
        .select(
          "id, nome, valor_liquido, medidor_id, percentual_medidor, valor_medidor, status_medicao, data_medicao, conferente_id, percentual_conferente, valor_conferente, status_conferencia, data_conferencia",
        )
        .eq("contrato_id", contratoId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AmbienteRow[];
    },
  });

  const { data: pessoas } = useQuery<PessoaOpt[]>({
    queryKey: ["tec-options", lojaId, funcao],
    enabled: !!lojaId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("tecnicos_montadores")
        .select("id, nome, percentual_padrao, ativo, funcoes")
        .eq("loja_id", lojaId)
        .contains("funcoes", [funcao])
        .eq("ativo", true)
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PessoaOpt[];
    },
  });

  const updateAmbiente = async (id: string, patch: Record<string, any>) => {
    const { error } = await sb.from("contrato_ambientes").update(patch).eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    qc.invalidateQueries({ queryKey: ["ambientes_med_conf", contratoId] });
    qc.invalidateQueries({ queryKey: ["contrato_ambientes", contratoId] });
    return true;
  };

  const handlePessoaChange = (a: AmbienteRow, value: string) => {
    const realId = value === "__none__" ? null : value;
    const m = pessoas?.find((x) => x.id === realId);
    updateAmbiente(a.id, {
      [F.pessoaId]: realId,
      [F.pct]: m ? Number(m.percentual_padrao) : a[F.pct],
    });
  };

  const handleStatusChange = async (a: AmbienteRow, novo: StatusMed) => {
    const ok = await updateAmbiente(a.id, { [F.status]: novo });
    if (!ok) return;

    if (novo === "pago") {
      const valor = Number(a[F.valor]) || 0;
      const pessoaId = a[F.pessoaId] as string | null;
      const pessoaNome =
        (pessoaId && pessoas?.find((p) => p.id === pessoaId)?.nome) || "—";

      // 1) Histórico do contrato
      try {
        await (sb as any).rpc?.("contrato_log_inserir", {
          _contrato_id: contratoId,
          _acao: funcao === "medidor" ? "medidor_pago" : "conferente_pago",
          _titulo: `${lblPessoa} pago`,
          _descricao: `${lblPessoa} ${pessoaNome} — Ambiente ${a.nome} — ${fmtBRL(valor)}`,
        });
      } catch (e: any) {
        // log silencioso
        console.warn("log inserir falhou", e?.message);
      }

      // 2) DRE — somar em outros_custos_reais
      try {
        const { data: dre, error: dreErr } = await sb
          .from("dre_contrato")
          .select("outros_custos_reais")
          .eq("contrato_id", contratoId)
          .maybeSingle();
        if (!dreErr && dre) {
          const novoTotal = Number(dre.outros_custos_reais || 0) + valor;
          await sb
            .from("dre_contrato")
            .update({ outros_custos_reais: novoTotal })
            .eq("contrato_id", contratoId);
          qc.invalidateQueries({ queryKey: ["dre", contratoId] });
        }
      } catch (e: any) {
        console.warn("DRE update falhou", e?.message);
      }

      toast.success(`${lblPessoa} marcado como pago e lançado no DRE`);
    }
  };

  // Total a pagar (somente desta função)
  const totalPagar = (ambientes ?? []).reduce(
    (acc, a) => acc + (Number(a[F.valor]) || 0),
    0,
  );

  return (
    <div
      className="rounded-xl bg-white"
      style={{ border: "0.5px solid #E8ECF2", overflow: "hidden" }}
    >
      <div className="flex items-center justify-between px-5 py-4">
        <h3 style={{ fontSize: 15, fontWeight: 500, color: "#0D1117" }}>{tituloSec}</h3>
        <span style={{ fontSize: 12, color: "#6B7A90" }}>
          {ambientes?.length ?? 0} ambiente{(ambientes?.length ?? 0) === 1 ? "" : "s"}
        </span>
      </div>

      <div className="overflow-x-auto" style={{ borderTop: "0.5px solid #E8ECF2" }}>
        <table className="w-full" style={{ minWidth: 980 }}>
          <thead style={{ backgroundColor: "#F7F9FC" }}>
            <tr>
              {["Ambiente", "Valor líquido", lblPessoa, "%", lblValor, "Status", "Data"].map(
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
            {!isLoading && (ambientes?.length ?? 0) === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhum ambiente cadastrado neste contrato.
                </td>
              </tr>
            )}
            {ambientes?.map((a) => {
              const status = (a[F.status] as StatusMed) || "pendente";
              const st = STATUS_STYLE[status];
              return (
                <tr key={a.id} style={{ borderTop: "0.5px solid #E8ECF2" }}>
                  <td className="px-3 py-2 text-sm font-medium" style={{ minWidth: 220, color: "#0D1117" }}>
                    {a.nome}
                  </td>
                  <td className="px-3 py-2 text-sm" style={{ whiteSpace: "nowrap", color: "#0D1117" }}>
                    {fmtBRL(Number(a.valor_liquido))}
                  </td>
                  <td className="px-3 py-2" style={{ minWidth: 180 }}>
                    <Select
                      value={(a[F.pessoaId] as string | null) ?? "__none__"}
                      onValueChange={(v) => handlePessoaChange(a, v)}
                      disabled={!canEdit}
                    >
                      <SelectTrigger style={{ height: 32, fontSize: 13 }}>
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Sem {lblPessoa.toLowerCase()} —</SelectItem>
                        {pessoas?.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2" style={{ width: 80 }}>
                    <Input
                      type="number"
                      step="0.01"
                      defaultValue={Number(a[F.pct])}
                      disabled={!canEdit}
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value) || 0;
                        if (v !== Number(a[F.pct]))
                          updateAmbiente(a.id, { [F.pct]: v });
                      }}
                      style={{ height: 32, fontSize: 13 }}
                    />
                  </td>
                  <td className="px-3 py-2 text-sm" style={{ whiteSpace: "nowrap", color: "#0D1117" }}>
                    {fmtBRL(Number(a[F.valor]))}
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      value={status}
                      onValueChange={(v) => handleStatusChange(a, v as StatusMed)}
                      disabled={!canEdit}
                    >
                      <SelectTrigger
                        style={{
                          height: 28,
                          fontSize: 12,
                          backgroundColor: st.bg,
                          color: st.color,
                          border: "none",
                          fontWeight: 500,
                          width: 120,
                        }}
                      >
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
                  <td className="px-3 py-2" style={{ width: 160 }}>
                    <Input
                      type="date"
                      defaultValue={(a[F.data] as string | null) ?? ""}
                      disabled={!canEdit}
                      onBlur={(e) => {
                        const v = e.target.value || null;
                        if (v !== a[F.data])
                          updateAmbiente(a.id, { [F.data]: v as any });
                      }}
                      style={{ height: 32, fontSize: 13 }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer com total a pagar */}
      <div
        className="flex items-center justify-end gap-3 px-5 py-3"
        style={{ borderTop: "0.5px solid #E8ECF2", backgroundColor: "#FAFBFD" }}
      >
        <span style={{ fontSize: 12, color: "#6B7A90" }}>{lblTotal}:</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#0D1117" }}>
          {fmtBRL(totalPagar)}
        </span>
      </div>
    </div>
  );
}
