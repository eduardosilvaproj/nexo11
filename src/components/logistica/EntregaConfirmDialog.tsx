import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entregaId: string;
  contratoId: string;
}

export function EntregaConfirmDialog({ open, onOpenChange, entregaId, contratoId }: Props) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [dataReal, setDataReal] = useState(new Date().toISOString().slice(0, 10));

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Foto de confirmação obrigatória");
      if (file.size > 10 * 1024 * 1024) throw new Error("Arquivo maior que 10MB");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${contratoId}/confirmacao-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("entregas-fotos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { error } = await supabase
        .from("entregas")
        .update({
          status: "confirmada",
          status_visual: "entregue",
          data_confirmacao: new Date(dataReal).toISOString(),
          foto_confirmacao_path: path,
        })
        .eq("id", entregaId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entrega confirmada! Montagem liberada para agendamento.");
      qc.invalidateQueries({ queryKey: ["entrega", contratoId] });
      qc.invalidateQueries({ queryKey: ["logistica-list"] });
      onOpenChange(false);
      setFile(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Confirmar entrega</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          Confirmar que a entrega foi realizada em {new Date(dataReal).toLocaleDateString("pt-BR")}?
        </p>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Data real da entrega *</Label>
            <Input type="date" value={dataReal} onChange={(e) => setDataReal(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Foto de confirmação *</Label>
            <label
              htmlFor="foto"
              className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 p-6 hover:border-primary/50"
            >
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {file ? file.name : "Clique para enviar (JPG/PNG, máx 10MB)"}
              </span>
              <input
                id="foto"
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !file}>
            {mutation.isPending ? "Confirmando..." : "Confirmar entrega ✓"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
