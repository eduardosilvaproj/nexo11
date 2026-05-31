import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Plus, CheckCircle2, Truck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  pedidoId: string;
  tipo: "terceirizada" | "interna";
}

interface Volume {
  id: string;
  numero: string;
  descricao: string | null;
  status: "pendente" | "em_transito" | "entregue";
  data_entrega: string | null;
  created_at: string;
}

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  pendente: { label: "Pendente", color: "#6B7A90", bg: "#F4F6FA" },
  em_transito: { label: "Em Trânsito", color: "#1E6FBF", bg: "#E6F3FF" },
  entregue: { label: "Entregue", color: "#12B76A", bg: "#D1FAE5" },
};

export function RastreioVolumes({ pedidoId, tipo }: Props) {
  const { perfil } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [numero, setNumero] = useState("");
  const [descricao, setDescricao] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: volumes, isLoading } = useQuery({
    queryKey: ["producao-volumes", pedidoId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("producao_volumes")
        .select("*")
        .eq("pedido_id", pedidoId)
        .eq("tipo", tipo)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Volume[];
    },
  });

  const totalVolumes = volumes?.length ?? 0;
  const entregues = volumes?.filter((v) => v.status === "entregue").length ?? 0;
  const progressPct = totalVolumes > 0 ? Math.round((entregues / totalVolumes) * 100) : 0;

  async function handleAdd() {
    if (!numero.trim()) {
      toast.error("Informe o número do volume");
      return;
    }
    if (!perfil?.loja_id) {
      toast.error("Loja não identificada");
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any).from("producao_volumes").insert({
      pedido_id: pedidoId,
      tipo,
      loja_id: perfil.loja_id,
      numero: numero.trim(),
      descricao: descricao.trim() || null,
      status: "pendente",
    });
    setSaving(false);
    if (error) {
      toast.error("Erro ao adicionar volume: " + error.message);
      return;
    }
    toast.success("Volume adicionado");
    setNumero("");
    setDescricao("");
    setShowForm(false);
    qc.invalidateQueries({ queryKey: ["producao-volumes", pedidoId] });
  }

  async function handleMarcarEntregue(volumeId: string) {
    const { error } = await (supabase as any)
      .from("producao_volumes")
      .update({ status: "entregue", data_entrega: new Date().toISOString() })
      .eq("id", volumeId);
    if (error) {
      toast.error("Erro ao atualizar: " + error.message);
      return;
    }
    toast.success("Volume marcado como entregue");
    qc.invalidateQueries({ queryKey: ["producao-volumes", pedidoId] });
  }

  async function handleMarcarTransito(volumeId: string) {
    const { error } = await (supabase as any)
      .from("producao_volumes")
      .update({ status: "em_transito" })
      .eq("id", volumeId);
    if (error) {
      toast.error("Erro ao atualizar: " + error.message);
      return;
    }
    toast.success("Volume em trânsito");
    qc.invalidateQueries({ queryKey: ["producao-volumes", pedidoId] });
  }

  return (
    <div className="rounded-xl bg-white p-5" style={{ border: "0.5px solid #E8ECF2" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package size={15} style={{ color: "#1E6FBF" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#0D1117" }}>Rastreio de Volumes</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)} className="h-7 text-xs gap-1">
          <Plus size={13} /> Adicionar
        </Button>
      </div>

      {/* Progress bar */}
      {totalVolumes > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span style={{ fontSize: 11, color: "#6B7A90" }}>{entregues}/{totalVolumes} entregues</span>
            <span style={{ fontSize: 11, color: "#6B7A90" }}>{progressPct}%</span>
          </div>
          <div className="w-full h-2 rounded-full" style={{ backgroundColor: "#E8ECF2" }}>
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%`, backgroundColor: "#12B76A" }}
            />
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="mb-4 p-3 rounded-lg space-y-2" style={{ backgroundColor: "#F4F6FA" }}>
          <Input
            placeholder="Número do volume"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            className="h-8 text-sm"
          />
          <Input
            placeholder="Descrição (opcional)"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="h-8 text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={saving} className="h-7 text-xs">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)} className="h-7 text-xs">
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Volume list */}
      {isLoading ? (
        <div style={{ fontSize: 12, color: "#6B7A90" }}>Carregando...</div>
      ) : totalVolumes === 0 ? (
        <div style={{ fontSize: 12, color: "#6B7A90" }}>Nenhum volume registrado.</div>
      ) : (
        <div className="space-y-2">
          {volumes!.map((vol) => {
            const st = STATUS_LABEL[vol.status];
            return (
              <div key={vol.id} className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: "#FAFBFC", border: "0.5px solid #E8ECF2" }}>
                <div className="flex items-center gap-2">
                  <span className="rounded-full px-2 py-0.5" style={{ fontSize: 10, backgroundColor: st.bg, color: st.color }}>
                    {st.label}
                  </span>
                  <span style={{ fontSize: 13, color: "#0D1117", fontWeight: 500 }}>{vol.numero}</span>
                  {vol.descricao && <span style={{ fontSize: 11, color: "#6B7A90" }}>— {vol.descricao}</span>}
                </div>
                <div className="flex gap-1">
                  {vol.status === "pendente" && (
                    <Button variant="ghost" size="sm" onClick={() => handleMarcarTransito(vol.id)} className="h-6 text-xs gap-1 px-2">
                      <Truck size={12} /> Trânsito
                    </Button>
                  )}
                  {vol.status !== "entregue" && (
                    <Button variant="ghost" size="sm" onClick={() => handleMarcarEntregue(vol.id)} className="h-6 text-xs gap-1 px-2">
                      <CheckCircle2 size={12} /> Entregue
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
