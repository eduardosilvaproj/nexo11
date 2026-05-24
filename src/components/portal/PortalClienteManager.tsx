import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Copy, Link2Off, Eye, Loader2, RefreshCcw, Send } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ComunicacaoClienteDialog } from "./ComunicacaoClienteDialog";

interface Props {
  contratoId: string;
  clienteId: string;
  lojaId: string;
}

export function PortalClienteManager({ contratoId, clienteId, lojaId }: Props) {
  const qc = useQueryClient();
  const [comunicarOpen, setComunicarOpen] = useState(false);

  const { data: acesso, isLoading } = useQuery({
    queryKey: ["portal-token", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_tokens")
        .select("*")
        .eq("contrato_id", contratoId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const isAtivo = acesso && !(acesso as any).revogado && new Date(acesso.expires_at) > new Date();

  const gerarLink = useMutation({
    mutationFn: async () => {
      if (acesso) {
        // Reactivate / extend existing
        const { error } = await supabase
          .from("portal_tokens")
          .update({
            revogado: false,
            expires_at: new Date(Date.now() + 90 * 86400000).toISOString(),
          } as any)
          .eq("id", acesso.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("portal_tokens")
          .insert({ contrato_id: contratoId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-token", contratoId] });
      toast.success("Link do portal ativado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const revogarAcesso = useMutation({
    mutationFn: async () => {
      if (!acesso) return;
      const { error } = await supabase
        .from("portal_tokens")
        .update({ revogado: true } as any)
        .eq("id", acesso.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-token", contratoId] });
      toast.success("Acesso ao portal revogado.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const portalUrl = acesso ? `${window.location.origin}/portal/${acesso.token}` : "";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(portalUrl);
    toast.success("Link copiado!");
  };

  if (isLoading) return <Card className="p-4"><Loader2 className="animate-spin" /></Card>;

  return (
    <Card className="bg-slate-50 border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-blue-500" />
          Portal do Cliente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!isAtivo ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              {acesso ? "Acesso revogado ou expirado." : "O cliente ainda não possui acesso ao portal."}
            </p>
            <Button 
              size="sm" 
              className="w-full bg-blue-600 hover:bg-blue-700" 
              onClick={() => gerarLink.mutate()}
              disabled={gerarLink.isPending}
            >
              {acesso ? <><RefreshCcw className="w-3 h-3 mr-2" />Reativar Acesso</> : "Gerar Link de Acesso"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-2 bg-white rounded border border-slate-200 text-[10px] font-mono break-all text-slate-500">
              {portalUrl}
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={copyToClipboard}>
                <Copy className="w-3 h-3 mr-2" />
                Copiar
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.open(`/portal/${acesso.token}`, '_blank')}>
                <Eye className="w-3 h-3 mr-2" />
                Abrir
              </Button>
            </div>

            <Button 
              className="w-full bg-green-600 hover:bg-green-700 text-white" 
              size="sm"
              onClick={() => setComunicarOpen(true)}
            >
              <Send className="w-3 h-3 mr-2" />
              Comunicar Cliente
            </Button>

            <div className="pt-2 border-t border-slate-200 flex flex-col gap-2">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Criado em: {format(new Date(acesso.created_at), "dd/MM/yy")}</span>
                {(acesso as any).ultimo_acesso_em && (
                  <span>Último acesso: {format(new Date((acesso as any).ultimo_acesso_em), "dd/MM HH:mm")}</span>
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

      <ComunicacaoClienteDialog 
        open={comunicarOpen}
        onOpenChange={setComunicarOpen}
        contratoId={contratoId}
        clienteId={clienteId}
        lojaId={lojaId}
      />
    </Card>
  );
}
