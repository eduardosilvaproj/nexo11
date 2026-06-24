import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, Package } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entregaId: string;
  contratoId: string;
}

interface PedidoDeposito {
  id: string;
  numero_pedido: string;
  oc: string | null;
  total_caixas_previstas: number;
  total_caixas_recebidas: number;
}

export function EntregaConfirmDialog({ open, onOpenChange, entregaId, contratoId }: Props) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [dataReal, setDataReal] = useState(new Date().toISOString().slice(0, 10));
  // Pedidos selecionados que sairam nesta entrega (elo de volta recebimento<-entrega).
  // Permite entrega parcial: ambientes do mesmo contrato podem sair em datas diferentes.
  const [selecionados, setSelecionados] = useState<Record<string, boolean>>({});

  // Pedidos no deposito aguardando saida (status_recebimento = recebido_deposito).
  // Sao os fisicamente disponiveis para fechar nesta entrega.
  const { data: pedidosDeposito } = useQuery({
    queryKey: ["entrega-pedidos-deposito", contratoId],
    enabled: open && !!contratoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("producao_terceirizada")
        .select("id, numero_pedido, oc, total_caixas_previstas, total_caixas_recebidas")
        .eq("contrato_id", contratoId)
        .eq("status_recebimento", "recebido_deposito")
        .order("numero_pedido");
      if (error) throw error;
      return (data ?? []) as PedidoDeposito[];
    },
  });

  // Default: todos marcados (caso comum e sair tudo; entrega parcial desmarca os que ficam).
  useEffect(() => {
    if (!open) {
      setSelecionados({});
      setFile(null);
      return;
    }
    if (pedidosDeposito) {
      setSelecionados(Object.fromEntries(pedidosDeposito.map((p) => [p.id, true])));
    }
  }, [open, pedidosDeposito]);

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

      // Buscar dados para notificação
      const { data: contrato } = await supabase.from("contratos").select("loja_id, cliente_nome").eq("id", contratoId).single();

      // Elo de volta: fecha no recebimento SO os pedidos selecionados que sairam.
      // Pedidos nao marcados seguem 'recebido_deposito' para uma entrega futura.
      const idsParaFechar = (pedidosDeposito ?? [])
        .filter((p) => selecionados[p.id])
        .map((p) => p.id);
      if (idsParaFechar.length > 0) {
        const { data: u } = await supabase.auth.getUser();
        const userName = u.user?.user_metadata?.nome || u.user?.email || "Operador";
        const { error: fechErr } = await supabase
          .from("producao_terceirizada")
          .update({
            status_recebimento: "entrega_finalizada",
            entregue_para: `Entrega confirmada na agenda em ${new Date(dataReal).toLocaleDateString("pt-BR")}`,
          })
          .in("id", idsParaFechar);
        if (fechErr) {
          console.error("[EntregaConfirm] erro ao fechar pedidos no recebimento:", fechErr);
        } else {
          // Um log por pedido fechado
          const logs = (pedidosDeposito ?? [])
            .filter((p) => idsParaFechar.includes(p.id))
            .map((p) => ({
              contrato_id: contratoId,
              acao: "entrega_confirmada",
              etapa: "logistica",
              titulo: "Pedido entregue",
              descricao: `Pedido #${p.numero_pedido} saiu na entrega confirmada em ${new Date(dataReal).toLocaleDateString("pt-BR")}`,
              usuario_nome: userName,
            }));
          if (logs.length > 0) await supabase.from("contrato_logs").insert(logs);
        }
      }

      if (contrato) {
        await supabase.from("notificacoes").insert([
          {
            loja_id: contrato.loja_id,
            perfil_destino: "gerente",
            titulo: "Material Entregue",
            mensagem: `Materiais do contrato de ${contrato.cliente_nome} foram entregues.`,
            modulo: "logistica",
            prioridade: "media",
            tipo: "material_entregue",
            link: `/contratos/${contratoId}`
          },
          {
            loja_id: contrato.loja_id,
            perfil_destino: "montador",
            titulo: "Montagem Liberada",
            mensagem: `Montagem liberada para o cliente ${contrato.cliente_nome} (Material entregue).`,
            modulo: "montagem",
            prioridade: "alta",
            tipo: "montagem_liberada",
            link: "/montagem"
          }
        ]);

        const { registrarEventoContrato } = await import("@/services/contratoEventos");
        await registrarEventoContrato({
          contratoId,
          tipo: "material_entregue",
          modulo: "logistica",
          titulo: "Material Entregue",
          descricao: `Materiais entregues via ${entregaId}`,
          entidadeTipo: "entregas",
          entidadeId: entregaId
        });

        // Integrar com automação
        try {
          const { automationService } = await import("@/services/automationService");
          await automationService.dispararGatilho(
            "entrega_concluida",
            "contrato",
            contratoId,
            contrato.loja_id,
            { cliente_id: (contrato as any).cliente_id, contrato_id: contratoId, entrega_id: entregaId }
          );
        } catch (err) {
          console.error("Erro ao disparar gatilho de automação (entrega_concluida):", err);
        }
      }
    },
    onSuccess: () => {
      toast.success("Entrega confirmada! Montagem liberada para agendamento.");
      qc.invalidateQueries({ queryKey: ["entrega", contratoId] });
      qc.invalidateQueries({ queryKey: ["logistica-list"] });
      qc.invalidateQueries({ queryKey: ["contrato_eventos", contratoId] });
      qc.invalidateQueries({ queryKey: ["producao-terceirizada"] });
      qc.invalidateQueries({ queryKey: ["recebimento-lista"] });
      qc.invalidateQueries({ queryKey: ["logistica-unificada"] });
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

          {pedidosDeposito && pedidosDeposito.length > 0 && (
            <div className="space-y-1.5">
              <Label>Pedidos que saíram nesta entrega</Label>
              <p className="text-xs text-muted-foreground">
                Marque os ambientes/pedidos entregues agora. Os desmarcados continuam no depósito para uma entrega futura.
              </p>
              <div className="space-y-1 rounded-lg border p-2 max-h-44 overflow-y-auto">
                {pedidosDeposito.map((p) => (
                  <label
                    key={p.id}
                    htmlFor={`ped-${p.id}`}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
                  >
                    <Checkbox
                      id={`ped-${p.id}`}
                      checked={!!selecionados[p.id]}
                      onCheckedChange={(v) =>
                        setSelecionados((s) => ({ ...s, [p.id]: v === true }))
                      }
                    />
                    <Package className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">
                      #{p.numero_pedido}
                      {p.oc ? <span className="text-muted-foreground"> · OC {p.oc}</span> : null}
                      <span className="text-muted-foreground"> · {p.total_caixas_recebidas}/{p.total_caixas_previstas} caixas</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

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
