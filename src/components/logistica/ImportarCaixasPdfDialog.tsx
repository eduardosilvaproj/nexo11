import { useState, useEffect, useRef } from "react";
import { FileText, CheckCircle2, AlertCircle, X, ArrowRight, Upload, Package } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lojaId: string | null;
}

interface CaixaParsed {
  numeroPedido: string;
  oc: string;
  volume: number;
  codigoBarras: string;
  producaoTerceirizadaId: string | null;
  matched: boolean; // true se achou producao_terceirizada correspondente
}

interface PedidoGroup {
  numeroPedido: string;
  oc: string;
  totalCaixas: number;
}

const MAX_SIZE = 10 * 1024 * 1024;

// =========================================================
// Parser do relatorio EER002 (Promob/Casimiro)
// Layout esperado (extraido via pdfjs getTextContent):
//   Pedido: 141357
//   Cliente: 682 - DIAS MOVEIS PLANEJADOS SAO CARLOS LTDA
//   OC: LUCASASTECACOZ
//   Caixa Master: 1
//   *1413570001*  (codigo de barras com asteriscos)
//   Caixa Master: 2
//   *1413570002*
// O parser caminha o texto linearmente, mantendo o contexto
// (numero_pedido + oc) atual e associando cada "Caixa Master: N"
// ao proximo codigo de barras "*XXXX*" encontrado.
// =========================================================
function parseEER002(text: string): { caixas: CaixaParsed[]; grupos: PedidoGroup[] } {
  const caixas: CaixaParsed[] = [];
  const gruposMap = new Map<string, PedidoGroup>();

  let curPedido = "";
  let curOC = "";
  let curVolume: number | null = null;

  const linhas = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);

  for (const linha of linhas) {
    // Detecta novo pedido
    const mPedido = linha.match(/^Pedido:\s*(\d+)/i);
    if (mPedido) {
      curPedido = mPedido[1];
      curOC = "";
      curVolume = null;
      continue;
    }

    // Detecta OC (dentro do bloco de um pedido)
    const mOC = linha.match(/^OC:\s*(\S+)/i);
    if (mOC && curPedido) {
      curOC = mOC[1];
      continue;
    }

    // Detecta "Caixa Master: N"
    const mCaixa = linha.match(/^Caixa Master:\s*(\d+)/i);
    if (mCaixa) {
      curVolume = parseInt(mCaixa[1], 10);
      continue;
    }

    // Detecta codigo de barras entre asteriscos (ex: *1413570001*)
    const mCB = linha.match(/^\*(\d{10,14})\*$/);
    if (mCB && curVolume !== null && curPedido) {
      const codigoBarras = mCB[1];
      caixas.push({
        numeroPedido: curPedido,
        oc: curOC,
        volume: curVolume,
        codigoBarras,
        producaoTerceirizadaId: null,
        matched: false,
      });
      if (!gruposMap.has(curPedido)) {
        gruposMap.set(curPedido, { numeroPedido: curPedido, oc: curOC, totalCaixas: 0 });
      }
      gruposMap.get(curPedido)!.totalCaixas += 1;
      curVolume = null; // reseta para nao associar o mesmo codigo a 2 caixas
    }
  }

  return {
    caixas,
    grupos: Array.from(gruposMap.values()).sort((a, b) => a.numeroPedido.localeCompare(b.numeroPedido)),
  };
}

