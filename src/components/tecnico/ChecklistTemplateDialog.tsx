import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GripVertical, Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Tipo = "medicao" | "conferencia";

type TemplateItem = {
  id: string;
  descricao: string;
  obrigatorio: boolean;
  ordem: number;
  tipo: Tipo;
  _new?: boolean;
  _deleted?: boolean;
  _dirty?: boolean;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChecklistTemplateDialog({ open, onOpenChange }: Props) {
  const { perfil } = useAuth();
  const lojaId = perfil?.loja_id;
  const qc = useQueryClient();
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [dragIdx, setDragIdx] = useState<{ tipo: Tipo; idx: number } | null>(null);
  const [tab, setTab] = useState<Tipo>("medicao");

  const { data, isLoading } = useQuery({
    queryKey: ["checklist-templates", lojaId],
    enabled: open && !!lojaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklist_templates")
        .select("id, descricao, obrigatorio, ordem, tipo")
        .eq("loja_id", lojaId!)
        .eq("ativo", true)
        .order("tipo", { ascending: true })
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  useEffect(() => {
    if (data) setItems(data.map((d) => ({ ...d, tipo: (d.tipo ?? "conferencia") as Tipo })));
  }, [data]);

  const visibleByTipo = (t: Tipo) => items.filter((i) => !i._deleted && i.tipo === t);

  const updateItem = (id: string, patch: Partial<TemplateItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch, _dirty: true } : i)));
  };

  const removeItem = (id: string) => {
    setItems((prev) =>
      prev.flatMap((i) => {
        if (i.id !== id) return [i];
        if (i._new) return [];
        return [{ ...i, _deleted: true }];
      }),
    );
  };

  const addItem = (tipo: Tipo) => {
    const tmpId = `new-${Date.now()}`;
    const ordem = visibleByTipo(tipo).length + 1;
    setItems((prev) => [
      ...prev,
      { id: tmpId, descricao: "", obrigatorio: true, ordem, tipo, _new: true, _dirty: true },
    ]);
  };

  const handleDrop = (tipo: Tipo, idx: number) => {
    if (!dragIdx || dragIdx.tipo !== tipo || dragIdx.idx === idx) return;
    const list = [...visibleByTipo(tipo)];
    const [moved] = list.splice(dragIdx.idx, 1);
    list.splice(idx, 0, moved);
    const reordered = list.map((i, k) => ({ ...i, ordem: k + 1, _dirty: true }));
    const others = items.filter((i) => i._deleted || i.tipo !== tipo);
    setItems([...others, ...reordered]);
    setDragIdx(null);
  };

  const handleSave = async () => {
    if (!lojaId) return;
    setSaving(true);
    try {
      const toDelete = items.filter((i) => i._deleted && !i._new).map((i) => i.id);
      const toInsert = items
        .filter((i) => i._new && !i._deleted && i.descricao.trim())
        .map((i) => ({
          loja_id: lojaId,
          descricao: i.descricao.trim(),
          obrigatorio: i.obrigatorio,
          ordem: i.ordem,
          tipo: i.tipo,
        }));
      const toUpdate = items.filter((i) => !i._new && !i._deleted && i._dirty);

      if (toDelete.length) {
        const { error } = await supabase.from("checklist_templates").delete().in("id", toDelete);
        if (error) throw error;
      }
      for (const u of toUpdate) {
        const { error } = await supabase
          .from("checklist_templates")
          .update({ descricao: u.descricao.trim(), obrigatorio: u.obrigatorio, ordem: u.ordem })
          .eq("id", u.id);
        if (error) throw error;
      }
      if (toInsert.length) {
        const { error } = await supabase.from("checklist_templates").insert(toInsert as any);
        if (error) throw error;
      }

      toast.success("Template atualizado");
      qc.invalidateQueries({ queryKey: ["checklist-templates", lojaId] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar template");
    } finally {
      setSaving(false);
    }
  };

  const renderList = (tipo: Tipo) => {
    const list = visibleByTipo(tipo);
    return (
      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {list.map((item, idx) => (
          <div
            key={item.id}
            draggable
            onDragStart={() => setDragIdx({ tipo, idx })}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(tipo, idx)}
            className="flex items-center gap-2 rounded-md border bg-background p-2"
          >
            <GripVertical className="h-4 w-4 shrink-0" style={{ color: "#B0BAC9", cursor: "grab" }} />
            <Input
              value={item.descricao}
              onChange={(e) => updateItem(item.id, { descricao: e.target.value })}
              placeholder="Descrição do item"
              className="h-8 text-[13px] border-0 focus-visible:ring-1 px-2"
              style={{ color: "#0D1117" }}
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-muted-foreground">Obrigatório</span>
              <Switch
                checked={item.obrigatorio}
                onCheckedChange={(v) => updateItem(item.id, { obrigatorio: v })}
              />
            </div>
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              aria-label="Remover"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => addItem(tipo)}
          className="w-full justify-start"
          style={{ color: "#1E6FBF" }}
        >
          <Plus className="mr-1 h-4 w-4" />
          Adicionar item
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Itens padrão do checklist técnico</DialogTitle>
          <p className="text-xs" style={{ color: "#6B7A90" }}>
            Gerados automaticamente para cada novo contrato
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tipo)}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="medicao">Medição fina</TabsTrigger>
              <TabsTrigger value="conferencia">Conferência</TabsTrigger>
            </TabsList>
            <TabsContent value="medicao" className="mt-3">
              {renderList("medicao")}
            </TabsContent>
            <TabsContent value="conferencia" className="mt-3">
              {renderList("conferencia")}
            </TabsContent>
          </Tabs>
        )}

        <div
          className="rounded-lg p-2.5 text-xs"
          style={{ backgroundColor: "#FEF3C7", color: "#633806" }}
        >
          Alterações valem apenas para novos contratos. Contratos existentes não são afetados.
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} style={{ backgroundColor: "#1E6FBF" }}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
