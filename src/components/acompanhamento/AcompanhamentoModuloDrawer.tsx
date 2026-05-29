import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ExternalLink, Save, CheckCircle2 } from "lucide-react";

interface AcompanhamentoModuloDrawerProps {
  modulo: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function AcompanhamentoModuloDrawer({ modulo, isOpen, onClose, onSave }: AcompanhamentoModuloDrawerProps) {
  const { user } = useAuth();
  const [formData, setFormData] = React.useState<any>({});
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (modulo) {
      setFormData({
        ...modulo,
        resumo_modulo: modulo.resumo_modulo || '',
        funcionalidades_text: (modulo.funcionalidades_json || []).join('\n'),
        processos_text: (modulo.processos_json || []).join('\n'),
        ok_items_text: (modulo.ok_items_json || []).join('\n'),
        revisar_items_text: (modulo.revisar_items_json || []).join('\n'),
        proximos_passos_text: (modulo.proximos_passos_json || []).join('\n'),
      });
    }
  }, [modulo]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedData = {
        ...formData,
        funcionalidades_json: formData.funcionalidades_text.split('\n').filter((l: string) => l.trim() !== ''),
        processos_json: formData.processos_text.split('\n').filter((l: string) => l.trim() !== ''),
        ok_items_json: formData.ok_items_text.split('\n').filter((l: string) => l.trim() !== ''),
        revisar_items_json: formData.revisar_items_text.split('\n').filter((l: string) => l.trim() !== ''),
        proximos_passos_json: formData.proximos_passos_text.split('\n').filter((l: string) => l.trim() !== ''),
      };

      // Remove the temporary text fields
      const { funcionalidades_text, processos_text, ok_items_text, revisar_items_text, proximos_passos_text, ...finalData } = updatedData;

      const { error } = await supabase
        .from('acompanhamento_modulos')
        .update(finalData)
        .eq('id', modulo.id);

      if (error) throw error;
      toast.success("Módulo atualizado com sucesso");
      onSave();
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAprovado = async () => {
    try {
      const newValue = !formData.aprovado;
      
      if (newValue && !user?.id) {
        toast.error("Erro: Usuário não autenticado");
        return;
      }

      const { error } = await supabase
        .from('acompanhamento_modulos')
        .update({
          aprovado: newValue,
          aprovado_em: newValue ? new Date().toISOString() : null,
          aprovado_por: newValue ? user?.id : null
        })
        .eq('id', modulo.id);

      if (error) throw error;
      
      setFormData({
        ...formData,
        aprovado: newValue,
        aprovado_em: newValue ? new Date().toISOString() : null,
        aprovado_por: newValue ? user?.id : null
      });
      
      toast.success(newValue ? "Módulo aprovado" : "Aprovação removida");
    } catch (error: any) {
      toast.error("Erro ao alterar aprovação: " + error.message);
    }
  };

  if (!modulo) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[100vw] overflow-y-auto border-slate-200 bg-slate-50 text-slate-950 sm:max-w-[640px]">
        <SheetHeader className="border-b border-slate-200 pb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <Badge variant="outline" className="rounded-full border-slate-200 bg-white text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{formData.area}</Badge>
              <SheetTitle className="text-2xl font-black leading-tight text-slate-950">{formData.nome}</SheetTitle>
            </div>
            <Button
              variant={formData.aprovado ? "default" : "outline"}
              size="sm"
              className={formData.aprovado ? "shrink-0 rounded-2xl bg-emerald-600 hover:bg-emerald-700" : "shrink-0 rounded-2xl border-slate-200 bg-white font-bold hover:bg-slate-100"}
              onClick={toggleAprovado}
            >
              {formData.aprovado ? (
                <><CheckCircle2 className="h-4 w-4 mr-2" /> Aprovado</>
              ) : (
                <>Marcar OK</>
              )}
            </Button>
          </div>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="font-bold text-slate-700">Área</Label>
              <Select value={formData.area || "Início"} onValueChange={(v) => setFormData({...formData, area: v})}>
                <SelectTrigger className="rounded-2xl border-slate-200 bg-white shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Início">Início</SelectItem>
                  <SelectItem value="Operação">Operação</SelectItem>
                  <SelectItem value="Gestão">Gestão</SelectItem>
                  <SelectItem value="Inteligência">Inteligência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-slate-700">Status</Label>
              <Select value={formData.status || "nao_iniciado"} onValueChange={(v) => setFormData({...formData, status: v})}>
                <SelectTrigger className="rounded-2xl border-slate-200 bg-white shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nao_iniciado">Não iniciado</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="em_revisao">Em revisão</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="pausado">Pausado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-bold text-slate-700">Resumo do Módulo (Público)</Label>
            <Textarea 
              rows={3}
              value={formData.resumo_modulo || ''} 
              onChange={(e) => setFormData({...formData, resumo_modulo: e.target.value})}
              placeholder="Descreva de forma curta e objetiva a finalidade deste módulo..."
              className="rounded-2xl border-slate-200 bg-white shadow-sm"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="font-bold text-slate-700">Percentual de Evolução</Label>
              <span className="text-sm font-bold">{formData.percentual}%</span>
            </div>
            <Input
              type="range"
              min="0"
              max="100"
              value={formData.percentual}
              onChange={(e) => setFormData({...formData, percentual: parseInt(e.target.value)})}
              className="h-2 accent-slate-950"
            />
            <Progress value={formData.percentual} className="h-2 bg-slate-200" />
          </div>

