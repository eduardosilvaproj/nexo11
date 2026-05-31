import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Plus,
  FileText,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Paperclip,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const TIPOS_SOLICITACAO = [
  { value: "ferias", label: "Férias" },
  { value: "atestado", label: "Atestado" },
  { value: "adiantamento", label: "Adiantamento" },
  { value: "folga", label: "Folga" },
  { value: "outros", label: "Outros" },
];

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  pendente: { color: "#E8A020", icon: Clock, label: "Pendente" },
  aprovada: { color: "#12B76A", icon: CheckCircle2, label: "Aprovada" },
  rejeitada: { color: "#E53935", icon: XCircle, label: "Rejeitada" },
};

export function PortalSolicitacoes() {
  const { perfil } = useAuth();
  const pessoaId = perfil?.id;
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [tipo, setTipo] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [valor, setValor] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // Fetch requests
  const { data: solicitacoes, isLoading } = useQuery({
    queryKey: ["portal-solicitacoes", pessoaId],
    enabled: !!pessoaId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("rh_solicitacoes")
        .select("*")
        .eq("pessoa_id", pessoaId)
        .order("criado_em", { ascending: false });
      return data || [];
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        pessoa_id: pessoaId,
        loja_id: perfil?.loja_id,
        tipo,
        observacoes,
        status: "pendente",
      };
      if (dataInicio) payload.data_inicio = dataInicio;
      if (dataFim) payload.data_fim = dataFim;
      if (valor) payload.valor = parseFloat(valor);

      const { error } = await (supabase as any)
        .from("rh_solicitacoes")
        .insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitação enviada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["portal-solicitacoes"] });
      resetForm();
    },
    onError: () => {
      toast.error("Erro ao enviar solicitação.");
    },
  });

  function resetForm() {
    setShowForm(false);
    setTipo("");
    setDataInicio("");
    setDataFim("");
    setValor("");
    setObservacoes("");
  }

  function handleSubmit() {
    if (!tipo) {
      toast.error("Selecione o tipo da solicitação.");
      return;
    }
    createMutation.mutate();
  }

  const showDates = tipo === "ferias" || tipo === "folga";
  const showValor = tipo === "adiantamento";

  return (
    <div className="space-y-4 pb-4">
      {/* New Request Button */}
      <Button
        onClick={() => setShowForm(true)}
        className="w-full h-12 rounded-2xl text-white font-medium"
        style={{ backgroundColor: "#1E6FBF" }}
      >
        <Plus className="h-5 w-5 mr-2" />
        Nova Solicitação
      </Button>

      {/* List */}
      {isLoading && (
        <p className="text-xs text-center" style={{ color: "#6B7A90" }}>
          Carregando...
        </p>
      )}

      {!isLoading && (solicitacoes || []).length === 0 && (
        <div className="text-center py-8">
          <FileText className="h-10 w-10 mx-auto mb-2" style={{ color: "#E8ECF2" }} />
          <p className="text-sm" style={{ color: "#6B7A90" }}>
            Nenhuma solicitação encontrada.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {(solicitacoes || []).map((sol: any) => {
          const statusCfg = STATUS_CONFIG[sol.status] || STATUS_CONFIG.pendente;
          const StatusIcon = statusCfg.icon;
          return (
            <div
              key={sol.id}
              className="rounded-2xl bg-white p-4"
              style={{ border: "0.5px solid #E8ECF2" }}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#0D1117" }}>
                    {TIPOS_SOLICITACAO.find((t) => t.value === sol.tipo)?.label ||
                      sol.tipo}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "#6B7A90" }}>
                    {new Date(sol.criado_em).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Badge
                  className="text-[10px] flex items-center gap-1"
                  style={{
                    backgroundColor: `${statusCfg.color}20`,
                    color: statusCfg.color,
                    border: "none",
                  }}
                >
                  <StatusIcon className="h-3 w-3" />
                  {statusCfg.label}
                </Badge>
              </div>

              {sol.data_inicio && (
                <div className="flex items-center gap-1 text-xs" style={{ color: "#6B7A90" }}>
                  <Calendar className="h-3 w-3" />
                  {new Date(sol.data_inicio).toLocaleDateString("pt-BR")}
                  {sol.data_fim &&
                    ` - ${new Date(sol.data_fim).toLocaleDateString("pt-BR")}`}
                </div>
              )}

              {sol.valor && (
                <div className="flex items-center gap-1 text-xs mt-1" style={{ color: "#6B7A90" }}>
                  <DollarSign className="h-3 w-3" />
                  {Number(sol.valor).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </div>
              )}

              {sol.observacoes && (
                <p className="text-xs mt-2" style={{ color: "#6B7A90" }}>
                  {sol.observacoes}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* New Request Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-[95vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle style={{ color: "#0D1117" }}>Nova Solicitação</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-xs" style={{ color: "#6B7A90" }}>
                Tipo
              </Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_SOLICITACAO.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showDates && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs" style={{ color: "#6B7A90" }}>
                    Data início
                  </Label>
                  <Input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs" style={{ color: "#6B7A90" }}>
                    Data fim
                  </Label>
                  <Input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {showValor && (
              <div>
                <Label className="text-xs" style={{ color: "#6B7A90" }}>
                  Valor (R$)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="0,00"
                  className="mt-1"
                />
              </div>
            )}

            <div>
              <Label className="text-xs" style={{ color: "#6B7A90" }}>
                Observações
              </Label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Descreva sua solicitação..."
                className="mt-1 min-h-[80px]"
              />
            </div>

            <div>
              <Label className="text-xs" style={{ color: "#6B7A90" }}>
                Anexo
              </Label>
              <div
                className="mt-1 flex items-center justify-center rounded-xl border-2 border-dashed p-4 cursor-pointer"
                style={{ borderColor: "#E8ECF2" }}
              >
                <div className="text-center">
                  <Paperclip className="h-5 w-5 mx-auto mb-1" style={{ color: "#6B7A90" }} />
                  <p className="text-xs" style={{ color: "#6B7A90" }}>
                    Toque para anexar arquivo
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" onClick={resetForm} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="flex-1 text-white"
              style={{ backgroundColor: "#1E6FBF" }}
            >
              {createMutation.isPending ? "Enviando..." : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
