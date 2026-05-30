import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";

const MOTIVOS = [
  { value: "preco", label: "Preço alto" },
  { value: "prazo", label: "Prazo de entrega" },
  { value: "concorrencia", label: "Fechou com concorrente" },
  { value: "desistiu", label: "Desistiu da compra" },
  { value: "sem_resposta", label: "Sem resposta / Sumiu" },
  { value: "projeto", label: "Não gostou do projeto" },
  { value: "financeiro", label: "Problema financeiro" },
  { value: "mudanca", label: "Mudou de planos" },
  { value: "outro", label: "Outro" },
];

interface Props {
  open: boolean;
  onConfirm: (motivo: string, observacao: string) => void;
  onCancel: () => void;
  leadNome?: string;
}

export function MotivoPerdaDialog({ open, onConfirm, onCancel, leadNome }: Props) {
  const [motivo, setMotivo] = useState("");
  const [observacao, setObservacao] = useState("");

  function handleConfirm() {
    if (!motivo) return;
    const motivoLabel = MOTIVOS.find(m => m.value === motivo)?.label || motivo;
    const texto = observacao ? `${motivoLabel}: ${observacao}` : motivoLabel;
    onConfirm(texto, observacao);
    setMotivo("");
    setObservacao("");
  }

  function handleCancel() {
    setMotivo("");
    setObservacao("");
    onCancel();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleCancel()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Motivo da Perda
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-800">
              Marcar <strong>{leadNome || "este lead"}</strong> como perdido.
            </p>
            <p className="text-xs text-red-600 mt-1">Informe o motivo para análise futura.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Motivo principal *</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger><SelectValue placeholder="Selecione o motivo" /></SelectTrigger>
              <SelectContent>
                {MOTIVOS.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Observação (opcional)</Label>
            <Input
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              placeholder="Detalhes adicionais..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={handleConfirm}
            disabled={!motivo}
          >
            Confirmar Perda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}