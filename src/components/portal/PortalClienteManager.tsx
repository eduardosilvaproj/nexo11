import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Copy, RefreshCcw, Link2Off, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props {
  contratoId: string;
  clienteId: string;
  lojaId: string;
}

export function PortalClienteManager({ contratoId, clienteId, lojaId }: Props) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);

  const { data: acesso, isLoading } = useQuery({
    queryKey: ["portal-acesso", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cliente_portal_acessos")
        .select("*")
        .eq("contrato_id", contratoId)
        .eq("ativo", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const gerarLink = useMutation({
    mutationFn: async () => {
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      const { data, error } = await supabase
        .from("cliente_portal_acessos")
        .insert({
          loja_id: lojaId,
          cliente_id: clienteId,
          contrato_id: contratoId,
          token_hash: token,
          ativo: true,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-acesso", contratoId] });
      toast.success("Link do portal gerado com sucesso!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const revogarAcesso = useMutation({
    mutationFn: async () => {
      if (!acesso) return;
      const { error } = await supabase
        .from("cliente_portal_acessos")
        .update({ ativo: false })
        .eq("id", acesso.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-acesso", contratoId] });
      toast.success("Acesso ao portal revogado.");
    },
  });

  const copyToClipboard = () => {
    if (!acesso) return;
    const url = `${window.location.origin}/portal/${acesso.token_hash}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado para a área de transferência!");
  };

  if (isLoading) return <Loader2 className="animate-spin" />;

  return (
    <Card className="bg-slate-50 border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-blue-500" />
          Portal do Cliente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!acesso ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              O cliente ainda não possui um link de acesso ativo para este contrato.
            </p>
            <Button 
              size="sm" 
              className="w-full bg-blue-600 hover:bg-blue-700" 
              onClick={() => gerarLink.mutate()}
              disabled={gerarLink.isPending}
            >
              Gerar Link de Acesso
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-2 bg-white rounded border border-slate-200 text-[10px] font-mono break-all text-slate-500">
              {window.location.origin}/portal/{acesso.token_hash}
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={copyToClipboard}>
                <Copy className="w-3 h-3 mr-2" />
                Copiar
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.open(`/portal/${acesso.token_hash}`, '_blank')}>
                <Eye className="w-3 h-3 mr-2" />
                Abrir
              </Button>
            </div>

            <div className="pt-2 border-t border-slate-200 flex flex-col gap-2">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Criado em: {format(new Date(acesso.created_at), "dd/MM/yy")}</span>
                {acesso.ultimo_acesso_em && (
                  <span>Último acesso: {format(new Date(acesso.ultimo_acesso_em), "dd/MM HH:mm")}</span>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-red-500 hover:text-red-600 hover:bg-red-50 h-7 text-[11px]"
                onClick={() => revogarAcesso.mutate()}
              >
                <Link2Off className="w-3 h-3 mr-2" />
                Revogar Acesso
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
