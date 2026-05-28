import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, MapPin, Loader2, Pencil, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const fmt = (n?: number | null) =>
  typeof n === "number"
    ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "—";

interface Props {
  contratoId: string;
  lojaCidade?: string | null;
  lojaEstado?: string | null;
  clienteId?: string | null;
  custoViagem?: number | null;
  distanciaKm?: number | null;
  detalhamento?: any;
  override?: boolean;
}

export function CustoViagemCard({
  contratoId,
  lojaCidade,
  lojaEstado,
  clienteId,
  custoViagem,
  distanciaKm,
  detalhamento,
  override,
}: Props) {
  const { hasRole } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const canEdit =
    hasRole("gerente") || hasRole("financeiro") || hasRole("admin") || hasRole("admin_master");

  const { data: cliente } = useQuery({
    queryKey: ["cliente-endereco", clienteId],
    queryFn: async () => {
      if (!clienteId) return null;
      const { data } = await supabase
        .from("clientes")
        .select("cidade, estado")
        .eq("id", clienteId)
        .maybeSingle();
      return data;
    },
    enabled: !!clienteId,
  });

  const sameCity = useMemo(() => {
    if (!lojaCidade || !cliente?.cidade) return null;
    return (
      lojaCidade.trim().toLowerCase() === cliente.cidade.trim().toLowerCase() &&
      (lojaEstado ?? "").trim().toLowerCase() === (cliente.estado ?? "").trim().toLowerCase()
    );
  }, [lojaCidade, lojaEstado, cliente]);

  const calcular = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("calcular-viagem", {
        body: { contrato_id: contratoId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contrato", contratoId] });
      toast.success("Custo de viagem calculado");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao calcular viagem"),
  });

  // Auto-calc when destino é outra cidade e ainda não foi calculado
  useEffect(() => {
    if (sameCity === false && custoViagem == null && !override && !calcular.isPending) {
      calcular.mutate();
    }
  }, [sameCity, custoViagem, override]);

  if (sameCity === null) return null; // sem dados ainda
  if (sameCity && (custoViagem ?? 0) === 0) return null; // mesma cidade, sem custo

  const d = detalhamento || {};

  return (
    <div className="rounded-xl bg-white" style={{ border: "0.5px solid #E8ECF2", padding: 20 }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: "#EEF4FF", color: "#1E6FBF" }}
          >
            <MapPin size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 style={{ fontSize: 14, fontWeight: 500, color: "#0D1117" }}>
                Custo de Viagem
              </h3>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
                style={{ backgroundColor: "#EEF4FF", color: "#1E6FBF", fontSize: 10, fontWeight: 500 }}
              >
                <Sparkles size={10} /> Automático
              </span>
            </div>
            <p style={{ fontSize: 11, color: "#6B7A90", marginTop: 2 }}>
              {distanciaKm ? `${distanciaKm} km · ` : ""}
              Adicionado automaticamente ao contrato
            </p>
          </div>
        </div>
        <div className="text-right">
          <div style={{ fontSize: 20, fontWeight: 600, color: "#0D1117" }}>
            {calcular.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              fmt(Number(custoViagem ?? 0))
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 text-xs hover:underline"
          style={{ color: "#1E6FBF" }}
        >
          {open ? "Ocultar detalhamento" : "Ver detalhamento"}
          <ChevronDown
            size={12}
            style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
          />
        </button>
        {canEdit && (
          <>
            <span className="text-xs text-slate-300">·</span>
            <button
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-1 text-xs hover:underline"
              style={{ color: "#6B7A90" }}
            >
              <Pencil size={11} /> Editar valores
            </button>
            <span className="text-xs text-slate-300">·</span>
            <button
              onClick={() => calcular.mutate()}
              disabled={calcular.isPending}
              className="text-xs hover:underline"
              style={{ color: "#6B7A90" }}
            >
              Recalcular
            </button>
          </>
        )}
      </div>

      {open && (
        <div className="mt-4 overflow-hidden rounded-lg" style={{ border: "0.5px solid #E8ECF2" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "#F7F9FC" }}>
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase text-slate-500">Categoria</th>
                <th className="px-3 py-2 text-right text-[11px] font-medium uppercase text-slate-500">Gasolina</th>
                <th className="px-3 py-2 text-right text-[11px] font-medium uppercase text-slate-500">Pedágio</th>
                <th className="px-3 py-2 text-right text-[11px] font-medium uppercase text-slate-500">Hotel</th>
                <th className="px-3 py-2 text-right text-[11px] font-medium uppercase text-slate-500">Refeição</th>
                <th className="px-3 py-2 text-right text-[11px] font-medium uppercase text-slate-500">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {(["montadores", "medidor", "gerente"] as const).map((k) => (
                <tr key={k} style={{ borderTop: "0.5px solid #E8ECF2" }}>
                  <td className="px-3 py-2 capitalize" style={{ color: "#0D1117" }}>{k}</td>
                  <td className="px-3 py-2 text-right">{fmt(d?.[k]?.gasolina)}</td>
                  <td className="px-3 py-2 text-right">{fmt(d?.[k]?.pedagio)}</td>
                  <td className="px-3 py-2 text-right">{fmt(d?.[k]?.hotel)}</td>
                  <td className="px-3 py-2 text-right">{fmt(d?.[k]?.refeicao)}</td>
                  <td className="px-3 py-2 text-right font-medium">{fmt(d?.[k]?.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {d?.dias_montagem && (
            <div className="px-3 py-2 text-[11px]" style={{ backgroundColor: "#F7F9FC", color: "#6B7A90" }}>
              Dias de montagem estimados: <strong>{d.dias_montagem}</strong>
            </div>
          )}
        </div>
      )}

      {canEdit && (
        <EditCustoViagemDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          contratoId={contratoId}
          initialTotal={Number(custoViagem ?? 0)}
          initialDetalhamento={d}
          onSaved={() => qc.invalidateQueries({ queryKey: ["contrato", contratoId] })}
        />
      )}
    </div>
  );
}

function EditCustoViagemDialog({
  open,
  onOpenChange,
  contratoId,
  initialTotal,
  initialDetalhamento,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contratoId: string;
  initialTotal: number;
  initialDetalhamento: any;
  onSaved: () => void;
}) {
  const [montadores, setMontadores] = useState(
    String(initialDetalhamento?.montadores?.subtotal ?? 0),
  );
  const [medidor, setMedidor] = useState(
    String(initialDetalhamento?.medidor?.subtotal ?? 0),
  );
  const [gerente, setGerente] = useState(
    String(initialDetalhamento?.gerente?.subtotal ?? 0),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setMontadores(String(initialDetalhamento?.montadores?.subtotal ?? 0));
      setMedidor(String(initialDetalhamento?.medidor?.subtotal ?? 0));
      setGerente(String(initialDetalhamento?.gerente?.subtotal ?? 0));
    }
  }, [open, initialDetalhamento]);

  const total = Number(montadores) + Number(medidor) + Number(gerente);

  async function salvar() {
    setSaving(true);
    try {
      const novoDet = {
        ...(initialDetalhamento ?? {}),
        montadores: { ...(initialDetalhamento?.montadores ?? {}), subtotal: Number(montadores) },
        medidor: { ...(initialDetalhamento?.medidor ?? {}), subtotal: Number(medidor) },
        gerente: { ...(initialDetalhamento?.gerente ?? {}), subtotal: Number(gerente) },
        editado_manualmente: true,
      };
      const { error } = await supabase
        .from("contratos")
        .update({
          custo_viagem: total,
          custo_viagem_detalhamento: novoDet,
          custo_viagem_override: true,
        })
        .eq("id", contratoId);
      if (error) throw error;
      toast.success("Custo de viagem atualizado");
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Editar custo de viagem</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Montadores</Label>
            <Input type="number" value={montadores} onChange={(e) => setMontadores(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Medidor</Label>
            <Input type="number" value={medidor} onChange={(e) => setMedidor(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Gerente</Label>
            <Input type="number" value={gerente} onChange={(e) => setGerente(e.target.value)} />
          </div>
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            Novo total: <strong>{fmt(total)}</strong>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
