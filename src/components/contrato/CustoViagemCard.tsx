import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, MapPin, Loader2, Pencil, Sparkles, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { RelatorioViagem } from "@/components/comercial/RelatorioViagem";

const fmt = (n?: number | null) =>
  typeof n === "number"
    ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "—";

interface Props {
  contratoId: string;
  lojaCidade?: string | null;
  lojaEstado?: string | null;
  clienteId?: string | null;
}

export function CustoViagemCard({ contratoId, lojaCidade, lojaEstado, clienteId }: Props) {
  const { hasRole } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [crewOpen, setCrewOpen] = useState(false);

  const canEdit =
    hasRole("gerente") || hasRole("financeiro") || hasRole("admin") || hasRole("admin_master");

  const { data: viagemRow } = useQuery({
    queryKey: ["contrato-viagem", contratoId],
    queryFn: async () => {
      const { data } = await supabase
        .from("contratos")
        .select(
          "cliente_id, custo_viagem, distancia_km, custo_viagem_detalhamento, custo_viagem_override, viagem_qtd_montadores, viagem_qtd_veiculos",
        )
        .eq("id", contratoId)
        .maybeSingle();
      return data;
    },
  });

  const effectiveClienteId = clienteId ?? ((viagemRow as any)?.cliente_id as string | null);
  const custoViagem = (viagemRow as any)?.custo_viagem as number | null | undefined;
  const distanciaKm = (viagemRow as any)?.distancia_km as number | null | undefined;
  const detalhamento = (viagemRow as any)?.custo_viagem_detalhamento;
  const override = (viagemRow as any)?.custo_viagem_override;
  const qtdMontadores = (viagemRow as any)?.viagem_qtd_montadores as number | null | undefined;
  const qtdVeiculos = (viagemRow as any)?.viagem_qtd_veiculos as number | null | undefined;

  const { data: cliente } = useQuery({
    queryKey: ["cliente-endereco", effectiveClienteId],
    queryFn: async () => {
      if (!effectiveClienteId) return null;
      const { data } = await supabase
        .from("clientes")
        .select("cidade, estado")
        .eq("id", effectiveClienteId)
        .maybeSingle();
      return data;
    },
    enabled: !!effectiveClienteId,
  });

  const sameCity = useMemo(() => {
    if (!lojaCidade || !cliente?.cidade) return null;
    return (
      lojaCidade.trim().toLowerCase() === cliente.cidade.trim().toLowerCase() &&
      (lojaEstado ?? "").trim().toLowerCase() === (cliente.estado ?? "").trim().toLowerCase()
    );
  }, [lojaCidade, lojaEstado, cliente]);

  const calcular = useMutation({
    mutationFn: async (opts?: { qtd_montadores?: number; qtd_veiculos?: number }) => {
      const { data, error } = await supabase.functions.invoke("calcular-viagem", {
        body: { contrato_id: contratoId, ...opts },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contrato-viagem", contratoId] });
      toast.success("Custo de viagem calculado");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao calcular viagem"),
  });

  useEffect(() => {
    if (sameCity === false && custoViagem == null && !override && !calcular.isPending) {
      calcular.mutate(undefined);
    }
  }, [sameCity, custoViagem, override]);

  if (sameCity === null) return null;
  if (sameCity && (custoViagem ?? 0) === 0) return null;

  // Compose result-like object for RelatorioViagem
  const reportResult = detalhamento && detalhamento.montadores
    ? {
        distancia_km: distanciaKm,
        dias_montagem: detalhamento.dias_montagem,
        fins_de_semana_extras: detalhamento.fins_de_semana_extras,
        noites_hospedado: detalhamento.noites_hospedado,
        qtd_montadores: detalhamento.qtd_montadores ?? qtdMontadores ?? 2,
        qtd_veiculos: detalhamento.qtd_veiculos ?? qtdVeiculos ?? 1,
        custo_total: Number(custoViagem ?? 0),
        detalhamento,
      }
    : null;

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
              <h3 style={{ fontSize: 14, fontWeight: 500, color: "#0D1117" }}>Custo de Viagem</h3>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
                style={{ backgroundColor: "#EEF4FF", color: "#1E6FBF", fontSize: 10, fontWeight: 500 }}
              >
                <Sparkles size={10} /> Automático
              </span>
            </div>
            <p style={{ fontSize: 11, color: "#6B7A90", marginTop: 2 }}>
              {distanciaKm ? `${distanciaKm} km · ` : ""}
              {qtdMontadores ? `${qtdMontadores} montadores · ` : ""}
              {qtdVeiculos ? `${qtdVeiculos} veículo(s) · ` : ""}
              Lançado no DRE como frete
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

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 text-xs hover:underline"
          style={{ color: "#1E6FBF" }}
        >
          {open ? "Ocultar relatório" : "Ver relatório completo"}
          <ChevronDown
            size={12}
            style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
          />
        </button>
        {canEdit && (
          <>
            <span className="text-xs text-slate-300">·</span>
            <button
              onClick={() => setCrewOpen(true)}
              className="inline-flex items-center gap-1 text-xs hover:underline"
              style={{ color: "#6B7A90" }}
            >
              <Users size={11} /> Equipe & veículos
            </button>
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
              onClick={() => calcular.mutate(undefined)}
              disabled={calcular.isPending}
              className="text-xs hover:underline"
              style={{ color: "#6B7A90" }}
            >
              Recalcular
            </button>
          </>
        )}
      </div>

      {open && reportResult && (
        <div className="mt-4 -mx-2">
          <RelatorioViagem result={reportResult} />
        </div>
      )}

      {canEdit && (
        <>
          <EditCustoViagemDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            contratoId={contratoId}
            initialTotal={Number(custoViagem ?? 0)}
            initialDetalhamento={detalhamento}
            onSaved={() => qc.invalidateQueries({ queryKey: ["contrato-viagem", contratoId] })}
          />
          <CrewDialog
            open={crewOpen}
            onOpenChange={setCrewOpen}
            initialMontadores={qtdMontadores ?? 2}
            initialVeiculos={qtdVeiculos ?? 1}
            onConfirm={(m, v) => {
              setCrewOpen(false);
              calcular.mutate({ qtd_montadores: m, qtd_veiculos: v });
            }}
          />
        </>
      )}
    </div>
  );
}

function CrewDialog({
  open,
  onOpenChange,
  initialMontadores,
  initialVeiculos,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialMontadores: number;
  initialVeiculos: number;
  onConfirm: (m: number, v: number) => void;
}) {
  const [m, setM] = useState(String(initialMontadores));
  const [v, setV] = useState(String(initialVeiculos));
  useEffect(() => {
    if (open) {
      setM(String(initialMontadores));
      setV(String(initialVeiculos));
    }
  }, [open, initialMontadores, initialVeiculos]);

  function onMChange(val: string) {
    setM(val);
    setV(String(Math.max(1, Math.ceil(Number(val) / 2))));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Equipe e veículos</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Quantidade de montadores</Label>
            <Select value={m} onValueChange={onMChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2, 3, 4, 5, 6].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} montadores</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Quantidade de veículos</Label>
            <Input type="number" min={1} max={6} value={v} onChange={(e) => setV(e.target.value)} />
            <p className="text-[11px] text-slate-500">Sugestão: 1 carro a cada 2 montadores</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onConfirm(Number(m), Number(v))}>Recalcular</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const [montadores, setMontadores] = useState(String(initialDetalhamento?.montadores?.subtotal ?? 0));
  const [medidor, setMedidor] = useState(String(initialDetalhamento?.medidor?.subtotal ?? 0));
  const [gerente, setGerente] = useState(String(initialDetalhamento?.gerente?.subtotal ?? 0));
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
