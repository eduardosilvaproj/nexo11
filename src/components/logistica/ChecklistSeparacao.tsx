import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

const DEFAULT_ITEMS: Omit<ChecklistItem, "id">[] = [
  { text: "Volumes conferidos", checked: false },
  { text: "Ferramentas carregadas", checked: false },
  { text: "Documentos impressos", checked: false },
  { text: "Veículo verificado", checked: false },
  { text: "Rota confirmada", checked: false },
];

function generateId() {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

interface Props {
  entregaId: string;
}

export function ChecklistSeparacao({ entregaId }: Props) {
  const { perfil, user } = useAuth();
  const lojaId = perfil?.loja_id;
  const qc = useQueryClient();

  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newItemText, setNewItemText] = useState("");

  const { data: existing, isLoading } = useQuery({
    queryKey: ["logistica-checklist", entregaId],
    enabled: !!entregaId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("logistica_checklists")
        .select("*")
        .eq("entrega_id", entregaId)
        .maybeSingle();
      if (error) throw error;
      return data as {
        id: string;
        items: ChecklistItem[];
        concluido: boolean;
      } | null;
    },
  });

  useEffect(() => {
    if (existing?.items && existing.items.length > 0) {
      setItems(existing.items);
    } else if (!existing && !isLoading) {
      setItems(DEFAULT_ITEMS.map((item) => ({ ...item, id: generateId() })));
    }
  }, [existing, isLoading]);

  const checkedCount = items.filter((i) => i.checked).length;
  const allChecked = items.length > 0 && checkedCount === items.length;
  const progress = items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0;

  const saveMutation = useMutation({
    mutationFn: async (opts: { markConcluido?: boolean }) => {
      const payload = {
        entrega_id: entregaId,
        loja_id: lojaId,
        items: items,
        concluido: opts.markConcluido ?? false,
        concluido_por: opts.markConcluido ? user?.id : null,
        concluido_em: opts.markConcluido ? new Date().toISOString() : null,
      };

      if (existing?.id) {
        const { error } = await (supabase as any)
          .from("logistica_checklists")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("logistica_checklists")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["logistica-checklist", entregaId] });
      if (vars.markConcluido) {
        toast.success("Separação concluída!");
      } else {
        toast.success("Checklist salvo");
      }
    },
    onError: () => {
      toast.error("Erro ao salvar checklist");
    },
  });

  function toggleItem(id: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  }

  function addItem() {
    const text = newItemText.trim();
    if (!text) return;
    setItems((prev) => [...prev, { id: generateId(), text, checked: false }]);
    setNewItemText("");
  }

  function handleSave() {
    saveMutation.mutate({ markConcluido: false });
  }

  function handleMarkSeparado() {
    saveMutation.mutate({ markConcluido: true });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="animate-spin" size={20} style={{ color: "#6B7A90" }} />
      </div>
    );
  }

  return (
    <div
      className="rounded-xl bg-card p-5 space-y-4"
      style={{ border: "0.5px solid #E8ECF2" }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold" style={{ color: "#0D1117" }}>
          Checklist de Separação
        </h3>
        <span className="text-[11px]" style={{ color: "#6B7A90" }}>
          {checkedCount}/{items.length} itens ({progress}%)
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${progress}%`,
            backgroundColor: allChecked ? "#10B981" : "#3B82F6",
          }}
        />
      </div>

      {/* Items */}
      <div className="space-y-2">
        {items.map((item) => (
          <label
            key={item.id}
            className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-gray-50 cursor-pointer"
          >
            <Checkbox
              checked={item.checked}
              onCheckedChange={() => toggleItem(item.id)}
              disabled={existing?.concluido}
            />
            <span
              className="text-[13px]"
              style={{
                color: item.checked ? "#6B7A90" : "#0D1117",
                textDecoration: item.checked ? "line-through" : "none",
              }}
            >
              {item.text}
            </span>
          </label>
        ))}
      </div>

      {/* Add custom item */}
      {!existing?.concluido && (
        <div className="flex gap-2">
          <Input
            placeholder="Adicionar item..."
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            className="text-[13px]"
          />
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus size={14} />
          </Button>
        </div>
      )}

      {/* Actions */}
      {!existing?.concluido && (
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="text-[13px]"
          >
            Salvar
          </Button>
          <Button
            size="sm"
            onClick={handleMarkSeparado}
            disabled={!allChecked || saveMutation.isPending}
            className="text-[13px] gap-1.5"
          >
            <CheckCircle2 size={14} />
            Marcar como separado
          </Button>
        </div>
      )}

      {existing?.concluido && (
        <div className="flex items-center gap-2 pt-2 text-[13px]" style={{ color: "#10B981" }}>
          <CheckCircle2 size={16} />
          Separação concluída
        </div>
      )}
    </div>
  );
}
