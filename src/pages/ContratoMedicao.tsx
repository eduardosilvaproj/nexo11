import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Plus, Loader2, Settings } from "lucide-react";
import { toast } from "sonner";
import { ContratoMedicaoAmbientesSection } from "@/components/contrato/ContratoMedicaoAmbientesSection";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { ChecklistTemplateDialog } from "@/components/tecnico/ChecklistTemplateDialog";

export default function ContratoMedicaoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [newAmbienteNome, setNewAmbienteNome] = useState("");
  const [newAmbienteValor, setNewAmbienteValor] = useState("");
  const [newAmbienteObs, setNewAmbienteObs] = useState("");
  const [adding, setAdding] = useState(false);

  const canEdit = hasRole("admin") || hasRole("gerente") || hasRole("tecnico");

  const { data: contrato, isLoading: loadingContrato } = useQuery({
    queryKey: ["contrato-medicao-page", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("id, cliente_nome, loja_id")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleAddAmbiente = async () => {
    if (!newAmbienteNome.trim() || !contrato) return;
    setAdding(true);
    try {
      const { error } = await supabase.from("contrato_ambientes").insert({
        contrato_id: id!,
        loja_id: contrato.loja_id,
        nome: newAmbienteNome.trim(),
        valor_liquido: Number(newAmbienteValor.replace(",", ".")) || 0,
        observacoes: newAmbienteObs.trim(),
        status_medicao: "pendente",
        origem: "manual"
      });
      if (error) throw error;
      toast.success("Ambiente adicionado!");
      setAddModalOpen(false);
      setNewAmbienteNome("");
      setNewAmbienteValor("");
      setNewAmbienteObs("");
      qc.invalidateQueries({ queryKey: ["ambientes_med_conf", id] });
    } catch (error: any) {
      toast.error("Erro ao adicionar: " + error.message);
    } finally {
      setAdding(false);
    }
  };

  if (loadingContrato) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!contrato) {
    return <div className="p-8">Contrato não encontrado</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <button
            onClick={() => navigate(`/contratos/${id}`)}
            className="flex items-center gap-1 text-[#6B7A90] hover:text-[#0D1117] transition-colors text-sm mb-1"
          >
            <ChevronLeft size={16} />
            Voltar ao contrato
          </button>
          <h1 className="text-2xl font-semibold text-[#0D1117]">
            Medição — {contrato.cliente_nome} <span className="text-[#6B7A90] font-normal">#{id?.slice(0, 6).toUpperCase()}</span>
          </h1>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTemplateOpen(true)}
              style={{ borderColor: "#1E6FBF", color: "#1E6FBF" }}
            >
              <Settings className="mr-2 h-4 w-4" />
              Configurar checklist
            </Button>
            <Button 
              onClick={() => setAddModalOpen(true)}
              className="bg-[#1E6FBF] hover:bg-[#1759A0] text-white"
            >
              <Plus size={18} className="mr-2" />
              Adicionar ambiente manualmente
            </Button>
          </div>
        )}
      </div>

      <ChecklistTemplateDialog open={templateOpen} onOpenChange={setTemplateOpen} />

      <ContratoMedicaoAmbientesSection 
        contratoId={id!}
        lojaId={contrato.loja_id}
        canEdit={canEdit}
        funcao="medidor"
        titulo="Ambientes para medição"
      />

      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar ambiente manualmente</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-[#6B7A90] mb-1.5 block">Nome do ambiente</label>
              <Input 
                value={newAmbienteNome}
                onChange={(e) => setNewAmbienteNome(e.target.value)}
                placeholder="Ex: Varanda Gourmet, Home Office..."
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#6B7A90] mb-1.5 block">Valor orçado (R$)</label>
              <Input 
                value={newAmbienteValor}
                onChange={(e) => setNewAmbienteValor(e.target.value)}
                placeholder="0,00"
                type="text"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#6B7A90] mb-1.5 block">Observação (opcional)</label>
              <Input 
                value={newAmbienteObs}
                onChange={(e) => setNewAmbienteObs(e.target.value)}
                placeholder="Ex: Detalhes específicos da medição..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModalOpen(false)} disabled={adding}>Cancelar</Button>
            <Button onClick={handleAddAmbiente} disabled={adding || !newAmbienteNome.trim()} className="bg-[#1E6FBF] hover:bg-[#1759A0]">
              {adding ? <Loader2 size={16} className="animate-spin mr-2" /> : <Plus size={16} className="mr-2" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
