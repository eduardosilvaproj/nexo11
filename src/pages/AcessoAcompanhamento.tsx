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

      // Casting to any to avoid TS errors with Supabase Json type
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 p-4 text-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.10),transparent_34%)]" />
      <div className="pointer-events-none absolute left-1/2 top-10 h-72 w-72 -translate-x-1/2 rounded-full bg-sky-200/40 blur-3xl" />

      <div className="relative w-full max-w-md space-y-8">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-xl shadow-slate-200/70">
            <img src="/nexo-logo.png" alt="NEXO Logo" className="h-auto w-32 object-contain" />
          </div>
          <div className="space-y-3">
            <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-sky-600 shadow-sm">
              Portal do cliente
            </span>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">Acompanhamento da Criação</h1>
            <p className="mx-auto max-w-sm text-sm leading-relaxed text-slate-500">
              Digite o código de acesso para visualizar, em tempo real, o andamento da criação do seu sistema.
            </p>
          </div>
        </div>

        <Card className="rounded-[2rem] border-slate-200 bg-white/90 shadow-2xl shadow-slate-200/80 backdrop-blur">
          <CardContent className="p-6">
            <form onSubmit={handleAccess} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Código de acesso</label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Informe o serial recebido"
                    value={serial}
                    onChange={(e) => setSerial(e.target.value)}
                    className="h-12 rounded-2xl border-slate-200 bg-slate-50 pl-11 font-semibold text-slate-950 shadow-inner shadow-slate-100 placeholder:text-slate-400 focus-visible:ring-sky-500"
                    disabled={loading}
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="h-12 w-full rounded-2xl bg-slate-950 font-bold text-white shadow-lg shadow-slate-950/15 hover:bg-slate-800"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Acessar acompanhamento"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs font-medium text-slate-400">
          &copy; {new Date().getFullYear()} NEXO - Gestão de Planejados
        </p>
      </div>
    </div>
  );
}
