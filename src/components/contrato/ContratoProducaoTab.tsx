import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OPCreateDialog } from "@/components/producao/OPCreateDialog";
import { OPStatusActions } from "@/components/producao/OPStatusActions";
import { PrazoCard } from "@/components/producao/PrazoBadge";
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
  em_corte: { bg: "#FEF3C7", fg: "#E8A020" },
  em_montagem: { bg: "#E6F3FF", fg: "#1E6FBF" },
  concluido: { bg: "#D1FAE5", fg: "#05873C" },
};

const STEPS: OpStatus[] = ["aguardando", "em_corte", "em_montagem", "concluido"];

const ITEM_STATUSES = [
  { value: "aguardando", label: "Aguardando" },
  { value: "em_producao", label: "Em produção" },
  { value: "pronto", label: "Pronto" },
];

const Card = ({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) => (
  <div className="rounded-xl bg-white" style={{ border: "0.5px solid #E8ECF2", padding: 20 }}>
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
    <span style={{ fontSize: 13, color: "#0D1117", fontWeight: 500 }}>{value || "—"}</span>
  </div>
);

const formatDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");

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
              <div className="flex-1" style={{ borderTop: i === 0 ? "2px solid transparent" : i <= idx ? "2px solid #1E6FBF" : "2px solid #E8ECF2" }} />
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: circleBg, color: circleColor }}>
                {done ? <Check className="h-3 w-3" /> : <span className="text-[11px] font-medium">{i + 1}</span>}
              </div>
              <div className="flex-1" style={{ borderTop: isLast ? "2px solid transparent" : i < idx ? "2px solid #1E6FBF" : "2px solid #E8ECF2" }} />
            </div>
            <span className="mt-1.5" style={{ fontSize: 11, color: isCurrent ? "#0D1117" : done ? "#05873C" : "#6B7A90" }}>
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
  const [createOpen, setCreateOpen] = useState(false);

  const { data: op } = useQuery({
    queryKey: ["op", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordens_producao")
        .select("*, fornecedores:fornecedor_id ( id, nome )")
        .eq("contrato_id", contratoId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async (itens: unknown[]) => {
      if (!op) return;
      const { error } = await (supabase.from("ordens_producao") as unknown as {
        update: (u: unknown) => { eq: (c: string, v: string) => Promise<{ error: Error | null }> };
      }).update({ itens_json: itens }).eq("id", op.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["op", contratoId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (!op) {
    return (
      <>
        <div
          className="rounded-xl flex flex-col items-center justify-center gap-3 py-12"
          style={{ backgroundColor: "#F5F7FA", border: "1px dashed #B0BAC9" }}
        >
          <span style={{ fontSize: 13, color: "#6B7A90" }}>Nenhuma O.P. criada</span>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Criar ordem de produção
          </Button>
        </div>
        <OPCreateDialog open={createOpen} onOpenChange={setCreateOpen} contratoId={contratoId} />
      </>
    );
  }

  const badge = STATUS_BADGE[op.status];
  const itens = Array.isArray(op.itens_json) ? (op.itens_json as Array<Record<string, unknown>>) : [];
  const fornecedor = (op as { fornecedores?: { nome?: string } }).fornecedores;

  const updateItemStatus = (i: number, value: string) => {
    const next = itens.map((it, idx) => (idx === i ? { ...it, status: value } : it));
    updateItemMutation.mutate(next);
  };

  return (
    <Card
      title="Ordem de produção"
      right={
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5" style={{ backgroundColor: badge.bg, color: badge.fg, fontSize: 11, fontWeight: 500 }}>
            {STATUS_LABEL[op.status]}
          </span>
          <OPStatusActions opId={op.id} contratoId={contratoId} status={op.status} />
        </div>
      }
    >
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <Field label="Fornecedor" value={fornecedor?.nome ?? "—"} />
          <Field label="Data do pedido" value={formatDate(op.data_inicio ?? op.created_at)} />
          <Field label="Data prevista" value={formatDate(op.data_previsao)} />
          <Field label="Data conclusão" value={formatDate(op.data_conclusao)} />
        </div>
        {op.status !== "concluido" && (
          <div className="flex items-start justify-end">
            <PrazoCard dataPrevista={op.data_previsao} />
          </div>
        )}
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
                  <th key={h} className="px-3 py-2 text-left" style={{ fontSize: 11, color: "#6B7A90", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
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
                  <td className="px-3 py-2 text-sm">{String(it.nome ?? "—")}</td>
                  <td className="px-3 py-2 text-sm">{String(it.qtd ?? "—")}</td>
                  <td className="px-3 py-2 text-sm">{String(it.material ?? "—")}</td>
                  <td className="px-3 py-2">
                    <Select value={String(it.status ?? "aguardando")} onValueChange={(v) => updateItemStatus(i, v)}>
                      <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ITEM_STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
