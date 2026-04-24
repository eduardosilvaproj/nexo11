
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KeyRound, Send, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ModalLiberarDescontoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAprovado: () => void;
  orcamentoId?: string;
  percentual?: number;
}

export function ModalLiberarDesconto({ 
  open, 
  onOpenChange, 
  onAprovado,
  orcamentoId,
  percentual = 0
}: ModalLiberarDescontoProps) {
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusRemoto, setStatusRemoto] = useState<"idle" | "enviado" | "aprovado">("idle");

  const handleConfirmarSenha = () => {
    if (password === "1234") {
      toast.success("Desconto liberado com sucesso!");
      onAprovado();
      onOpenChange(false);
      setPassword("");
    } else {
      toast.error("Senha incorreta");
    }
  };

  const handleSolicitarRemoto = async () => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Registrar solicitação na nova tabela
      const { error } = await supabase
        .from("solicitacoes_desconto" as any)
        .insert({
          orcamento_id: orcamentoId,
          vendedor_id: user.id,
          percentual_solicitado: percentual,
          status: 'pendente'
        });
      
      if (error) throw error;

      // Também enviar notificação se possível (opcional, já que registramos a solicitação)
      await supabase.from("notificacoes").insert({
        user_id: user.id, // Notifica o próprio usuário que a solicitação foi enviada? 
        // Em um cenário real, deveríamos buscar o gerente da loja.
        tipo: "solicitacao_desconto",
        mensagem: `Solicitação de desconto de ${percentual}% enviada para aprovação.`,
        link: orcamentoId ? `/orcamentos/${orcamentoId}` : undefined
      });

      setStatusRemoto("enviado");
      toast.success("Solicitação enviada ao gerente");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erro ao enviar solicitação");
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
            <TabsTrigger value="local">Senha</TabsTrigger>
            <TabsTrigger value="remoto">Aprovar remotamente</TabsTrigger>
          </TabsList>
          
          <TabsContent value="local" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Digite a senha"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleConfirmarSenha()}
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
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white" 
                    onClick={handleSolicitarRemoto}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Enviar solicitação para o gerente
                  </Button>
                </>
              ) : (
                <div className="p-8 bg-amber-50 rounded-lg border border-amber-200 flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 text-amber-600 animate-spin" />
                  <div className="text-center">
                    <p className="text-amber-800 font-medium">Aguardando aprovação do gerente...</p>
                    <p className="text-xs text-amber-700 mt-1">
                      O desconto ficará bloqueado até a resposta.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
