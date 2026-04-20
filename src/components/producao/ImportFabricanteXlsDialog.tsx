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
  fornecedorId: string | null;
}

interface ParsedRow {
  cliente: string;
  clienteBase: string; // nome antes do primeiro "-"
  numeroPedido: string;
  oc: string;
  dataPrevista: string;
  status: string;
  contratoId?: string | null;
  clienteMatch?: boolean;
  contratoMatch?: boolean;
}

interface GroupedPedido {
  clienteBase: string;
  clienteOriginal: string;
  ocs: string[]; // ambientes
  numeroPedido: string;
  dataPrevista: string; // menor data
  status: string;
  contratoId?: string | null;
  clienteMatch: boolean;
  contratoMatch: boolean;
}

const extractClienteBase = (raw: string): string => {
  const s = (raw || "").toString().trim();
  const idx = s.indexOf("-");
  return (idx > 0 ? s.slice(0, idx) : s).trim();
};

const MAX_SIZE = 10 * 1024 * 1024;

const normalize = (s: string) =>
  (s || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

function findCol(headers: string[], candidates: string[]): number {
  const norm = headers.map((h) => normalize(h));
  for (const c of candidates) {
    const cn = normalize(c);
    const idx = norm.findIndex((h) => h.includes(cn));
    if (idx >= 0) return idx;
  }
  return -1;
}

function excelDateToISO(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "number") {
    const d = XLSX.SSF.parse_date_code(value);
    if (!d) return "";
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(value).trim();
  const br = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (br) {
    const y = br[3].length === 2 ? `20${br[3]}` : br[3];
    return `${y}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  }
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  return "";
}

export function ImportFabricanteXlsDialog({ open, onOpenChange, lojaId, fornecedorId }: Props) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<{ vinculados: number; pendentes: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => { setFile(null); setRows([]); setResult(null); setDragOver(false); };
  useEffect(() => { if (!open) reset(); }, [open]);

  const handleFile = async (f: File) => {
    if (f.size > MAX_SIZE) return toast.error("Arquivo maior que 10MB");
    if (!/\.(xlsx?|XLSX?)$/.test(f.name)) return toast.error("Use .xls ou .xlsx");
    setFile(f); setParsing(true); setResult(null);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
      if (!json.length) throw new Error("Planilha vazia");

      let headerIdx = 0;
      for (let i = 0; i < Math.min(10, json.length); i++) {
        const row = (json[i] as unknown[]).map((c) => normalize(String(c)));
        if (row.some((c) => c.includes("pedido")) || row.some((c) => c === "oc") || row.some((c) => c.includes("cliente"))) {
          headerIdx = i; break;
        }
      }
      const headers = (json[headerIdx] as unknown[]).map((c) => String(c));
      const iCliente = findCol(headers, ["cliente", "razao", "nome"]);
      const iPedido = findCol(headers, ["pedido", "numero pedido", "nº pedido"]);
      const iOC = findCol(headers, ["oc", "ordem compra"]);
      const iData = findCol(headers, ["previsao", "previsão", "data prevista", "entrega"]);
      const iStatus = findCol(headers, ["status", "situacao", "situação"]);

      if (iCliente < 0 && iOC < 0) throw new Error("Não encontrei colunas de Cliente ou OC");

      const parsed: ParsedRow[] = [];
      for (let i = headerIdx + 1; i < json.length; i++) {
        const r = json[i] as unknown[];
        const cliente = iCliente >= 0 ? String(r[iCliente] ?? "").trim() : "";
        const oc = iOC >= 0 ? String(r[iOC] ?? "").trim() : "";
        const dataPrev = iData >= 0 ? excelDateToISO(r[iData]) : "";
        if (!cliente && !oc) continue;
        parsed.push({
          cliente,
          numeroPedido: iPedido >= 0 ? String(r[iPedido] ?? "").trim() : "",
          oc,
          dataPrevista: dataPrev,
          status: iStatus >= 0 ? String(r[iStatus] ?? "").trim() : "",
        });
      }

      // Cross-match against clientes (by name) and contratos (by OC + cliente)
      if (lojaId && parsed.length) {
        const [{ data: clientes }, { data: contratos }] = await Promise.all([
          supabase.from("clientes").select("id, nome").eq("loja_id", lojaId),
          supabase.from("contratos").select("id, cliente_nome, cliente_id").eq("loja_id", lojaId).neq("status", "finalizado"),
        ]);

        for (const p of parsed) {
          const cN = normalize(p.cliente);
          const cli = clientes?.find((c) => {
            const n = normalize(c.nome);
            return n === cN || (cN.length >= 4 && n.includes(cN)) || (n.length >= 4 && cN.includes(n));
          });
          p.clienteMatch = !!cli;

          const ct = contratos?.find((c) => {
            const n = normalize(c.cliente_nome);
            return n === cN || (cN.length >= 4 && n.includes(cN));
          });
          if (ct) { p.contratoId = ct.id; p.contratoMatch = true; }
        }
      }

      setRows(parsed);
      if (!parsed.length) toast.warning("Nenhuma linha válida");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao ler XLS");
      setRows([]);
    } finally { setParsing(false); }
  };

  const handleImport = async () => {
    if (!lojaId || !rows.length) return;
    setImporting(true);
    try {
      let vinculados = 0, pendentes = 0;
      const sb = supabase as unknown as {
        from: (t: string) => { insert: (v: unknown) => Promise<{ error: Error | null }> };
      };
      for (const p of rows) {
        const isVinculado = !!p.contratoId;
        const { error } = await sb.from("producao_terceirizada").insert({
          loja_id: lojaId,
          fornecedor_id: fornecedorId,
          contrato_id: p.contratoId ?? null,
          numero_pedido: p.numeroPedido || `s/n-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          oc: p.oc || p.cliente || null,
          data_prevista: p.dataPrevista || null,
          status: "aguardando_fabricacao",
          tipo_entrada: "xml",
          vinculo_status: isVinculado ? "vinculado" : "pendente",
        });
        if (error) { console.error(error); continue; }
        if (isVinculado) vinculados++; else pendentes++;
      }
      setResult({ vinculados, pendentes });
      qc.invalidateQueries({ queryKey: ["producao-terceirizada"] });
      toast.success(`${vinculados} vinculados · ${pendentes} aguardando vínculo manual`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro na importação");
    } finally { setImporting(false); }
  };

  const matchedCount = rows.filter((r) => r.contratoMatch).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 560 }} className="gap-3">
        <DialogHeader>
          <DialogTitle>Importar XML do Fabricante</DialogTitle>
          <DialogDescription>Importe um XLS exportado do portal do fabricante. Pedidos serão cruzados automaticamente por cliente/OC.</DialogDescription>
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
            <span style={{ fontSize: 11, color: "#6B7A90" }}>.xls, .xlsx · máx 10MB</span>
            <input ref={inputRef} type="file" accept=".xls,.xlsx" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>
        )}

        {file && (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg p-2.5" style={{ backgroundColor: "#F7F9FC", border: "0.5px solid #E8ECF2" }}>
              <div className="flex items-center gap-2 min-w-0">
                <FileSpreadsheet className="h-4 w-4" style={{ color: "#1E6FBF" }} />
                <span className="truncate" style={{ fontSize: 12 }}>{file.name}</span>
              </div>
              <button onClick={reset} className="p-1 rounded hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
            </div>

            {parsing && <p className="text-center text-sm text-muted-foreground py-4">Lendo planilha...</p>}

            {!parsing && rows.length > 0 && !result && (
              <div className="space-y-2">
                <div style={{ fontSize: 12, color: "#48556B" }}>
                  {rows.length} linhas · <strong style={{ color: "#05873C" }}>{matchedCount} cruzaram com contratos</strong> · {rows.length - matchedCount} ficarão pendentes
                </div>
                <div className="overflow-hidden rounded-lg" style={{ border: "0.5px solid #E8ECF2", maxHeight: 200, overflowY: "auto" }}>
                  <table className="w-full" style={{ fontSize: 11 }}>
                    <thead style={{ backgroundColor: "#F7F9FC" }}>
                      <tr style={{ color: "#6B7A90" }}>
                        <th className="px-2 py-1.5 text-left w-6"></th>
                        <th className="px-2 py-1.5 text-left">Cliente</th>
                        <th className="px-2 py-1.5 text-left">Pedido</th>
                        <th className="px-2 py-1.5 text-left">OC</th>
                        <th className="px-2 py-1.5 text-left">Previsão</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i} style={{ borderTop: "0.5px solid #E8ECF2" }}>
                          <td className="px-2 py-1.5">{r.contratoMatch ? <span style={{ color: "#05873C" }}>✓</span> : <span style={{ color: "#E8A020" }}>⚠</span>}</td>
                          <td className="px-2 py-1.5 truncate max-w-[140px]">{r.cliente || "—"}</td>
                          <td className="px-2 py-1.5">{r.numeroPedido || "—"}</td>
                          <td className="px-2 py-1.5 truncate max-w-[100px]">{r.oc || "—"}</td>
                          <td className="px-2 py-1.5">{r.dataPrevista || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!parsing && rows.length === 0 && !result && (
              <div className="flex items-center gap-2 rounded-lg p-3" style={{ backgroundColor: "#FEF3F2" }}>
                <AlertCircle className="h-4 w-4" style={{ color: "#D92D20" }} />
                <span className="text-sm" style={{ color: "#D92D20" }}>Nenhuma linha válida encontrada</span>
              </div>
            )}

            {result && (
              <div className="rounded-lg p-3 space-y-1" style={{ backgroundColor: "#D1FAE5" }}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" style={{ color: "#05873C" }} />
                  <span className="text-sm font-medium" style={{ color: "#05873C" }}>
                    {result.vinculados} vinculados automaticamente · {result.pendentes} aguardando vínculo manual
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{result ? "Fechar" : "Cancelar"}</Button>
          {!result && (
            <Button onClick={handleImport} disabled={!file || !rows.length || importing || parsing || !lojaId} style={{ backgroundColor: "#1E6FBF", color: "#fff" }}>
              {importing ? "Importando..." : "Importar"}
              {!importing && <ArrowRight className="h-4 w-4 ml-1" />}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
