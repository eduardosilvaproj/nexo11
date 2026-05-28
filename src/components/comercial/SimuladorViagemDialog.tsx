import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  origemPadrao?: string;
}

const brl = (n: number) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function SimuladorViagemDialog({ open, onOpenChange, origemPadrao }: Props) {
  const [origem, setOrigem] = useState(origemPadrao ?? "");
  const [destino, setDestino] = useState("");
  const [valor, setValor] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function calcular() {
    if (!origem || !destino || !valor) {
      toast({ title: "Preencha origem, destino e valor", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("calcular-viagem", {
        body: { origem, destino, valor_venda: Number(valor) },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult(data);
    } catch (e: any) {
      toast({ title: "Erro ao calcular", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Simulador de custo de viagem
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Origem (CEP ou endereço da loja)</Label>
            <Input value={origem} onChange={(e) => setOrigem(e.target.value)} placeholder="Ex: 01310-100" />
          </div>
          <div>
            <Label>Destino (CEP)</Label>
            <Input value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Ex: 13560-000" />
          </div>
          <div>
            <Label>Valor estimado da venda (R$)</Label>
            <Input
              type="number"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="50000"
            />
          </div>
        </div>

        <Button onClick={calcular} disabled={loading} className="w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Calcular
        </Button>

        {result && (
          <div className="space-y-3 mt-2 border-t pt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Custo total estimado</span>
              <span className="text-2xl font-bold">{brl(result.custo_total)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div>Distância: <b>{result.distancia_km} km</b></div>
              <div>Dias montagem: <b>{result.dias_montagem}</b></div>
              <div>Fins de semana extras: <b>{result.fins_de_semana_extras ?? 0}</b></div>
            </div>

            <div className="rounded-md border overflow-hidden text-sm">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2">Pessoa</th>
                    <th className="text-right p-2">Gasolina</th>
                    <th className="text-right p-2">Pedágio</th>
                    <th className="text-right p-2">Hotel</th>
                    <th className="text-right p-2">Refeição</th>
                    <th className="text-right p-2">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(["montadores", "medidor", "gerente"] as const).map((k) => {
                    const d = result.detalhamento?.[k];
                    if (!d) return null;
                    return (
                      <tr key={k} className="border-t">
                        <td className="p-2 capitalize">{k}</td>
                        <td className="text-right p-2">{brl(d.gasolina)}</td>
                        <td className="text-right p-2">{brl(d.pedagio)}</td>
                        <td className="text-right p-2">{d.hotel != null ? brl(d.hotel) : "—"}</td>
                        <td className="text-right p-2">{brl(d.refeicao)}</td>
                        <td className="text-right p-2 font-medium">{brl(d.subtotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Simulação informativa — não salva no contrato.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
