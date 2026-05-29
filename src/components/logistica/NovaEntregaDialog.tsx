import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** ISO date pré-preenchida (yyyy-mm-dd) */
  defaultDate?: string;
  defaultTurno?: "manha" | "tarde" | "dia_todo";
}

export function NovaEntregaDialog({ open, onOpenChange, defaultDate, defaultTurno }: Props) {
  const qc = useQueryClient();
  const [contratoId, setContratoId] = useState<string>("manual");
  const [cliente, setCliente] = useState("");
  const [endereco, setEndereco] = useState("");
  const [data, setData] = useState(defaultDate ?? "");
  const [turno, setTurno] = useState<"manha" | "tarde" | "dia_todo">(defaultTurno ?? "manha");
  const [responsavelId, setResponsavelId] = useState<string>("__none__");
  const [observacoes, setObservacoes] = useState("");
  const [custo, setCusto] = useState("");

  useEffect(() => {
    if (open) {
      setData(defaultDate ?? "");
      setTurno(defaultTurno ?? "manha");
    }
  }, [open, defaultDate, defaultTurno]);

  // Contratos liberados (trava_producao_ok=true) sem entrega ainda — para vincular
  const { data: contratos } = useQuery({
    queryKey: ["contratos-para-entrega"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("id, cliente_nome, cliente_contato")
        .eq("trava_producao_ok", true)
        .order("cliente_nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: motoristas } = useQuery({
    queryKey: ["usuarios-motoristas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pessoas")
        .select("id, nome")
        .contains("funcoes", ["motorista"])
        .order("nome");
      return data ?? [];
    },
    enabled: open,
  });

  const onPickContrato = (id: string) => {
    setContratoId(id);
    if (id === "manual") return;
    const c = contratos?.find((x) => x.id === id);
    if (c) {
      setCliente(c.cliente_nome);
      setEndereco(c.cliente_contato ?? "");
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (contratoId === "manual") {
        throw new Error("Por enquanto a entrega precisa estar vinculada a um contrato. Selecione um contrato liberado.");
      }
      if (!data) throw new Error("Data obrigatória");
      if (!cliente.trim()) throw new Error("Cliente obrigatório");

      const custoNum = parseFloat(custo.replace(",", ".")) || 0;

      const respNome = responsavelId === "__none__" ? null : motoristas?.find(m => m.id === responsavelId)?.nome || null;

      if (responsavelId !== "__none__") {
        const { data: func } = await supabase
          .from("rh_funcionarios")
          .select("id, nome")
          .eq("usuario_id", responsavelId) // Assuming local usuarios table ID
          .maybeSingle();

        if (func) {
          // Check for full day or turn
          const hIni = turno === "tarde" ? "13:00" : "08:00";
          const hFim = turno === "manha" ? "12:00" : "18:00";
          
          const { data: disp } = await supabase.rpc("calcular_disponibilidade_funcionario", {
            p_funcionario_id: func.id,
            p_data_inicio: `${data}T${hIni}:00Z`,
            p_data_fim: `${data}T${hFim}:00Z`
          });

          const res = disp as { status: string; motivo: string | null };
          if (res && res.status !== 'disponivel') {
            toast.warning(`Aviso: ${func.nome} está com status "${res.motivo || res.status}" no RH.`);
            // Note: We only toast warning as per "evitar bloqueio rígido" instruction
          }
        }
      }

      const { error } = await supabase.from("entregas").insert({
        contrato_id: contratoId,
        data_prevista: data,
        rota: endereco || null,
        endereco: endereco || null,
        turno,
        responsavel: respNome,
        transportadora: respNome,
        observacoes: observacoes || null,
        custo_frete: custoNum,
        status_visual: "agendado",
      });
      if (error) throw error;

      // Integrar com automação
      try {
        const { data: contratoInfo } = await supabase.from("contratos").select("loja_id, cliente_id").eq("id", contratoId).single();
        if (contratoInfo) {
          const { automationService } = await import("@/services/automationService");
          await automationService.dispararGatilho(
            "entrega_agendada",
            "contrato",
            contratoId,
            contratoInfo.loja_id,
            { cliente_id: contratoInfo.cliente_id, contrato_id: contratoId, data_prevista: data, turno }
          );
        }
      } catch (err) {
        console.error("Erro ao disparar gatilho de automação (entrega_agendada):", err);
      }
    },
    onSuccess: () => {
      toast.success("Entrega agendada");
      qc.invalidateQueries({ queryKey: ["logistica-list"] });
      qc.invalidateQueries({ queryKey: ["logistica-contratos"] });
      onOpenChange(false);
      setContratoId("manual");
      setCliente(""); 
      setEndereco(""); 
      setData(""); 
      setResponsavelId("__none__");
      setObservacoes(""); 
      setCusto(""); 
      setTurno("manha");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nova entrega</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Vincular a contrato</Label>
            <Select value={contratoId} onValueChange={onPickContrato}>
              <SelectTrigger><SelectValue placeholder="Selecione um contrato" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Entrada manual (sem contrato)</SelectItem>
                {contratos?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    #{c.id.slice(0, 4)} — {c.cliente_nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cliente *</Label>
              <Input value={cliente} onChange={(e) => setCliente(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Responsável</Label>
              <Select value={responsavelId} onValueChange={setResponsavelId}>
                <SelectTrigger><SelectValue placeholder="Selecione um motorista" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Não atribuído</SelectItem>
                  {motoristas?.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data *</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Turno *</Label>
              <Select value={turno} onValueChange={(v) => setTurno(v as typeof turno)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manha">Manhã</SelectItem>
                  <SelectItem value="tarde">Tarde</SelectItem>
                  <SelectItem value="dia_todo">Dia todo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Endereço</Label>
            <Textarea value={endereco} onChange={(e) => setEndereco(e.target.value)} rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Custo do frete (R$)</Label>
              <Input type="number" step="0.01" value={custo} onChange={(e) => setCusto(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : "Agendar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
