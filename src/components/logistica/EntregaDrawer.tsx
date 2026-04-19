import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { StatusBadge, type StatusVisual } from "./StatusBadge";
import { EntregaConfirmDialog } from "./EntregaConfirmDialog";

export interface EntregaDrawerData {
  id: string;
  contrato_id: string;
  cliente_nome: string;
  endereco: string | null;
  data_prevista: string | null;
  turno: "manha" | "tarde" | "dia_todo";
  responsavel: string | null;
  observacoes: string | null;
  status_visual: StatusVisual;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  entrega: EntregaDrawerData | null;
}

const turnoLabel = { manha: "Manhã", tarde: "Tarde", dia_todo: "Dia todo" } as const;

export function EntregaDrawer({ open, onOpenChange, entrega }: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const podeAcao = hasRole("admin") || hasRole("gerente") || hasRole("tecnico");

  const [editing, setEditing] = useState(false);
  const [novoData, setNovoData] = useState("");
  const [novoTurno, setNovoTurno] = useState<"manha"|"tarde"|"dia_todo">("manha");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const setStatus = useMutation({
    mutationFn: async (status: StatusVisual) => {
      if (!entrega) return;
      const { error } = await supabase
        .from("entregas")
        .update({ status_visual: status })
        .eq("id", entrega.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["logistica-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reagendar = useMutation({
    mutationFn: async () => {
      if (!entrega || !novoData) throw new Error("Selecione a nova data");
      const { error } = await supabase
        .from("entregas")
        .update({
          data_prevista: novoData,
          turno: novoTurno,
          status_visual: "reagendado",
        })
        .eq("id", entrega.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entrega reagendada");
      qc.invalidateQueries({ queryKey: ["logistica-list"] });
      setEditing(false);
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!entrega) return null;

  const fmt = entrega.data_prevista
    ? new Date(entrega.data_prevista + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })
    : "—";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {entrega.cliente_nome}
            <StatusBadge status={entrega.status_visual} />
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4 text-sm">
          <Row label="Data" value={fmt} />
          <Row label="Turno" value={turnoLabel[entrega.turno]} />
          <Row label="Endereço" value={entrega.endereco || "—"} />
          <Row label="Responsável" value={entrega.responsavel || "—"} />
          <Row label="Contrato" value={
            <button
              onClick={() => navigate(`/contratos/${entrega.contrato_id}?tab=logistica`)}
              className="text-primary hover:underline"
            >
              #{entrega.contrato_id.slice(0, 4)} →
            </button>
          } />
          {entrega.observacoes && (
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Observações</div>
              <p className="text-sm whitespace-pre-wrap">{entrega.observacoes}</p>
            </div>
          )}
        </div>

        {podeAcao && (
          <div className="mt-8 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                disabled={entrega.status_visual === "em_rota" || entrega.status_visual === "entregue"}
                onClick={() => setStatus.mutate("em_rota")}
              >
                Marcar em rota
              </Button>
              <Button
                disabled={entrega.status_visual === "entregue"}
                onClick={() => setConfirmOpen(true)}
                style={{ backgroundColor: "hsl(var(--primary))" }}
              >
                Confirmar entrega
              </Button>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setEditing((v) => !v)}>
              {editing ? "Cancelar reagendamento" : "Reagendar"}
            </Button>

            {editing && (
              <div className="rounded-lg border p-3 space-y-2">
                <div className="space-y-1.5">
                  <Label>Nova data</Label>
                  <Input type="date" value={novoData} onChange={(e) => setNovoData(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Turno</Label>
                  <Select value={novoTurno} onValueChange={(v) => setNovoTurno(v as typeof novoTurno)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manha">Manhã</SelectItem>
                      <SelectItem value="tarde">Tarde</SelectItem>
                      <SelectItem value="dia_todo">Dia todo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={() => reagendar.mutate()} disabled={reagendar.isPending}>
                  {reagendar.isPending ? "Salvando..." : "Confirmar reagendamento"}
                </Button>
              </div>
            )}

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => navigate(`/contratos/${entrega.contrato_id}?tab=logistica`)}
            >
              Editar no contrato →
            </Button>
          </div>
        )}

        <EntregaConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          entregaId={entrega.id}
          contratoId={entrega.contrato_id}
        />
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}
