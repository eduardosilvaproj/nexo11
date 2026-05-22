import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { KeyRound, Loader2 } from "lucide-react";

export default function AcessoAcompanhamento() {
  const [serial, setSerial] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const navigate = useNavigate();

  const handleAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serial.trim()) {
      toast.error("Por favor, digite o código de acesso.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('validar_acesso_acompanhamento', {
        p_serial: serial.trim()
      });

      if (error) throw error;

      if (data.valido) {
        sessionStorage.setItem('acompanhamento_serial_validado', 'true');
        sessionStorage.setItem('acompanhamento_serial', serial.trim());
        sessionStorage.setItem('acompanhamento_nome_cliente', data.nome_cliente || '');
        
        toast.success(data.mensagem);
        navigate('/acompanhamento-publico');
      } else {
        toast.error(data.mensagem);
      }
    } catch (error: any) {
      console.error('Erro ao validar acesso:', error);
      toast.error("Ocorreu um erro ao validar o código.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <img src="/nexo-logo.png" alt="NEXO Logo" className="w-32 h-auto object-contain" />
          <h1 className="text-2xl font-bold text-white">Acompanhamento da Criação do Sistema</h1>
          <p className="text-muted-foreground">
            Digite o código de acesso para visualizar o andamento da criação do sistema.
          </p>
        </div>

        <Card className="bg-[#0c1526] border-white/10 shadow-2xl">
          <CardContent className="pt-6">
            <form onSubmit={handleAccess} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Código de Acesso (Serial)"
                    value={serial}
                    onChange={(e) => setSerial(e.target.value)}
                    className="pl-10 bg-black/20 border-white/10 text-white placeholder:text-muted-foreground"
                    disabled={loading}
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full bg-[#1a9be8] hover:bg-[#1a9be8]/90 text-white" 
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  "Acessar acompanhamento"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} NEXO - Gestão de Planejados
        </p>
      </div>
    </div>
  );
}
