
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KeyRound, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ModalLiberarDescontoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAprovado: () => void;
  orcamentoId?: string;
}

export function ModalLiberarDesconto({ 
  open, 
  onOpenChange, 
  onAprovado,
  orcamentoId 
}: ModalLiberarDescontoProps) {
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusRemoto, setStatusRemoto] = useState<"idle" | "enviado" | "aprovado">("idle");

  const handleConfirmarSenha = () => {
    // Por enquanto, uma senha padrão para o gerente (pode ser configurada depois)
    if (password === "gerente123") {
      toast.success("Desconto liberado com sucesso!");
      onAprovado();
      onOpenChange(false);
    } else {
      toast.error("Senha incorreta");
    }
  };

  const handleSolicitarRemoto = async () => {
    setIsSubmitting(true);
    try {
      // Registrar solicitação (precisaremos da tabela, mas simulamos por enquanto se não existir)
      // Se tiver orcamentoId, podemos salvar no banco
      if (orcamentoId) {
        const { error } = await supabase
          .from("notificacoes")
          .insert({
            user_id: null, // para todos os gerentes? ou um específico
            titulo: "Solicitação de Desconto",
            mensagem: `O vendedor solicitou liberação de desconto para o orçamento ${orcamentoId}`,
            link: `/orcamentos/${orcamentoId}`,
          });
        
        if (error) throw error;
      }

      setStatusRemoto("enviado");
      toast.success("Solicitação enviada ao gerente");
    } catch (e) {
      toast.error("Erro ao enviar solicitação");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Autorização de Desconto</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="local" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="local">Senha Local</TabsTrigger>
            <TabsTrigger value="remoto">Aprovação Remota</TabsTrigger>
          </TabsList>
          
          <TabsContent value="local" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password">Senha do Gerente</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Digite a senha"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <Button className="w-full" onClick={handleConfirmarSenha}>
              Confirmar
            </Button>
          </TabsContent>

          <TabsContent value="remoto" className="space-y-4 py-4">
            <div className="text-center space-y-4">
              {statusRemoto === "idle" ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Clique abaixo para enviar uma solicitação de liberação para o gerente responsável.
                  </p>
                  <Button 
                    className="w-full bg-amber-600 hover:bg-amber-700" 
                    onClick={handleSolicitarRemoto}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Enviar para gerente aprovar
                  </Button>
                </>
              ) : (
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-amber-800 font-medium">Solicitação enviada!</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Aguardando aprovação do gerente. Você será notificado assim que for liberado.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