          <Tabs defaultValue="listas" className="w-full">
            <TabsList className="no-scrollbar w-full justify-start overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1">
              <TabsTrigger value="listas">Conteúdo</TabsTrigger>
              <TabsTrigger value="anotacoes">Anotações</TabsTrigger>
              <TabsTrigger value="visual">Visual</TabsTrigger>
            </TabsList>

            <TabsContent value="listas" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Funcionalidades (uma por linha)</Label>
                <Textarea 
                  rows={4}
                  value={formData.funcionalidades_text} 
                  onChange={(e) => setFormData({...formData, funcionalidades_text: e.target.value})}
                  className="rounded-2xl border-slate-200 bg-white shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Processos (um por linha)</Label>
                <Textarea 
                  rows={4}
                  value={formData.processos_text} 
                  onChange={(e) => setFormData({...formData, processos_text: e.target.value})}
                  className="rounded-2xl border-slate-200 bg-white shadow-sm"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="font-bold text-emerald-600">O que está OK</Label>
                  <Textarea 
                    rows={4}
                    value={formData.ok_items_text} 
                    onChange={(e) => setFormData({...formData, ok_items_text: e.target.value})}
                    className="rounded-2xl border-slate-200 bg-white shadow-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-amber-600">O que revisar</Label>
                  <Textarea 
                    rows={4}
                    value={formData.revisar_items_text} 
                    onChange={(e) => setFormData({...formData, revisar_items_text: e.target.value})}
                    className="rounded-2xl border-slate-200 bg-white shadow-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-sky-600">Próximos passos</Label>
                <Textarea 
                  rows={4}
                  value={formData.proximos_passos_text} 
                  onChange={(e) => setFormData({...formData, proximos_passos_text: e.target.value})}
                  className="rounded-2xl border-slate-200 bg-white shadow-sm"
                />
              </div>
            </TabsContent>

            <TabsContent value="anotacoes" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Anotações Internas</Label>
                <Textarea 
                  rows={15}
                  value={formData.anotacoes_internas || ''} 
                  onChange={(e) => setFormData({...formData, anotacoes_internas: e.target.value})}
                  className="rounded-2xl border-slate-200 bg-white shadow-sm"
                  placeholder="Registro histórico, decisões técnicas ou observações de negócio sobre este módulo..."
                />
              </div>
            </TabsContent>

            <TabsContent value="visual" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">URL do Print / Referência Visual</Label>
                <div className="flex gap-2">
                  <Input 
                    value={formData.print_url || ''} 
                    onChange={(e) => setFormData({...formData, print_url: e.target.value})}
                    placeholder="https://exemplo.com/imagem.png"
                    className="rounded-2xl border-slate-200 bg-white shadow-sm"
                  />
                  {formData.print_url && (
                    <Button variant="outline" size="icon" onClick={() => window.open(formData.print_url, '_blank')}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              {formData.print_url ? (
                <div className="flex items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
                  <img 
                    src={formData.print_url} 
                    alt="Print do módulo" 
                    className="max-w-full h-auto rounded shadow-lg"
                    onError={(e) => {
                      (e.target as any).src = 'https://placehold.co/600x400?text=URL+da+Imagem+Invalida';
                    }}
                  />
                </div>
              ) : (
                <div className="flex h-40 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white text-slate-500">
                  <span>Nenhum print cadastrado</span>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <SheetFooter className="border-t border-slate-200 pt-6">
          <Button variant="ghost" onClick={onClose} disabled={isSaving} className="rounded-2xl">Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2 rounded-2xl bg-slate-950 shadow-lg shadow-slate-950/10 hover:bg-slate-800">
            <Save className="h-4 w-4" />
            {isSaving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
