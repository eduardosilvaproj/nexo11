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
      const result = data as any;

      if (result?.valido) {
        sessionStorage.setItem('acompanhamento_serial_validado', 'true');
        sessionStorage.setItem('acompanhamento_serial', serial.trim());
        sessionStorage.setItem('acompanhamento_nome_cliente', result.nome_cliente || '');
        toast.success(result.mensagem);
        navigate('/acompanhamento-publico');
      } else {
        toast.error(result?.mensagem || "Código inválido.");
      }
    } catch (error: any) {
      console.error('Erro ao validar acesso:', error);
      toast.error("Ocorreu um erro ao validar o código.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen nexo-gradient-soft flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* decorative blobs */}
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-sky-200/40 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-emerald-200/40 blur-3xl" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="flex flex-col items-center text-center space-y-3">
          <img src="/nexo-logo.png" alt="NEXO" className="w-28 h-auto object-contain mb-2" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Acompanhamento da Criação</h1>
          <p className="text-sm text-slate-500 max-w-sm">
            Digite o código de acesso para visualizar o andamento da criação do seu sistema.
          </p>
        </div>

        <Card className="shadow-xl border-slate-200/60">
          <CardContent className="pt-6 pb-6">
            <form onSubmit={handleAccess} className="space-y-4">
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Código de Acesso (Serial)"
                  value={serial}
                  onChange={(e) => setSerial(e.target.value)}
                  className="pl-10 h-11"
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Validando...</>
                ) : (
                  "Acessar acompanhamento"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} NEXO &middot; Gestão de Planejados
        </p>
      </div>
    </div>
  );
}
