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

type StatusMedicao = "pendente" | "agendado" | "concluido" | "pago";

interface AmbienteMed {
  id: string;
  nome: string;
  valor_liquido: number;
  medidor_id: string | null;
  percentual_medidor: number;
  valor_medidor: number;
  status_medicao: StatusMedicao;
  data_medicao: string | null;
}

interface MedidorOpt {
  id: string;
  nome: string;
  percentual_padrao: number;
}

const STATUS_STYLE: Record<StatusMedicao, { bg: string; color: string; label: string }> = {
  pendente: { bg: "#F1F3F7", color: "#6B7A90", label: "Pendente" },
  agendado: { bg: "#E3F0FB", color: "#1E6FBF", label: "Agendado" },
  concluido: { bg: "#E6F4EA", color: "#05873C", label: "Concluído" },
  pago: { bg: "#EFE5FB", color: "#6E3FBF", label: "Pago" },
};

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const sb = supabase as unknown as { from: (t: string) => any };

interface Props {
  contratoId: string;
  lojaId: string | null | undefined;
  canEdit: boolean;
}

export function ContratoMedicaoAmbientesSection({ contratoId, lojaId, canEdit }: Props) {
  const qc = useQueryClient();

  const { data: ambientes, isLoading } = useQuery<AmbienteMed[]>({
    queryKey: ["ambientes_medicao", contratoId],
    enabled: !!contratoId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("contrato_ambientes")
        .select(
          "id, nome, valor_liquido, medidor_id, percentual_medidor, valor_medidor, status_medicao, data_medicao",
        )
        .eq("contrato_id", contratoId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AmbienteMed[];
    },
  });

  const { data: medidores } = useQuery<MedidorOpt[]>({
    queryKey: ["medidores-options", lojaId],
    enabled: !!lojaId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("tecnicos_montadores")
        .select("id, nome, percentual_padrao, ativo, funcoes")
        .eq("loja_id", lojaId)
        .contains("funcoes", ["medidor"])
        .eq("ativo", true)
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MedidorOpt[];
    },
  });

  const updateAmbiente = async (id: string, patch: Partial<AmbienteMed>) => {
    const { error } = await sb.from("contrato_ambientes").update(patch).eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    qc.invalidateQueries({ queryKey: ["ambientes_medicao", contratoId] });
    qc.invalidateQueries({ queryKey: ["contrato_ambientes", contratoId] });
    return true;
  };

  const handleMedidorChange = (a: AmbienteMed, value: string) => {
    const realId = value === "__none__" ? null : value;
    const m = medidores?.find((x) => x.id === realId);
    updateAmbiente(a.id, {
      medidor_id: realId,
      percentual_medidor: m ? Number(m.percentual_padrao) : a.percentual_medidor,
    });
  };

  return (
    <div
      className="rounded-xl bg-white"
      style={{ border: "0.5px solid #E8ECF2", overflow: "hidden" }}
    >
      <div className="flex items-center justify-between px-5 py-4">
        <h3 style={{ fontSize: 15, fontWeight: 500, color: "#0D1117" }}>
          Medição por ambiente
        </h3>
        <span style={{ fontSize: 12, color: "#6B7A90" }}>
          {ambientes?.length ?? 0} ambiente{(ambientes?.length ?? 0) === 1 ? "" : "s"}
        </span>
      </div>

      <div className="overflow-x-auto" style={{ borderTop: "0.5px solid #E8ECF2" }}>
        <table className="w-full" style={{ minWidth: 980 }}>
          <thead style={{ backgroundColor: "#F7F9FC" }}>
            <tr>
              {["Ambiente", "Valor líquido", "Medidor", "%", "Valor medidor", "Status", "Data"].map(
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
              const st = STATUS_STYLE[a.status_medicao];
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
                      value={a.medidor_id ?? "__none__"}
                      onValueChange={(v) => handleMedidorChange(a, v)}
                      disabled={!canEdit}
                    >
                      <SelectTrigger style={{ height: 32, fontSize: 13 }}>
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Sem medidor —</SelectItem>
                        {medidores?.map((m) => (
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
                      defaultValue={Number(a.percentual_medidor)}
                      disabled={!canEdit}
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value) || 0;
                        if (v !== Number(a.percentual_medidor))
                          updateAmbiente(a.id, { percentual_medidor: v });
                      }}
                      style={{ height: 32, fontSize: 13 }}
                    />
                  </td>
                  <td className="px-3 py-2 text-sm" style={{ whiteSpace: "nowrap", color: "#0D1117" }}>
                    {fmtBRL(Number(a.valor_medidor))}
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      value={a.status_medicao}
                      onValueChange={(v) =>
                        updateAmbiente(a.id, { status_medicao: v as StatusMedicao })
                      }
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
                      defaultValue={a.data_medicao ?? ""}
                      disabled={!canEdit}
                      onBlur={(e) => {
                        const v = e.target.value || null;
                        if (v !== a.data_medicao)
                          updateAmbiente(a.id, { data_medicao: v as any });
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
    </div>
  );
}