export function ImportarCaixasPdfDialog({ open, onOpenChange, lojaId }: Props) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [caixas, setCaixas] = useState<CaixaParsed[]>([]);
  const [grupos, setGrupos] = useState<PedidoGroup[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<{ inseridas: number; atualizadas: number; erros: string[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setCaixas([]);
    setGrupos([]);
    setResult(null);
    setDragOver(false);
  };

  useEffect(() => { if (!open) reset(); }, [open]);

  const handleFile = async (f: File) => {
    if (f.size > MAX_SIZE) return toast.error("Arquivo maior que 10MB");
    if (!/\.pdf$/i.test(f.name)) return toast.error("Use arquivo .pdf");
    setFile(f);
    setParsing(true);
    setResult(null);
    setCaixas([]);
    setGrupos([]);
    try {
      const buf = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      let fullText = "";
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();
        // Extrai strings mantendo quebras de linha
        fullText += content.items
          .map((it: unknown) => (it as { str?: string }).str ?? "")
          .join(" ") + "\n";
      }
      const parsed = parseEER002(fullText);
      if (!parsed.caixas.length) {
        toast.warning("Nenhuma caixa encontrada. Verifique se o PDF e o relatorio EER002 do Promob/Casimiro.");
        setCaixas([]); setGrupos([]);
        return;
      }

      // Tenta fazer match com producao_terceirizada existente
      if (lojaId) {
        const pedidos = Array.from(new Set(parsed.caixas.map((c) => c.numeroPedido)));
        const { data: prodRows } = await supabase
          .from("producao_terceirizada")
          .select("id, numero_pedido, oc")
          .eq("loja_id", lojaId)
          .in("numero_pedido", pedidos);
        const mapId = new Map<string, string>();
        for (const r of prodRows ?? []) {
          mapId.set(`${r.numero_pedido}|${(r.oc ?? "").toUpperCase()}`, r.id);
        }
        for (const c of parsed.caixas) {
          const key = `${c.numeroPedido}|${(c.oc ?? "").toUpperCase()}`;
          const id = mapId.get(key);
          if (id) {
            c.producaoTerceirizadaId = id;
            c.matched = true;
          }
        }
      }

      setCaixas(parsed.caixas);
      setGrupos(parsed.grupos);
      toast.success(`${parsed.caixas.length} caixas extraidas de ${parsed.grupos.length} pedidos`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao ler PDF");
      setCaixas([]); setGrupos([]);
    } finally { setParsing(false); }
  };

  const handleImport = async () => {
    if (!lojaId) { toast.error("Contexto de loja nao definido"); return; }
    if (!caixas.length) { toast.error("Nenhuma caixa para importar"); return; }
    setImporting(true);
    let inseridas = 0, atualizadas = 0;
    const erros: string[] = [];

    // Separa por producaoTerceirizadaId para upsert em batches
    const buckets = new Map<string, CaixaParsed[]>();
    for (const c of caixas) {
      const key = c.producaoTerceirizadaId ?? "__orfas__";
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(c);
    }

    for (const [key, lista] of buckets) {
      const producaoId = key === "__orfas__" ? null : key;
      const payload = lista.map((c) => ({
        loja_id: lojaId,
        producao_terceirizada_id: producaoId,
        numero_pedido: c.numeroPedido,
        oc: c.oc || null,
        volume: c.volume,
        codigo_barras: c.codigoBarras,
        status: "pendente" as const,
      }));

      // Tenta upsert em 1 round-trip
      const { error } = await supabase
        .from("caixas_previstas")
        .upsert(payload, { onConflict: "loja_id,codigo_barras" });

      if (error) {
        // Se for conflito unico via (loja, codigo_barras) -> conta como atualizada
        // Caso contrario, adiciona mensagem de erro
        erros.push(error.message);
        console.error("[ImportarCaixasPdf] upsert error:", error);
      } else {
        // Nao distinguimos novos vs atualizados no upsert, mas podemos consultar
        inseridas += payload.length;
      }
    }

    setResult({ inseridas, atualizadas, erros });
    qc.invalidateQueries({ queryKey: ["caixas_previstas"] });
    qc.invalidateQueries({ queryKey: ["producao-terceirizada"] });
    if (erros.length === 0) {
      toast.success(`${caixas.length} caixas salvas no sistema`);
    } else {
      toast.warning(`${caixas.length - erros.length} salvas, ${erros.length} com erro. Veja detalhes.`);
    }
    setImporting(false);
  };

  const totalCaixas = caixas.length;
  const matchedCount = caixas.filter((c) => c.matched).length;
  const orfasCount = totalCaixas - matchedCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 600 }} className="gap-3">
        <DialogHeader>
          <DialogTitle>Importar PDF de Caixas (Promob/Casimiro)</DialogTitle>
          <DialogDescription>
            Importe o relatorio EER002 (PDF) com os codigos de barras das caixas previstas.
            O sistema extrai cada caixa e vincula ao pedido correspondente.
          </DialogDescription>
        </DialogHeader>

        {!file && (
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl py-10"
            style={{ border: `1px dashed ${dragOver ? "#1E6FBF" : "#B0BAC9"}`, backgroundColor: dragOver ? "#F0F7FF" : "transparent" }}
          >
            <Upload className="h-7 w-7" style={{ color: "#1E6FBF" }} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>Arraste o arquivo ou clique</span>
            <span style={{ fontSize: 11, color: "#6B7A90" }}>.pdf - relatorio EER002 - max 10MB</span>
            <input ref={inputRef} type="file" accept=".pdf,application/pdf" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>
        )}

        {file && (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg p-2.5" style={{ backgroundColor: "#F7F9FC", border: "0.5px solid #E8ECF2" }}>
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4" style={{ color: "#1E6FBF" }} />
                <span className="truncate" style={{ fontSize: 12 }}>{file.name}</span>
              </div>
              <button onClick={reset} className="p-1 rounded hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
            </div>

            {parsing && <p className="text-center text-sm text-muted-foreground py-4">Lendo PDF...</p>}

            {!parsing && totalCaixas > 0 && !result && (
              <div className="space-y-2">
                <div style={{ fontSize: 12, color: "#48556B" }}>
                  <strong>{totalCaixas} caixas</strong> em <strong>{grupos.length} pedidos</strong> · {" "}
                  <strong style={{ color: "#05873C" }}>{matchedCount} vinculadas a pedidos</strong>
                  {orfasCount > 0 && (
                    <span style={{ color: "#E8A020" }}> · {orfasCount} orfas (pedido nao importado)</span>
                  )}
                </div>

                <div className="space-y-1.5 max-h-72 overflow-y-auto rounded-lg" style={{ border: "0.5px solid #E8ECF2" }}>
                  {grupos.map((g) => {
                    const caixasGrupo = caixas.filter((c) => c.numeroPedido === g.numeroPedido);
                    const matchedGrupo = caixasGrupo.filter((c) => c.matched).length;
                    return (
                      <div key={g.numeroPedido} className="p-2.5" style={{ borderTop: "0.5px solid #E8ECF2" }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Package className="h-3.5 w-3.5" style={{ color: "#1E6FBF" }} />
                            <span style={{ fontSize: 12, fontWeight: 600 }}>Pedido #{g.numeroPedido}</span>
                            <span style={{ fontSize: 11, color: "#6B7A90" }}>· OC: {g.oc || "-"}</span>
                          </div>
                          <span style={{ fontSize: 11, color: matchedGrupo > 0 ? "#05873C" : "#E8A020" }}>
                            {caixasGrupo.length} caixa{caixasGrupo.length !== 1 ? "s" : ""} {matchedGrupo > 0 ? `(${matchedGrupo} OK)` : "(orfas)"}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {caixasGrupo.slice(0, 20).map((c) => (
                            <span
                              key={c.codigoBarras}
                              style={{
                                fontSize: 10,
                                fontFamily: "monospace",
                                padding: "1px 5px",
                                borderRadius: 3,
                                backgroundColor: c.matched ? "#D1FAE5" : "#FEF3C7",
                                color: c.matched ? "#05873C" : "#B45309",
                              }}
                            >
                              v{c.volume}: {c.codigoBarras}
                            </span>
                          ))}
                          {caixasGrupo.length > 20 && (
                            <span style={{ fontSize: 10, color: "#6B7A90" }}>+{caixasGrupo.length - 20} mais</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!parsing && totalCaixas === 0 && (
              <div className="flex items-center gap-2 rounded-lg p-3" style={{ backgroundColor: "#FEF3F2" }}>
                <AlertCircle className="h-4 w-4" style={{ color: "#D92D20" }} />
                <span className="text-sm" style={{ color: "#D92D20" }}>
                  Nenhuma caixa encontrada. Verifique se o PDF e o relatorio EER002.
                </span>
              </div>
            )}

            {result && (
              <div className="rounded-lg p-3 space-y-1" style={{ backgroundColor: result.erros.length ? "#FEF3F2" : "#D1FAE5" }}>
                <div className="flex items-center gap-2">
                  {result.erros.length
                    ? <AlertCircle className="h-4 w-4" style={{ color: "#D92D20" }} />
                    : <CheckCircle2 className="h-4 w-4" style={{ color: "#05873C" }} />}
                  <span className="text-sm font-medium" style={{ color: result.erros.length ? "#D92D20" : "#05873C" }}>
                    {result.inseridas + result.atualizadas} caixas salvas · {result.erros.length} erros
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {result ? "Fechar" : "Cancelar"}
          </Button>
          {!result && (
            <Button
              onClick={handleImport}
              disabled={!file || !totalCaixas || importing || parsing || !lojaId}
              style={{ backgroundColor: "#1E6FBF", color: "#fff" }}
            >
              {importing ? "Salvando..." : "Importar"}
              {!importing && <ArrowRight className="h-4 w-4 ml-1" />}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
