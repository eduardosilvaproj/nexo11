import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MapPin, Printer, FileDown, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { RelatorioViagem } from "./RelatorioViagem";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  origemPadrao?: string;
}

export function SimuladorViagemDialog({ open, onOpenChange, origemPadrao }: Props) {
  const [origem, setOrigem] = useState(origemPadrao ?? "");
  const [destino, setDestino] = useState("");
  const [valor, setValor] = useState("");
  const [qtdMontadores, setQtdMontadores] = useState("2");
  const [qtdVeiculos, setQtdVeiculos] = useState("1");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  function onMontadoresChange(v: string) {
    setQtdMontadores(v);
    const n = Number(v);
    setQtdVeiculos(String(Math.max(1, Math.ceil(n / 2))));
  }

  async function calcular(silent = false) {
    if (!origem || !destino || !valor) {
      if (!silent) toast({ title: "Preencha origem, destino e valor", variant: "destructive" });
      return;
    }
    setLoading(true);
    if (!silent) setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("calcular-viagem", {
        body: {
          origem,
          destino,
          valor_venda: Number(valor),
          qtd_montadores: Number(qtdMontadores),
          qtd_veiculos: Number(qtdVeiculos),
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult(data);
    } catch (e: any) {
      if (!silent) toast({ title: "Erro ao calcular", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  // Recalcula automaticamente quando muda montadores/veículos (após primeiro cálculo)
  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => calcular(true), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qtdMontadores, qtdVeiculos]);

  function imprimir() {
    const html = reportRef.current?.outerHTML;
    if (!html) return;
    const w = window.open("", "_blank", "width=900,height=1200");
    if (!w) return;
    w.document.write(`
      <html><head><title>Simulação de Viagem - NEXO</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        body{font-family:-apple-system,system-ui,sans-serif;padding:32px;color:#0f172a}
        .header{border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center}
        .logo{font-size:22px;font-weight:800;letter-spacing:-0.02em}
        .date{font-size:12px;color:#64748b}
        .footer{margin-top:32px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;text-align:center}
        @media print { .no-print{display:none} }
      </style>
      </head><body>
        <div class="header">
          <div class="logo">NEXO</div>
          <div class="date">Simulação · ${new Date().toLocaleString("pt-BR")}</div>
        </div>
        ${html}
        <div class="footer">Simulação informativa — valores podem variar conforme condições reais da operação.</div>
      </body></html>
    `);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
            <Label>Valor da venda (R$)</Label>
            <Input type="number" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="50000" />
          </div>
          <div>
            <Label>Qtd. montadores</Label>
            <Select value={qtdMontadores} onValueChange={onMontadoresChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2, 3, 4, 5, 6].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} montadores</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Qtd. veículos</Label>
            <Input
              type="number"
              min={1}
              max={6}
              value={qtdVeiculos}
              onChange={(e) => setQtdVeiculos(e.target.value)}
            />
          </div>
        </div>

        <Button onClick={calcular} disabled={loading} className="w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Calcular
        </Button>

        {result && (
          <>
            <RelatorioViagem
              ref={reportRef}
              result={result}
              origem={origem}
              destino={destino}
              valorVenda={Number(valor)}
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={imprimir}>
                <Printer className="h-4 w-4 mr-2" /> Imprimir
              </Button>
              <Button variant="outline" className="flex-1" onClick={imprimir}>
                <FileDown className="h-4 w-4 mr-2" /> Exportar PDF
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
