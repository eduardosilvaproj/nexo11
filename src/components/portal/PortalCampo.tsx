import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  MapPin,
  Clock,
  CheckCircle2,
  Camera,
  Navigation,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import { Checkbox } from "@/components/ui/checkbox";

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
function endOfTodayISO() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export function PortalCampo() {
  const { perfil } = useAuth();
  const pessoaId = perfil?.id;
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showOcorrencia, setShowOcorrencia] = useState(false);
  const [ocorrenciaAgendamento, setOcorrenciaAgendamento] = useState<string>("");
  const [ocorrenciaTipo, setOcorrenciaTipo] = useState("");
  const [ocorrenciaDescricao, setOcorrenciaDescricao] = useState("");
  const [ocorrenciaGravidade, setOcorrenciaGravidade] = useState("baixa");

  // Fetch today's assignments (try both tables)
  const { data: agendamentos, isLoading } = useQuery({
    queryKey: ["portal-campo-agendamentos", pessoaId],
    enabled: !!pessoaId,
    queryFn: async () => {
      // Try agendamentos_montagem first
      const { data: montagem } = await (supabase as any)
        .from("agendamentos_montagem")
        .select("*")
        .eq("responsavel_id", pessoaId)
        .gte("data_agendamento", startOfTodayISO())
        .lte("data_agendamento", endOfTodayISO())
        .order("data_agendamento", { ascending: true });

      // Also try tecnico_agendamentos
      const { data: tecnico } = await (supabase as any)
        .from("tecnico_agendamentos")
        .select("*")
        .eq("tecnico_id", pessoaId)
        .gte("data_agendamento", startOfTodayISO())
        .lte("data_agendamento", endOfTodayISO())
        .order("data_agendamento", { ascending: true });

      const all = [
        ...(montagem || []).map((m: any) => ({ ...m, _source: "montagem" })),
        ...(tecnico || []).map((t: any) => ({ ...t, _source: "tecnico" })),
      ];

      return all.sort(
        (a: any, b: any) =>
          new Date(a.data_agendamento).getTime() -
          new Date(b.data_agendamento).getTime()
      );
    },
  });

  // Conclude assignment
  const concluirMutation = useMutation({
    mutationFn: async ({ id, source }: { id: string; source: string }) => {
      const table =
        source === "montagem" ? "agendamentos_montagem" : "tecnico_agendamentos";
      const { error } = await (supabase as any)
        .from(table)
        .update({ status: "concluido" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Serviço concluído!");
      queryClient.invalidateQueries({ queryKey: ["portal-campo-agendamentos"] });
    },
    onError: () => {
      toast.error("Erro ao concluir serviço.");
    },
  });

  // Register occurrence
  const ocorrenciaMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("ocorrencias_campo").insert({
        agendamento_id: ocorrenciaAgendamento,
        pessoa_id: pessoaId,
        tipo: ocorrenciaTipo,
        descricao: ocorrenciaDescricao,
        gravidade: ocorrenciaGravidade,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ocorrência registrada!");
      setShowOcorrencia(false);
      setOcorrenciaTipo("");
      setOcorrenciaDescricao("");
      setOcorrenciaGravidade("baixa");
    },
    onError: () => {
      toast.error("Erro ao registrar ocorrência.");
    },
  });

  function openMaps(endereco: string) {
    const encoded = encodeURIComponent(endereco);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, "_blank");
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-2 mb-1">
        <MapPin className="h-4 w-4" style={{ color: "#1E6FBF" }} />
        <h3 className="text-sm font-semibold" style={{ color: "#0D1117" }}>
          Serviços de Hoje
        </h3>
        <Badge variant="secondary" className="text-[10px] ml-auto">
          {(agendamentos || []).length} agendamento(s)
        </Badge>
      </div>

      {isLoading && (
        <p className="text-xs text-center" style={{ color: "#6B7A90" }}>
          Carregando...
        </p>
      )}

      {!isLoading && (agendamentos || []).length === 0 && (
        <div className="text-center py-8">
          <MapPin className="h-10 w-10 mx-auto mb-2" style={{ color: "#E8ECF2" }} />
          <p className="text-sm" style={{ color: "#6B7A90" }}>
            Nenhum serviço agendado para hoje.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {(agendamentos || []).map((ag: any) => {
          const isExpanded = expandedId === ag.id;
          const isConcluido = ag.status === "concluido";
          const checklist = ag.checklist || [];

          return (
            <div
              key={ag.id}
              className="rounded-2xl bg-white overflow-hidden"
              style={{ border: "0.5px solid #E8ECF2" }}
            >
              {/* Header */}
              <div
                className="p-4 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : ag.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" style={{ color: "#6B7A90" }} />
                      <p className="text-sm font-semibold" style={{ color: "#0D1117" }}>
                        {ag.cliente_nome || ag.cliente || "Cliente"}
                      </p>
                    </div>
                    {(ag.endereco || ag.local) && (
                      <p className="text-xs mt-1 ml-6" style={{ color: "#6B7A90" }}>
                        {ag.endereco || ag.local}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-1 ml-6">
                      <Clock className="h-3 w-3" style={{ color: "#6B7A90" }} />
                      <span className="text-xs" style={{ color: "#6B7A90" }}>
                        {ag.horario ||
                          new Date(ag.data_agendamento).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isConcluido ? (
                      <Badge
                        className="text-[10px]"
                        style={{ backgroundColor: "#12B76A20", color: "#12B76A", border: "none" }}
                      >
                        Concluído
                      </Badge>
                    ) : (
                      <Badge
                        className="text-[10px]"
                        style={{ backgroundColor: "#1E6FBF20", color: "#1E6FBF", border: "none" }}
                      >
                        Pendente
                      </Badge>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" style={{ color: "#6B7A90" }} />
                    ) : (
                      <ChevronDown className="h-4 w-4" style={{ color: "#6B7A90" }} />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: "#E8ECF2" }}>
                  {/* Checklist */}
                  {checklist.length > 0 && (
                    <div className="pt-3">
                      <p className="text-xs font-medium mb-2" style={{ color: "#0D1117" }}>
                        Checklist
                      </p>
                      <div className="space-y-2">
                        {checklist.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Checkbox
                              checked={item.done}
                              onCheckedChange={() => {
                                // Toggle checklist item (optimistic)
                              }}
                            />
                            <span
                              className="text-xs"
                              style={{
                                color: item.done ? "#6B7A90" : "#0D1117",
                                textDecoration: item.done ? "line-through" : "none",
                              }}
                            >
                              {item.label || item.texto || item}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {(ag.endereco || ag.local) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 rounded-xl text-xs"
                        onClick={() => openMaps(ag.endereco || ag.local)}
                      >
                        <Navigation className="h-4 w-4 mr-1" />
                        Navegar
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 rounded-xl text-xs"
                      onClick={() => {
                        // Photo upload placeholder
                        toast.info("Funcionalidade de foto em breve.");
                      }}
                    >
                      <Camera className="h-4 w-4 mr-1" />
                      Foto
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 rounded-xl text-xs"
                      onClick={() => {
                        setOcorrenciaAgendamento(ag.id);
                        setShowOcorrencia(true);
                      }}
                    >
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      Ocorrência
                    </Button>
                    {!isConcluido && (
                      <Button
                        size="sm"
                        className="h-10 rounded-xl text-xs text-white"
                        style={{ backgroundColor: "#12B76A" }}
                        disabled={concluirMutation.isPending}
                        onClick={() =>
                          concluirMutation.mutate({ id: ag.id, source: ag._source })
                        }
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Concluir
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Occurrence Dialog */}
      <Dialog open={showOcorrencia} onOpenChange={setShowOcorrencia}>
        <DialogContent className="max-w-[95vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle style={{ color: "#0D1117" }}>Registrar Ocorrência</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs" style={{ color: "#6B7A90" }}>Tipo</Label>
              <Input
                value={ocorrenciaTipo}
                onChange={(e) => setOcorrenciaTipo(e.target.value)}
                placeholder="Ex: Problema de acesso, material faltante..."
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs" style={{ color: "#6B7A90" }}>Descrição</Label>
              <Textarea
                value={ocorrenciaDescricao}
                onChange={(e) => setOcorrenciaDescricao(e.target.value)}
                placeholder="Descreva a ocorrência..."
                className="mt-1 min-h-[80px]"
              />
            </div>
            <div>
              <Label className="text-xs" style={{ color: "#6B7A90" }}>Gravidade</Label>
              <Select value={ocorrenciaGravidade} onValueChange={setOcorrenciaGravidade}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowOcorrencia(false)} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={() => ocorrenciaMutation.mutate()}
              disabled={ocorrenciaMutation.isPending}
              className="flex-1 text-white"
              style={{ backgroundColor: "#E53935" }}
            >
              {ocorrenciaMutation.isPending ? "Registrando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
