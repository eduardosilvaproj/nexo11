import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type OpStatus = Database["public"]["Enums"]["op_status"];

interface ProducaoTabProps {
  contratoId: string;
}

const STATUS_LABEL: Record<OpStatus, string> = {
  aguardando: "Aguardando",
  em_corte: "Em corte",
  em_montagem: "Em montagem",
  concluido: "Concluído",
};

const STATUS_BADGE: Record<OpStatus, { bg: string; fg: string }> = {
  aguardando: { bg: "#E8ECF2", fg: "#6B7A90" },
  em_corte: { bg: "#FAECE7", fg: "#993C1D" },
  em_montagem: { bg: "#E1F5EE", fg: "#0F6E56" },
  concluido: { bg: "#D1FAE5", fg: "#05873C" },
};

const STEPS: OpStatus[] = ["aguardando", "em_corte", "em_montagem", "concluido"];

const Card = ({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div
    className="rounded-xl bg-white"
    style={{ border: "0.5px solid #E8ECF2", padding: 20 }}
  >
    <div className="mb-4 flex items-center justify-between">
      <h3 style={{ fontSize: 14, fontWeight: 500, color: "#0D1117" }}>{title}</h3>
      {right}
    </div>
    {children}
  </div>
);

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between py-1.5">
    <span style={{ fontSize: 12, color: "#6B7A90" }}>{label}</span>
    <span style={{ fontSize: 13, color: "#0D1117", fontWeight: 500 }}>
      {value || "—"}
    </span>
  </div>
);

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("pt-BR") : "—";

function StatusTimeline({ current }: { current: OpStatus }) {
  const idx = STEPS.indexOf(current);
  return (
    <div className="my-4 flex items-center">
      {STEPS.map((s, i) => {
        const done = i < idx;
        const isCurrent = i === idx;
        const isLast = i === STEPS.length - 1;
        const circleBg = done || isCurrent ? "#1E6FBF" : "#E8ECF2";
        const circleColor = done || isCurrent ? "#FFFFFF" : "#B0BAC9";
        return (
          <div key={s} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <div
                className="flex-1"
                style={{
                  borderTop:
                    i === 0
                      ? "2px solid transparent"
                      : i <= idx
                        ? "2px solid #1E6FBF"
                        : "2px solid #E8ECF2",
                }}
              />
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: circleBg, color: circleColor }}
              >
                {done ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <span className="text-[11px] font-medium">{i + 1}</span>
                )}
              </div>
              <div
                className="flex-1"
                style={{
                  borderTop: isLast
                    ? "2px solid transparent"
                    : i < idx
                      ? "2px solid #1E6FBF"
                      : "2px solid #E8ECF2",
                }}
              />
            </div>
            <span
              className="mt-1.5"
              style={{
                fontSize: 11,
                color: isCurrent ? "#0D1117" : done ? "#05873C" : "#6B7A90",
              }}
            >
              {STATUS_LABEL[s]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ContratoProducaoTab({ contratoId }: ProducaoTabProps) {
  const qc = useQueryClient();

  const { data: op } = useQuery({
    queryKey: ["op", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordens_producao")
        .select("*")
        .eq("contrato_id", contratoId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("ordens_producao")
        .insert({ contrato_id: contratoId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("O.P. criada");
      qc.invalidateQueries({ queryKey: ["op", contratoId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const concluirMutation = useMutation({
    mutationFn: async () => {
      if (!op) return;
      const { error } = await supabase
        .from("ordens_producao")
        .update({
          status: "concluido",
          data_conclusao: new Date().toISOString(),
        })
        .eq("id", op.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("O.P. marcada como concluída");
      qc.invalidateQueries({ queryKey: ["op", contratoId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!op) {
    return (
      <Card title="Ordem de produção">
        <div className="flex flex-col items-center gap-3 py-8">
          <span style={{ fontSize: 13, color: "#6B7A90" }}>
            Nenhuma ordem de produção criada para este contrato.
          </span>
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="rounded-lg px-4 py-2 text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: "#1E6FBF", fontSize: 13 }}
          >
            {createMutation.isPending ? "Criando..." : "Criar O.P."}
          </button>
        </div>
      </Card>
    );
  }

  const badge = STATUS_BADGE[op.status];
  const itens = Array.isArray(op.itens_json)
    ? (op.itens_json as Array<Record<string, unknown>>)
    : [];

  return (
    <Card
      title="Ordem de produção"
      right={
        <span
          className="inline-flex items-center rounded-full px-2.5 py-0.5"
          style={{ backgroundColor: badge.bg, color: badge.fg, fontSize: 11, fontWeight: 500 }}
        >
          {STATUS_LABEL[op.status]}
        </span>
      }
    >
      <div>
        <Field label="Fornecedor" value={(op as { fornecedor?: string }).fornecedor ?? "—"} />
        <Field label="Data do pedido" value={formatDate(op.data_inicio ?? op.created_at)} />
        <Field label="Data prevista" value={formatDate(op.data_previsao)} />
        <Field label="Data conclusão" value={formatDate(op.data_conclusao)} />
      </div>

      <StatusTimeline current={op.status} />

      <div className="mt-4">
        <h4 style={{ fontSize: 12, color: "#6B7A90", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
          Itens da O.P.
        </h4>
        <div className="overflow-hidden rounded-lg" style={{ border: "0.5px solid #E8ECF2" }}>
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: "#F7F9FC" }}>
                {["Item", "Qtd", "Material", "Status"].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left"
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
                ))}
              </tr>
            </thead>
            <tbody>
              {itens.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center" style={{ fontSize: 12, color: "#6B7A90" }}>
                    Nenhum item cadastrado.
                  </td>
                </tr>
              )}
              {itens.map((it, i) => (
                <tr key={i} style={{ borderTop: "0.5px solid #E8ECF2" }}>
                  <td className="px-3 py-2" style={{ fontSize: 13, color: "#0D1117" }}>
                    {String(it.nome ?? it.descricao ?? "—")}
                  </td>
                  <td className="px-3 py-2" style={{ fontSize: 13, color: "#0D1117" }}>
                    {String(it.qtd ?? it.quantidade ?? "—")}
                  </td>
                  <td className="px-3 py-2" style={{ fontSize: 13, color: "#0D1117" }}>
                    {String(it.material ?? "—")}
                  </td>
                  <td className="px-3 py-2" style={{ fontSize: 13, color: "#6B7A90" }}>
                    {String(it.status ?? "—")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {op.status !== "concluido" && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => concluirMutation.mutate()}
            disabled={concluirMutation.isPending}
            className="rounded-lg px-4 py-2 text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: "#12B76A", fontSize: 13 }}
          >
            Marcar como concluída
          </button>
        </div>
      )}
    </Card>
  );
}
