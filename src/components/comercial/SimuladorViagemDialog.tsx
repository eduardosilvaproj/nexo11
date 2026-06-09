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
  const [camposVazios, setCamposVazios] = useState<Set<string>>(new Set());
  const reportRef = useRef<HTMLDivElement>(null);

  function onMontadoresChange(v: string) {
    setQtdMontadores(v);
    const n = Number(v);
    setQtdVeiculos(String(Math.max(1, Math.ceil(n / 2))));
  }

  async function calcular(silent = false) {
    const camposFaltando: string[] = [];
    if (!origem?.trim()) camposFaltando.push("Origem");
    if (!destino?.trim()) camposFaltando.push("Destino");
    if (!valor || Number(valor) <= 0) camposFaltando.push("Valor da venda");

    if (camposFaltando.length > 0) {
      setCamposVazios(new Set(camposFaltando));
      if (!silent) {
        toast({
          title: "Preencha os campos obrigatórios",
          description: camposFaltando.join(" • "),
          variant: "destructive",
        });
      }
      return;
    }
    setCamposVazios(new Set());
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
      if (!silent) {
        const mensagem = humanizeErroViagem(e?.message ?? String(e));
        toast({
          title: mensagem.titulo,
          description: mensagem.descricao,
          variant: "destructive",
          duration: 8000,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  // Traduz erros do edge function em mensagens amigáveis com dicas úteis
  function humanizeErroViagem(msg: string): { titulo: string; descricao: string } {
    const lower = msg.toLowerCase();

    // Erros de CEP não encontrado
    if (lower.includes("não foi possível localizar") || lower.includes("nao foi possivel localizar")) {
      const cepMatch = msg.match(/"([^"]+)"/);
      const cep = cepMatch?.[1] || "";
      return {
        titulo: "Endereço não encontrado",
        descricao: `Não localizamos "${cep}".\n\nFormatos aceitos:\n• CEP com 8 dígitos: 01310-100\n• CEP sem hífen: 01310100\n• Cidade + UF: "Ribeirão Preto, SP"\n• Endereço completo: "Av. Paulista, 1000, São Paulo, SP"`,
      };
    }

    // CEP inválido (formato errado)
    if (lower.includes("cep inválido") || lower.includes("cep invalido")) {
      return {
        titulo: "CEP inválido",
        descricao: "O CEP deve ter 8 dígitos (com ou sem hífen).\nExemplos: 01310-100 ou 01310100",
      };
    }

    // Erro do Google (mas passou pelo Nominatim também)
    if (lower.includes("request_denied") || lower.includes("api key")) {
      return {
        titulo: "Serviço de mapas indisponível",
        descricao: "Não conseguimos calcular a rota. Tente novamente em alguns minutos ou informe a cidade e UF manualmente (ex: 'Catanduva, SP').",
      };
    }

    // Timeout
    if (lower.includes("timeout") || lower.includes("timed out")) {
      return {
        titulo: "A consulta demorou demais",
        descricao: "O serviço de mapas demorou para responder. Tente novamente ou simplifique o endereço (ex: 'São Paulo, SP').",
      };
    }

    // Sem rota encontrada (coordenadas existem mas não há rota)
    if (lower.includes("nenhuma rota") || lower.includes("zero results")) {
      return {
        titulo: "Não encontramos rota",
        descricao: "Os endereços foram localizados, mas não há rota de carro entre eles. Verifique se estão no mesmo continente.",
      };
    }

    // 401/403 - auth
    if (lower.includes("unauthorized") || lower.includes("401")) {
      return {
        titulo: "Sessão expirada",
        descricao: "Faça login novamente para continuar.",
      };
    }

    // 500 genérico
    if (lower.includes("500") || lower.includes("internal")) {
      return {
        titulo: "Erro interno do servidor",
        descricao: "Tente novamente em alguns instantes. Se persistir, contate o suporte.",
      };
    }

    // Fallback
    return {
      titulo: "Não foi possível calcular a viagem",
      descricao: msg,
    };
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
            <Input
              value={origem}
              onChange={(e) => {
                setOrigem(e.target.value);
                if (camposVazios.has("Origem")) {
                  const next = new Set(camposVazios);
                  next.delete("Origem");
                  setCamposVazios(next);
                }
              }}
              placeholder="Ex: 01310-100 ou 'Ribeirão Preto, SP'"
              className={camposVazios.has("Origem") ? "border-red-500 ring-1 ring-red-500/30" : ""}
            />
          </div>
          <div>
            <Label>Destino (CEP ou cidade/UF)</Label>
            <Input
              value={destino}
              onChange={(e) => {
                setDestino(e.target.value);
                if (camposVazios.has("Destino")) {
                  const next = new Set(camposVazios);
                  next.delete("Destino");
                  setCamposVazios(next);
                }
              }}
              placeholder="Ex: 15800-970 ou 'Catanduva, SP'"
              className={camposVazios.has("Destino") ? "border-red-500 ring-1 ring-red-500/30" : ""}
            />
          </div>
          <div>
            <Label>Valor da venda (R$)</Label>
            <Input
              type="number"
              value={valor}
              onChange={(e) => {
                setValor(e.target.value);
                if (camposVazios.has("Valor da venda")) {
                  const next = new Set(camposVazios);
                  next.delete("Valor da venda");
                  setCamposVazios(next);
                }
              }}
              placeholder="50000"
              className={camposVazios.has("Valor da venda") ? "border-red-500 ring-1 ring-red-500/30" : ""}
            />
          </div>
          <div>
            <Label>Qtd. montadores</Label>
            <Select value={qtdMontadores} onValueChange={onMontadoresChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} montador{n > 1 ? "es" : ""}</SelectItem>
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

        {Number(qtdMontadores) < 2 && (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5" />
            <span>Recomendado mínimo 2 montadores para entregas fora da cidade.</span>
          </div>
        )}

        <Button onClick={() => calcular(false)} disabled={loading} className="w-full">
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
