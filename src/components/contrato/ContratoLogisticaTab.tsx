import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { EntregaCreateDialog } from "@/components/logistica/EntregaCreateDialog";
import { EntregaConfirmDialog } from "@/components/logistica/EntregaConfirmDialog";

interface Props { contratoId: string }

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

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");
const fmtMoney = (v?: number | null) =>
  typeof v === "number" ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";

function FotoConfirmacao({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    supabase.storage.from("entregas-fotos").createSignedUrl(path, 3600).then(({ data }) => {
      if (data?.signedUrl) setUrl(data.signedUrl);
    });
  }, [path]);
  if (!url) return <div className="text-xs text-muted-foreground">Carregando foto...</div>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <img src={url} alt="Confirmação" className="h-24 w-24 rounded-lg object-cover hover:opacity-80" />
    </a>
  );
}

export function ContratoLogisticaTab({ contratoId }: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: entrega } = useQuery({
    queryKey: ["entrega", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entregas")
        .select("*")
        .eq("contrato_id", contratoId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: promobLog } = useQuery({
    queryKey: ["promob_log", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contrato_logs")
        .select("descricao, created_at")
        .eq("contrato_id", contratoId)
        .eq("acao", "promob_sincronizado")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Parse: "Pedido Promob #140167 — Previsão: 2026-05-19 — JOTRANS"
  const promob = (() => {
    if (!promobLog?.descricao) return null;
    const d = promobLog.descricao;
    const pedido = d.match(/#(\d+)/)?.[1] ?? null;
    const prev = d.match(/Previsão:\s*([\d-]+)/)?.[1] ?? null;
    const parts = d.split("—").map((s) => s.trim());
    const transp = parts[parts.length - 1] && !parts[parts.length - 1].startsWith("Previsão")
      ? parts[parts.length - 1]
      : null;
    return {
      pedido,
      data_prevista: prev,
      transportadora: transp,
      sincronizado_em: promobLog.created_at,
    };
  })();

  if (!entrega) {
    return (
      <>
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-xl py-12"
          style={{ backgroundColor: "#F5F7FA", border: "1px dashed #B0BAC9" }}
        >
          <span style={{ fontSize: 13, color: "#6B7A90" }}>Nenhuma entrega cadastrada</span>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Cadastrar entrega
          </Button>
        </div>
        <EntregaCreateDialog open={createOpen} onOpenChange={setCreateOpen} contratoId={contratoId} />
      </>
    );
  }

  const confirmada = entrega.status === "confirmada";
  const badge = confirmada
    ? { bg: "#D1FAE5", fg: "#05873C", label: "Entrega confirmada ✓" }
    : { bg: "#FEF3C7", fg: "#E8A020", label: "Pendente" };

  return (
    <>
      <Card
        title="Dados da entrega"
        right={
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5"
            style={{ backgroundColor: badge.bg, color: badge.fg, fontSize: 11, fontWeight: 500 }}>
            {badge.label}
          </span>
        }
      >
        <Field label="Transportadora" value={entrega.transportadora ?? "—"} />
        <Field label="Data prevista" value={fmtDate(entrega.data_prevista)} />
        <Field label="Rota / endereço" value={entrega.rota ?? "—"} />
        <Field label="Custo do frete" value={fmtMoney(Number(entrega.custo_frete))} />
        {confirmada && (
          <>
            <Field label="Data real" value={fmtDate(entrega.data_confirmacao)} />
            {entrega.foto_confirmacao_path && (
              <div className="mt-3">
                <div style={{ fontSize: 12, color: "#6B7A90", marginBottom: 8 }}>Foto de confirmação</div>
                <FotoConfirmacao path={entrega.foto_confirmacao_path} />
              </div>
            )}
          </>
        )}

        {!confirmada && (
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setConfirmOpen(true)} style={{ backgroundColor: "#12B76A" }}>
              Confirmar entrega recebida →
            </Button>
          </div>
        )}
      </Card>

      <EntregaConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        entregaId={entrega.id}
        contratoId={contratoId}
      />
    </>
  );
}
