import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clienteId: string;
  clienteNome: string;
  lojaId: string;
};

function genCodigo() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function EnviarPortalDialog({ open, onOpenChange, clienteId, clienteNome, lojaId }: Props) {
  const [loading, setLoading] = useState(false);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [contratoId, setContratoId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!open) {
      setCodigo(null);
      setToken(null);
      setContratoId(null);
      setCopiedCode(false);
      setCopiedLink(false);
      return;
    }
    void gerar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function gerar() {
    setLoading(true);
    try {
      // pega contrato mais recente do cliente (opcional)
      const { data: contrato } = await supabase
        .from("contratos")
        .select("id")
        .eq("cliente_id", clienteId)
        .order("data_criacao", { ascending: false })
        .limit(1)
        .maybeSingle();

      // tenta gerar até 5 vezes em caso de colisão de código
      let inserted: any = null;
      let lastErr: any = null;
      for (let i = 0; i < 5; i++) {
        const novoCodigo = genCodigo();
        const { data, error } = await supabase
          .from("portal_acessos")
          .insert({
            cliente_id: clienteId,
            loja_id: lojaId,
            codigo: novoCodigo,
            contrato_id: contrato?.id ?? null,
          })
          .select("codigo, token, contrato_id")
          .single();
        if (!error && data) {
          inserted = data;
          break;
        }
        lastErr = error;
      }
      if (!inserted) throw lastErr ?? new Error("Erro ao gerar código");
      setCodigo(inserted.codigo);
      setToken(inserted.token);
      setContratoId(inserted.contrato_id);
    } catch (err: any) {
      toast.error(err.message ?? "Não foi possível gerar o código");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  const link = token ? `${window.location.origin}/portal/${token}` : "";

  const copy = async (text: string, kind: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(text);
      if (kind === "code") {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
      toast.success("Copiado!");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Acesso ao Portal — {clienteNome}</DialogTitle>
        </DialogHeader>

        {loading || !codigo ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Gerando código…
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Código de acesso (válido por 90 dias)</p>
              <div
                className="rounded-md text-center"
                style={{
                  fontSize: 36,
                  letterSpacing: 10,
                  fontWeight: 600,
                  padding: "20px 12px",
                  backgroundColor: "#F5F7FA",
                  border: "1px solid #E8ECF2",
                  color: "#0D1117",
                }}
              >
                {codigo}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={() => copy(codigo!, "code")}
              >
                {copiedCode ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {copiedCode ? "Código copiado" : "Copiar código"}
              </Button>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">Link direto</p>
              <div
                className="rounded-md text-xs break-all"
                style={{
                  padding: "10px 12px",
                  backgroundColor: "#F5F7FA",
                  border: "1px solid #E8ECF2",
                  color: "#6B7A90",
                }}
              >
                {link}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={() => copy(link, "link")}
              >
                {copiedLink ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {copiedLink ? "Link copiado" : "Copiar link"}
              </Button>
            </div>

            {!contratoId && (
              <p className="text-xs text-amber-600">
                Cliente sem contrato vinculado. O portal mostrará apenas dados gerais.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
