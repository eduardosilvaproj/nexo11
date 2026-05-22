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
import { ExternalLink, Save, CheckCircle2, XCircle } from "lucide-react";

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
      <SheetContent className="w-[100vw] sm:max-w-[600px] overflow-y-auto bg-[#0a0e1a] border-white/5 text-white">
        <SheetHeader className="pb-6 border-b border-white/5">
          <div className="flex justify-between items-start">
            <div>
              <Badge variant="outline" className="mb-2 bg-white/5 border-white/10 text-muted-foreground uppercase">{formData.area}</Badge>
              <SheetTitle className="text-2xl font-bold text-white">{formData.nome}</SheetTitle>
            </div>
            <Button 
              variant={formData.aprovado ? "default" : "outline"} 
              size="sm" 
              className={formData.aprovado ? "bg-green-600 hover:bg-green-700" : "border-white/10"}
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

        <div className="py-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Área</Label>
              <Select value={formData.area || "Início"} onValueChange={(v) => setFormData({...formData, area: v})}>
                <SelectTrigger className="bg-[#0c1526] border-white/10">
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
              <Label>Status</Label>
              <Select value={formData.status || "nao_iniciado"} onValueChange={(v) => setFormData({...formData, status: v})}>
                <SelectTrigger className="bg-[#0c1526] border-white/10">
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
            <div className="flex justify-between">
              <Label>Percentual de Evolução</Label>
              <span className="text-sm font-bold">{formData.percentual}%</span>
            </div>
            <Input 
              type="range" 
              min="0" 
              max="100" 
              value={formData.percentual} 
              onChange={(e) => setFormData({...formData, percentual: parseInt(e.target.value)})}
              className="h-2 bg-[#0c1526]"
            />
            <Progress value={formData.percentual} className="h-1" />
          </div>

          <Tabs defaultValue="listas" className="w-full">
            <TabsList className="bg-[#0c1526] border-white/10 w-full justify-start overflow-x-auto no-scrollbar">
              <TabsTrigger value="listas">Conteúdo</TabsTrigger>
              <TabsTrigger value="anotacoes">Anotações</TabsTrigger>
              <TabsTrigger value="visual">Visual</TabsTrigger>
            </TabsList>

            <TabsContent value="listas" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Funcionalidades (uma por linha)</Label>
                <Textarea 
                  rows={4}
                  value={formData.funcionalidades_text} 
                  onChange={(e) => setFormData({...formData, funcionalidades_text: e.target.value})}
                  className="bg-[#0c1526] border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label>Processos (um por linha)</Label>
                <Textarea 
                  rows={4}
                  value={formData.processos_text} 
                  onChange={(e) => setFormData({...formData, processos_text: e.target.value})}
                  className="bg-[#0c1526] border-white/10"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-green-500">O que está OK</Label>
                  <Textarea 
                    rows={4}
                    value={formData.ok_items_text} 
                    onChange={(e) => setFormData({...formData, ok_items_text: e.target.value})}
                    className="bg-[#0c1526] border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-yellow-500">O que revisar</Label>
                  <Textarea 
                    rows={4}
                    value={formData.revisar_items_text} 
                    onChange={(e) => setFormData({...formData, revisar_items_text: e.target.value})}
                    className="bg-[#0c1526] border-white/10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-blue-500">Próximos passos</Label>
                <Textarea 
                  rows={4}
                  value={formData.proximos_passos_text} 
                  onChange={(e) => setFormData({...formData, proximos_passos_text: e.target.value})}
                  className="bg-[#0c1526] border-white/10"
                />
              </div>
            </TabsContent>

            <TabsContent value="anotacoes" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Anotações Internas</Label>
                <Textarea 
                  rows={15}
                  value={formData.anotacoes_internas || ''} 
                  onChange={(e) => setFormData({...formData, anotacoes_internas: e.target.value})}
                  className="bg-[#0c1526] border-white/10"
                  placeholder="Registro histórico, decisões técnicas ou observações de negócio sobre este módulo..."
                />
              </div>
            </TabsContent>

            <TabsContent value="visual" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>URL do Print / Referência Visual</Label>
                <div className="flex gap-2">
                  <Input 
                    value={formData.print_url || ''} 
                    onChange={(e) => setFormData({...formData, print_url: e.target.value})}
                    placeholder="https://exemplo.com/imagem.png"
                    className="bg-[#0c1526] border-white/10"
                  />
                  {formData.print_url && (
                    <Button variant="outline" size="icon" onClick={() => window.open(formData.print_url, '_blank')}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              {formData.print_url ? (
                <div className="border border-white/10 rounded-lg overflow-hidden bg-black/20 flex items-center justify-center p-2">
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
                <div className="h-40 border border-dashed border-white/10 rounded-lg flex flex-col items-center justify-center text-muted-foreground">
                  <span>Nenhum print cadastrado</span>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <SheetFooter className="pt-6 border-t border-white/5">
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
