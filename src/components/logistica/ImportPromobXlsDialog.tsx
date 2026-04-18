import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { FileSpreadsheet, CheckCircle2, AlertCircle, X, ArrowRight, Upload } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lojaId: string | null;
}

interface ParsedRow {
  numeroPedido: string;
  oc: string;
  dataPrevista: string;
  transportadora: string;
  matched?: boolean;
  contratoId?: string;
}

const MAX_SIZE = 10 * 1024 * 1024;

const normalize = (s: string) =>
  (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

function findCol(headers: string[], candidates: string[]): number {
  const norm = headers.map((h) => normalize(h));
  for (const c of candidates) {
    const cn = normalize(c);
    const idx = norm.findIndex((h) => h.includes(cn));
    if (idx >= 0) return idx;
  }
  return -1;
}

function excelDateToBR(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "number") {
    const d = XLSX.SSF.parse_date_code(value);
    if (!d) return "";
    return `${String(d.d).padStart(2, "0")}/${String(d.m).padStart(2, "0")}/${d.y}`;
  }
  const s = String(value).trim();
  const br = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (br) {
    const y = br[3].length === 2 ? `20${br[3]}` : br[3];
    return `${br[1].padStart(2, "0")}/${br[2].padStart(2, "0")}/${y}`;
  }
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[3].padStart(2, "0")}/${iso[2].padStart(2, "0")}/${iso[1]}`;
  return s;
}

export function ImportPromobXlsDialog({ open, onOpenChange, lojaId }: Props) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<{ atualizados: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setRows([]);
    setResult(null);
    setDragOver(false);
  };

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  const handleFile = async (f: File) => {
    if (f.size > MAX_SIZE) {
      toast.error("Arquivo maior que 10MB");
      return;
    }
    if (!/\.(xlsx?|XLSX?)$/.test(f.name)) {
      toast.error("Formato inválido. Use .xls ou .xlsx");
      return;
    }
    setFile(f);
    setParsing(true);
    setResult(null);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
      if (!json.length) throw new Error("Planilha vazia");

      let headerIdx = 0;
      for (let i = 0; i < Math.min(10, json.length); i++) {
        const row = (json[i] as unknown[]).map((c) => normalize(String(c)));
        if (row.some((c) => c.includes("pedido")) || row.some((c) => c === "oc")) {
          headerIdx = i;
          break;
        }
      }
      const headers = (json[headerIdx] as unknown[]).map((c) => String(c));
      const iPedido = findCol(headers, ["pedido", "numero pedido", "nº pedido"]);
      const iOC = findCol(headers, ["oc", "ordem compra", "cliente", "razao"]);
      const iData = findCol(headers, ["previsao", "previsão", "data prevista", "entrega"]);
      const iTransp = findCol(headers, ["transportadora", "transporte"]);

      if (iOC < 0 || iData < 0) {
        throw new Error("Não encontrei colunas de OC/Cliente e Previsão");
      }

      const parsed: ParsedRow[] = [];
      for (let i = headerIdx + 1; i < json.length; i++) {
        const r = json[i] as unknown[];
        const oc = String(r[iOC] ?? "").trim();
        const dataPrev = excelDateToBR(r[iData]);
        if (!oc || !dataPrev) continue;
        parsed.push({
          numeroPedido: iPedido >= 0 ? String(r[iPedido] ?? "").trim() : "",
          oc,
          dataPrevista: dataPrev,
          transportadora: iTransp >= 0 ? String(r[iTransp] ?? "").trim() : "",
        });
      }

      // Match against contratos
      if (lojaId && parsed.length) {
        const { data: contratos } = await supabase
          .from("contratos")
          .select("id, cliente_nome")
          .eq("loja_id", lojaId)
          .not("status", "in", '("finalizado")');

        for (const p of parsed) {
          const ocN = normalize(p.oc);
          const c = contratos?.find((c) => {
            const n = normalize(c.cliente_nome);
            return n === ocN || (ocN.length >= 4 && n.includes(ocN)) || (n.length >= 4 && ocN.includes(n));
          });
          if (c) {
            p.matched = true;
            p.contratoId = c.id;
          }
        }
      }

      setRows(parsed);
      if (!parsed.length) toast.warning("Nenhuma linha válida encontrada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao ler XLS");
      setRows([]);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!lojaId || !rows.length) return;
    setImporting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;
      const autorNome = userData.user?.user_metadata?.nome || userData.user?.email || null;

      let atualizados = 0;
      for (const p of rows) {
        if (!p.matched || !p.contratoId) continue;
        const [d, m, a] = p.dataPrevista.split("/");
        if (!d || !m || !a) continue;
        const iso = `${a}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;

        const { data: ex } = await supabase
          .from("entregas")
          .select("id")
          .eq("contrato_id", p.contratoId)
          .maybeSingle();

        if (ex) {
          const { error: upErr } = await supabase
            .from("entregas")
            .update({ data_prevista: iso, transportadora: p.transportadora || null })
            .eq("contrato_id", p.contratoId);
          if (upErr) { console.error(upErr); continue; }
        } else {
          const { error: insErr } = await supabase.from("entregas").insert({
            contrato_id: p.contratoId,
            data_prevista: iso,
            transportadora: p.transportadora || null,
          });
          if (insErr) { console.error(insErr); continue; }
        }

        await supabase.from("contrato_logs").insert({
          contrato_id: p.contratoId,
          acao: "promob_sincronizado",
          titulo: "Importação Promob XLS",
          descricao: `Pedido #${p.numeroPedido || "—"} · Previsão: ${p.dataPrevista} · ${p.transportadora || "—"}`,
          autor_id: uid,
          autor_nome: autorNome,
        });
        atualizados++;
      }

      setResult({ atualizados });
      qc.invalidateQueries({ queryKey: ["logistica-list"] });
      qc.invalidateQueries({ queryKey: ["logistica-promob-logs"] });
      toast.success(`${atualizados} contratos atualizados com datas do Promob`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro na importação");
    } finally {
      setImporting(false);
    }
  };

  const matchedCount = rows.filter((r) => r.matched).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 520 }} className="gap-3">
        <DialogHeader className="space-y-1">
          <DialogTitle style={{ fontSize: 16, color: "#0D1117" }}>
            Importar previsões do Promob
          </DialogTitle>
          <DialogDescription style={{ fontSize: 13, color: "#6B7A90" }}>
            Exporte o XLS no portal e importe aqui para atualizar as datas
          </DialogDescription>
        </DialogHeader>

        {/* Instruções */}
        <div
          className="rounded-lg p-3 space-y-1"
          style={{ backgroundColor: "#F5F7FA", fontSize: 12, color: "#48556B" }}
        >
          <div>1. Acesse consultasweb.promob.com</div>
          <div>2. Filtre os pedidos e clique no botão XLS</div>
          <div>3. Faça upload do arquivo abaixo</div>
        </div>

        {/* Zona de upload */}
        {!file && (
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl py-10 transition-colors"
            style={{
              border: `1px dashed ${dragOver ? "#1E6FBF" : "#B0BAC9"}`,
              backgroundColor: dragOver ? "#F0F7FF" : "transparent",
            }}
          >
            <Upload className="h-7 w-7" style={{ color: "#1E6FBF" }} />
            <span style={{ fontSize: 13, color: "#0D1117", fontWeight: 500 }}>
              Arraste o arquivo ou clique para selecionar
            </span>
            <span style={{ fontSize: 11, color: "#6B7A90" }}>.xls, .xlsx · máx 10MB</span>
            <input
              ref={inputRef}
              type="file"
              accept=".xls,.xlsx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>
        )}

        {/* Arquivo selecionado */}
        {file && (
          <div className="space-y-3">
            <div
              className="flex items-center justify-between rounded-lg p-2.5"
              style={{ backgroundColor: "#F7F9FC", border: "0.5px solid #E8ECF2" }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileSpreadsheet className="h-4 w-4 flex-shrink-0" style={{ color: "#1E6FBF" }} />
                <span className="truncate" style={{ fontSize: 12 }}>{file.name}</span>
              </div>
              <button
                onClick={reset}
                className="p-1 rounded hover:bg-muted"
                aria-label="Remover"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {parsing && (
              <p className="text-center text-sm text-muted-foreground py-4">Lendo planilha...</p>
            )}

            {!parsing && rows.length > 0 && !result && (
              <div className="space-y-2">
                <div className="flex items-center justify-between" style={{ fontSize: 12 }}>
                  <span style={{ color: "#48556B" }}>
                    {rows.length} linhas · <strong style={{ color: "#05873C" }}>{matchedCount} cruzaram</strong> com contratos
                  </span>
                </div>
                <div
                  className="overflow-hidden rounded-lg"
                  style={{ border: "0.5px solid #E8ECF2" }}
                >
                  <table className="w-full" style={{ fontSize: 11 }}>
                    <thead style={{ backgroundColor: "#F7F9FC" }}>
                      <tr style={{ color: "#6B7A90" }}>
                        <th className="px-2 py-1.5 text-left w-6"></th>
                        <th className="px-2 py-1.5 text-left">Pedido</th>
                        <th className="px-2 py-1.5 text-left">OC</th>
                        <th className="px-2 py-1.5 text-left">Previsão</th>
                        <th className="px-2 py-1.5 text-left">Transp.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 5).map((r, i) => (
                        <tr key={i} style={{ borderTop: "0.5px solid #E8ECF2" }}>
                          <td className="px-2 py-1.5">
                            {r.matched ? (
                              <span style={{ color: "#05873C", fontWeight: 600 }}>✓</span>
                            ) : (
                              <span style={{ color: "#B0BAC9" }}>✗</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5">{r.numeroPedido || "—"}</td>
                          <td className="px-2 py-1.5 truncate max-w-[120px]">{r.oc}</td>
                          <td className="px-2 py-1.5">{r.dataPrevista}</td>
                          <td className="px-2 py-1.5 truncate max-w-[80px]">{r.transportadora || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {rows.length > 5 && (
                  <p style={{ fontSize: 11, color: "#6B7A90" }}>
                    Mostrando 5 de {rows.length} linhas
                  </p>
                )}
              </div>
            )}

            {!parsing && rows.length === 0 && !result && (
              <div className="flex items-center gap-2 rounded-lg p-3" style={{ backgroundColor: "#FEF3F2" }}>
                <AlertCircle className="h-4 w-4" style={{ color: "#D92D20" }} />
                <span className="text-sm" style={{ color: "#D92D20" }}>
                  Nenhuma linha válida encontrada
                </span>
              </div>
            )}

            {result && (
              <div
                className="flex items-center gap-2 rounded-lg p-3"
                style={{ backgroundColor: "#D1FAE5" }}
              >
                <CheckCircle2 className="h-4 w-4" style={{ color: "#05873C" }} />
                <span className="text-sm" style={{ color: "#05873C" }}>
                  {result.atualizados} contratos atualizados com datas do Promob
                </span>
              </div>
            )}
          </div>
        )}

        {/* Botões */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {result ? "Fechar" : "Cancelar"}
          </Button>
          {!result && (
            <Button
              onClick={handleImport}
              disabled={!file || !rows.length || importing || parsing || !lojaId || matchedCount === 0}
              style={{ backgroundColor: "#1E6FBF", color: "#fff" }}
            >
              {importing ? "Importando..." : "Importar"}
              {!importing && <ArrowRight className="h-4 w-4 ml-1" />}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
