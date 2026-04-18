import { useState } from "react";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
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
  dataPrevista: string; // dd/mm/yyyy
  transportadora: string;
}

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
  // dd/mm/yyyy or yyyy-mm-dd
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
  const [result, setResult] = useState<{ atualizados: number; total: number } | null>(null);

  const reset = () => {
    setFile(null);
    setRows([]);
    setResult(null);
  };

  const handleFile = async (f: File) => {
    setParsing(true);
    setResult(null);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
      if (!json.length) throw new Error("Planilha vazia");

      // Find header row (first row containing "pedido" or "OC")
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
        throw new Error("Não encontrei colunas de OC/Cliente e Data prevista no XLS");
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
      const { data: contratos } = await supabase
        .from("contratos")
        .select("id, cliente_nome")
        .eq("loja_id", lojaId)
        .not("status", "in", '("finalizado")');

      let atualizados = 0;
      for (const p of rows) {
        const ocN = normalize(p.oc);
        if (!ocN) continue;
        const contrato = contratos?.find((c) => {
          const n = normalize(c.cliente_nome);
          return n === ocN || (ocN.length >= 4 && n.includes(ocN)) || (n.length >= 4 && ocN.includes(n));
        });
        if (!contrato) continue;

        const [d, m, a] = p.dataPrevista.split("/");
        if (!d || !m || !a) continue;
        const iso = `${a}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;

        const { data: ex } = await supabase
          .from("entregas")
          .select("id")
          .eq("contrato_id", contrato.id)
          .maybeSingle();

        if (ex) {
          await supabase
            .from("entregas")
            .update({ data_prevista: iso, transportadora: p.transportadora || null })
            .eq("contrato_id", contrato.id);
        } else {
          await supabase.from("entregas").insert({
            contrato_id: contrato.id,
            data_prevista: iso,
            transportadora: p.transportadora || null,
          });
        }

        await supabase.from("contrato_logs").insert({
          contrato_id: contrato.id,
          acao: "promob_sincronizado",
          titulo: "Importação Promob XLS",
          descricao: `Pedido #${p.numeroPedido || "—"} · Previsão: ${p.dataPrevista} · ${p.transportadora || "—"}`,
        });
        atualizados++;
      }

      setResult({ atualizados, total: rows.length });
      qc.invalidateQueries({ queryKey: ["logistica-list"] });
      qc.invalidateQueries({ queryKey: ["logistica-promob-logs"] });
      toast.success(`${atualizados} contrato(s) atualizado(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro na importação");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Promob XLS</DialogTitle>
          <DialogDescription>
            Selecione o arquivo XLS exportado do portal Promob para preencher as datas previstas dos contratos.
          </DialogDescription>
        </DialogHeader>

        {!file && (
          <label
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl py-12"
            style={{ backgroundColor: "#F5F7FA", border: "1px dashed #B0BAC9" }}
          >
            <FileSpreadsheet className="h-8 w-8" style={{ color: "#1E6FBF" }} />
            <span style={{ fontSize: 13, color: "#0D1117", fontWeight: 500 }}>
              Clique para selecionar o arquivo XLS
            </span>
            <span style={{ fontSize: 12, color: "#6B7A90" }}>.xls ou .xlsx</span>
            <input
              type="file"
              accept=".xls,.xlsx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setFile(f);
                  handleFile(f);
                }
              }}
            />
          </label>
        )}

        {file && (
          <div>
            <div
              className="mb-3 flex items-center justify-between rounded-lg p-3"
              style={{ backgroundColor: "#F7F9FC", border: "0.5px solid #E8ECF2" }}
            >
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" style={{ color: "#1E6FBF" }} />
                <span style={{ fontSize: 13 }}>{file.name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={reset}>
                Trocar
              </Button>
            </div>

            {parsing && <p className="text-sm text-muted-foreground">Lendo planilha...</p>}

            {!parsing && rows.length > 0 && !result && (
              <>
                <p className="mb-2 text-sm" style={{ color: "#0D1117" }}>
                  <strong>{rows.length}</strong> linha(s) encontrada(s). Pré-visualização:
                </p>
                <div className="max-h-64 overflow-auto rounded-lg" style={{ border: "0.5px solid #E8ECF2" }}>
                  <table className="w-full text-xs">
                    <thead style={{ backgroundColor: "#F7F9FC" }}>
                      <tr>
                        <th className="px-2 py-2 text-left">Pedido</th>
                        <th className="px-2 py-2 text-left">OC / Cliente</th>
                        <th className="px-2 py-2 text-left">Previsão</th>
                        <th className="px-2 py-2 text-left">Transportadora</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 50).map((r, i) => (
                        <tr key={i} style={{ borderTop: "0.5px solid #E8ECF2" }}>
                          <td className="px-2 py-1.5">{r.numeroPedido || "—"}</td>
                          <td className="px-2 py-1.5">{r.oc}</td>
                          <td className="px-2 py-1.5">{r.dataPrevista}</td>
                          <td className="px-2 py-1.5">{r.transportadora || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {rows.length > 50 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Mostrando 50 de {rows.length} linhas
                  </p>
                )}
              </>
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
                  {result.atualizados} de {result.total} contrato(s) atualizado(s) com sucesso
                </span>
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              {!result && rows.length > 0 && (
                <Button
                  onClick={handleImport}
                  disabled={importing || !lojaId}
                  style={{ backgroundColor: "#1E6FBF", color: "#fff" }}
                >
                  {importing ? "Importando..." : `Importar ${rows.length} linha(s)`}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
