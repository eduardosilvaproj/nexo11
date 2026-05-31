import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, UserPlus, CheckCircle2, Trash2 } from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OnboardingItem {
  descricao: string;
  concluido: boolean;
  data_conclusao: string | null;
}

const DEFAULT_ITEMS: string[] = [
  "Documentos entregues",
  "Conta de email criada",
  "Acesso ao sistema configurado",
  "Uniforme entregue",
  "Treinamento inicial realizado",
  "Apresentação à equipe",
  "Tour pela loja",
  "Manual do colaborador entregue",
];

export function RHOnboarding() {
  const { loja_id } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPessoa, setSelectedPessoa] = useState("");
  const [customItems, setCustomItems] = useState<string[]>([]);
  const [newCustomItem, setNewCustomItem] = useState("");

  // Fetch new hires (last 90 days)
  const { data: newHires } = useQuery({
    queryKey: ["rh-onboarding-newhires", loja_id],
    queryFn: async () => {
      const ninetyDaysAgo = subDays(new Date(), 90).toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("pessoas")
        .select("id, nome, data_admissao")
        .eq("ativo", true)
        .gte("data_admissao", ninetyDaysAgo)
        .order("data_admissao", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch onboarding records
  const { data: onboardings, isLoading } = useQuery({
    queryKey: ["rh-onboarding", loja_id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("rh_onboarding")
        .select("*, pessoas(nome, data_admissao)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const allItems: OnboardingItem[] = [...DEFAULT_ITEMS, ...customItems].map((desc) => ({
        descricao: desc,
        concluido: false,
        data_conclusao: null,
      }));
      const { error } = await (supabase as any)
        .from("rh_onboarding")
        .insert({
          loja_id,
          pessoa_id: selectedPessoa,
          items: allItems,
          concluido: false,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Onboarding iniciado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["rh-onboarding"] });
      setDialogOpen(false);
      setSelectedPessoa("");
      setCustomItems([]);
    },
    onError: () => toast.error("Erro ao iniciar onboarding"),
  });

  const toggleItemMutation = useMutation({
    mutationFn: async ({ onboardingId, items, index }: { onboardingId: string; items: OnboardingItem[]; index: number }) => {
      const updated = [...items];
      updated[index] = {
        ...updated[index],
        concluido: !updated[index].concluido,
        data_conclusao: !updated[index].concluido ? new Date().toISOString().split("T")[0] : null,
      };
      const allDone = updated.every((item) => item.concluido);
      const { error } = await (supabase as any)
        .from("rh_onboarding")
        .update({
          items: updated,
          concluido: allDone,
          concluido_em: allDone ? new Date().toISOString() : null,
        })
        .eq("id", onboardingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rh-onboarding"] });
    },
    onError: () => toast.error("Erro ao atualizar item"),
  });

  function addCustomItem() {
    if (newCustomItem.trim()) {
      setCustomItems([...customItems, newCustomItem.trim()]);
      setNewCustomItem("");
    }
  }

  function removeCustomItem(index: number) {
    setCustomItems(customItems.filter((_, i) => i !== index));
  }

  function getProgress(items: OnboardingItem[]): { done: number; total: number; percent: number } {
    const total = items.length;
    const done = items.filter((i) => i.concluido).length;
    return { done, total, percent: total > 0 ? Math.round((done / total) * 100) : 0 };
  }

  // Filter new hires that don't already have onboarding
  const availableHires = newHires?.filter(
    (nh: any) => !onboardings?.some((ob: any) => ob.pessoa_id === nh.id)
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <h2 className="font-medium" style={{ fontSize: 13, color: "#0D1117" }}>
          Processos de Onboarding Ativos
        </h2>
        <Button onClick={() => setDialogOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Iniciar Onboarding
        </Button>
      </div>

      {isLoading ? (
        <p className="text-center py-8" style={{ color: "#6B7A90", fontSize: 13 }}>Carregando...</p>
      ) : onboardings?.length === 0 ? (
        <p className="text-center py-8" style={{ color: "#6B7A90", fontSize: 13 }}>Nenhum onboarding em andamento.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {onboardings?.map((ob: any) => {
            const items: OnboardingItem[] = ob.items || [];
            const progress = getProgress(items);
            return (
              <div
                key={ob.id}
                className="rounded-xl p-4 space-y-3"
                style={{ border: "0.5px solid #E8ECF2", background: "#fff" }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium" style={{ color: "#0D1117", fontSize: 13 }}>
                      {ob.pessoas?.nome || "—"}
                    </h3>
                    <span style={{ fontSize: 11, color: "#6B7A90" }}>
                      Admissão: {ob.pessoas?.data_admissao
                        ? format(new Date(ob.pessoas.data_admissao), "dd/MM/yyyy", { locale: ptBR })
                        : "—"}
                    </span>
                  </div>
                  {ob.concluido ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      <CheckCircle2 className="w-3 h-3" /> Concluído
                    </span>
                  ) : (
                    <span className="text-xs font-medium" style={{ color: "#6B7A90" }}>
                      {progress.done}/{progress.total}
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${progress.percent}%`,
                      backgroundColor: progress.percent === 100 ? "#22c55e" : "#3b82f6",
                    }}
                  />
                </div>

                {/* Checklist items */}
                <div className="space-y-2 pt-1">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Checkbox
                        checked={item.concluido}
                        onCheckedChange={() =>
                          toggleItemMutation.mutate({ onboardingId: ob.id, items, index: idx })
                        }
                      />
                      <span
                        className={item.concluido ? "line-through" : ""}
                        style={{ fontSize: 13, color: item.concluido ? "#6B7A90" : "#0D1117" }}
                      >
                        {item.descricao}
                      </span>
                      {item.data_conclusao && (
                        <span style={{ fontSize: 11, color: "#6B7A90" }}>
                          ({format(new Date(item.data_conclusao), "dd/MM", { locale: ptBR })})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Iniciar Onboarding</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block mb-1" style={{ fontSize: 11, color: "#6B7A90" }}>Novo colaborador</label>
              <Select value={selectedPessoa} onValueChange={setSelectedPessoa}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o colaborador" />
                </SelectTrigger>
                <SelectContent>
                  {availableHires?.map((f: any) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block mb-2 font-medium" style={{ fontSize: 13, color: "#0D1117" }}>
                Itens do checklist
              </label>
              <div className="space-y-1 mb-3">
                {DEFAULT_ITEMS.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 py-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                    <span style={{ fontSize: 13, color: "#0D1117" }}>{item}</span>
                  </div>
                ))}
                {customItems.map((item, i) => (
                  <div key={`custom-${i}`} className="flex items-center gap-2 py-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                    <span style={{ fontSize: 13, color: "#0D1117" }}>{item}</span>
                    <button onClick={() => removeCustomItem(i)} className="ml-auto">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Item personalizado..."
                  value={newCustomItem}
                  onChange={(e) => setNewCustomItem(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomItem())}
                />
                <Button type="button" variant="outline" size="sm" onClick={addCustomItem}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!selectedPessoa || createMutation.isPending}>
              {createMutation.isPending ? "Iniciando..." : "Iniciar Onboarding"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
