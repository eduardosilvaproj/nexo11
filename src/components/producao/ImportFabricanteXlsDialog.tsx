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
  cliente: string;        // nome completo (com sufixo " - 285004 - CONFERÊNCIA")
  clienteBase: string;    // nome antes do primeiro "-"
  numeroPedido: string;   // NUMERO DO PEDIDO do fabricante (UNICO por linha)
  oc: string;             // NOME DO AMBIENTE/OC (ex: "LUCASMASTER")
  dataPrevista: string;
  valor: number;          // Vl Total
  prazo: string;          // string de prazos "50 - 20 - 6 - 8"
  status: string;
  tipo: string;           // V, A, B, A e B
  situacao: string;       // L, T
  dataEmissao: string;
  transportadora: string;
  lote: string;
  contratoId?: string | null;
  clienteId?: string | null;
  clienteMatch?: boolean;
  contratoMatch?: boolean;
}

// A partir de agora, GroupedPedido == ParsedRow (1 linha do XLSX = 1 pedido/ambiente).
// O agrupamento visual por cliente eh feito na UI (TerceirizadaTab), nao no DB.
type GroupedPedido = ParsedRow;

const extractClienteBase = (raw: string): string => {
  const s = (raw || "").toString().trim();
  // Split por " - " (com espaços) conforme padrão "NOME - 285004 - CONFERÊNCIA"
  const parts = s.split(/\s+-\s+/);
  if (parts.length > 1) return parts[0].trim();
  // Fallback: hífen sem espaços
  const idx = s.indexOf("-");
  return (idx > 0 ? s.slice(0, idx) : s).trim();
};

const MAX_SIZE = 10 * 1024 * 1024;

const normalize = (s: string) =>
  (s || "").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

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

function parseValor(raw: unknown): number {
  if (raw == null || raw === "") return 0;
  if (typeof raw === "number") return raw;
  const s = String(raw).trim();
  // Tenta pt-BR: "1.234,56" -> 1234.56
  const br = s.match(/^(\d{1,3}(?:\.\d{3})*),(\d+)$/);
  if (br) return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
  // Padrao en-US: "1,234.56" ou "1234.56"
  return parseFloat(s.replace(/,/g, "")) || 0;
}

export function ImportFabricanteXlsDialog({ open, onOpenChange, lojaId, fornecedorId }: Props) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [grouped, setGrouped] = useState<GroupedPedido[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<{ atualizados: number; novos: number; ignorados: number; erros?: { pedido: string; mensagem: string }[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => { setFile(null); setRows([]); setGrouped([]); setResult(null); setDragOver(false); };
  useEffect(() => { if (!open) reset(); }, [open]);

  const handleFile = async (f: File) => {
    if (f.size > MAX_SIZE) return toast.error("Arquivo maior que 10MB");
    if (!/\.(xlsx?|XLSX?)$/.test(f.name)) return toast.error("Use .xls ou .xlsx");
    setFile(f); setParsing(true); setResult(null); setGrouped([]);
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
      const iCliente = findCol(headers, ["nome cliente", "cliente", "razao", "nome"]);
      const iPedido = findCol(headers, ["pedido", "numero pedido", "nº pedido"]);
      const iOC = findCol(headers, ["oc", "ordem compra"]);
      const iData = findCol(headers, ["data prog", "previsao", "previsão", "data prevista", "entrega"]);
      const iStatus = findCol(headers, ["status"]);
      const iTipo = findCol(headers, ["tipo"]);
      const iSituacao = findCol(headers, ["situacao", "situação"]);
      const iEmissao = findCol(headers, ["dt emissão", "dt emissao", "emissao", "emissão"]);
      const iVlTotal = findCol(headers, ["vl total", "valor total", "total"]);
      const iPrazos = findCol(headers, ["prazos", "prazo"]);
      const iTransp = findCol(headers, ["transp razão social", "transp razao social", "transportadora"]);
      const iLote = findCol(headers, ["lote"]);

      if (iCliente < 0) throw new Error("Não encontrei a coluna NOME CLIENTE");

      const parsed: ParsedRow[] = [];
      for (let i = headerIdx + 1; i < json.length; i++) {
        const r = json[i] as unknown[];
        const cliente = String(r[iCliente] ?? "").trim();
        const oc = iOC >= 0 ? String(r[iOC] ?? "").trim() : "";
        const dataPrev = iData >= 0 ? excelDateToISO(r[iData]) : "";
        const tipoRaw = iTipo >= 0 ? String(r[iTipo] ?? "").trim().toUpperCase() : "";
        const situacaoRaw = iSituacao >= 0 ? String(r[iSituacao] ?? "").trim().toUpperCase() : "";
        const valor = iVlTotal >= 0 ? parseValor(r[iVlTotal]) : 0;

        // Filtrar: apenas Tipo = V ou A. Ignorar B e "A e B"
        if (iTipo >= 0) {
          if (!tipoRaw) continue;
          if (tipoRaw === "B") continue;
          if (tipoRaw.includes("B")) continue; // "A e B", "A B", etc
          if (tipoRaw !== "V" && tipoRaw !== "A") continue;
        }

        if (!cliente && !oc) continue;

        const numeroPedido = iPedido >= 0 ? String(r[iPedido] ?? "").trim() : "";
        if (!numeroPedido) continue; // sem pedido, nao importa

        parsed.push({
          cliente,
          clienteBase: extractClienteBase(cliente),
          numeroPedido,
          oc,
          dataPrevista: dataPrev,
          valor,
          prazo: iPrazos >= 0 ? String(r[iPrazos] ?? "").trim() : "",
          status: iStatus >= 0 ? String(r[iStatus] ?? "").trim() : "",
          tipo: tipoRaw,
          situacao: situacaoRaw,
          dataEmissao: iEmissao >= 0 ? excelDateToISO(r[iEmissao]) : "",
          transportadora: iTransp >= 0 ? String(r[iTransp] ?? "").trim() : "",
          lote: iLote >= 0 ? String(r[iLote] ?? "").trim() : "",
        });
      }

      // Cross-match por clienteBase (nome antes do "-") e por contrato ativo.
      // Cada linha do XLSX agora eh 1 pedido/ambiente independente.
      if (lojaId && parsed.length) {
        const [{ data: clientes }, { data: contratos }] = await Promise.all([
          supabase.from("clientes").select("id, nome").eq("loja_id", lojaId),
          supabase.from("contratos")
            .select("id, cliente_nome, cliente_id")
            .eq("loja_id", lojaId)
            .neq("status", "finalizado"),
        ]);

        for (const p of parsed) {
          const cN = normalize(p.clienteBase);
          if (!cN) continue;
          const cli = clientes?.find((c) => {
            const n = normalize(c.nome);
            return n === cN || (cN.length >= 4 && n.includes(cN)) || (n.length >= 4 && cN.includes(n));
          });
          if (cli) {
            p.clienteId = cli.id;
            p.clienteMatch = true;
          }

          const ct = contratos?.find((c) => {
            const n = normalize(c.cliente_nome);
            return n === cN || (cN.length >= 4 && n.includes(cN)) || (n.length >= 4 && cN.includes(n));
          });
          if (ct) { p.contratoId = ct.id; p.contratoMatch = true; }
        }
      }

      // Sem agrupamento: cada parsed row eh 1 pedido/ambiente independente.
      // O agrupamento visual por cliente eh feito na UI (TerceirizadaTab).
      setRows(parsed);
      setGrouped(parsed);
      if (!parsed.length) toast.warning("Nenhuma linha válida");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao ler XLS");
      setRows([]); setGrouped([]);
    } finally { setParsing(false); }
  };

  const handleImport = async () => {
    if (!lojaId) { toast.error("Contexto de loja não definido"); return; }
    if (!grouped.length) { toast.error("Nenhum pedido para importar"); return; }
    setImporting(true);

    let atualizados = 0, novos = 0, ignorados = 0;
    const erros: { pedido: string; mensagem: string }[] = [];

    const sb = supabase as unknown as {
      from: (t: string) => {
        upsert: (v: unknown, o: unknown) => Promise<{ error: { message: string } | null; data: unknown }>;
      };
    };

    // Faz upsert em lotes de 50 (Supabase aceita payloads grandes; 50 eh seguro).
    const BATCH = 50;
    for (let start = 0; start < grouped.length; start += BATCH) {
      const fatia = grouped.slice(start, start + BATCH);
      const payload = fatia
        .filter((g) => (g.numeroPedido || "").trim())
        .map((g) => ({
          loja_id: lojaId,
          fornecedor_id: fornecedorId,
          contrato_id: g.contratoId ?? null,
          cliente_id: g.clienteId ?? null,
          cliente_nome: g.clienteBase || null,
          numero_pedido: (g.numeroPedido || "").trim(),
          oc: g.oc || null,
          data_prevista: g.dataPrevista || null,
          valor: g.valor || 0,
          prazo: g.prazo || null,
          transportadora: g.transportadora || null,
          tipo: g.tipo || null,
          situacao: g.situacao || null,
          status: "aguardando_fabricacao",
          tipo_entrada: "xml",
          vinculo_status: g.contratoId ? "vinculado" : "pendente",
        }));

      if (!payload.length) continue;

      // Antes de chamar upsert, conta quantos ja existem pra separar novos vs atualizados.
      // (Upsert nao retorna essa informacao de forma confiavel com .select() omitido.)
      const numeros = payload.map((p) => p.numero_pedido);
      const { data: existentes } = await supabase
        .from("producao_terceirizada")
        .select("numero_pedido")
        .eq("loja_id", lojaId)
        .in("numero_pedido", numeros);
      const setExist = new Set((existentes ?? []).map((r) => r.numero_pedido));

      const { error } = await sb.from("producao_terceirizada").upsert(payload, {
        onConflict: "loja_id,numero_pedido",
      });

      if (error) {
        // Em vez de descartar, anexa a mensagem de erro para o usuario ver.
        for (const p of payload) {
          erros.push({ pedido: p.numero_pedido, mensagem: error.message });
          ignorados++;
        }
        console.error("[ImportFabricante] upsert error:", error);
      } else {
        for (const p of payload) {
          if (setExist.has(p.numero_pedido)) atualizados++;
          else novos++;
        }
      }
    }

    setResult({ atualizados, novos, ignorados, erros });
    qc.invalidateQueries({ queryKey: ["producao-terceirizada"] });
    if (erros.length === 0) {
      toast.success(`${atualizados} atualizados · ${novos} novos · ${ignorados} ignorados`);
    } else {
      toast.warning(
        `${atualizados} atualizados · ${novos} novos · ${ignorados} ignorados (veja detalhes)`,
      );
    }
    setImporting(false);
  };

  const matchedCount = grouped.filter((r) => r.contratoMatch).length;
  const clientesUnicos = new Set(grouped.map((g) => g.clienteBase).filter(Boolean)).size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 560 }} className="gap-3">
        <DialogHeader>
          <DialogTitle>Importar XML do Fabricante</DialogTitle>
          <DialogDescription>
            Importe um XLS exportado do portal do fabricante. Cada linha do arquivo
            vira um pedido independente (1 ambiente = 1 registro).
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

            {!parsing && grouped.length > 0 && !result && (
              <div className="space-y-2">
                <div style={{ fontSize: 12, color: "#48556B" }}>
                  <strong>{grouped.length} pedidos/ambientes</strong> ·{" "}
                  <strong>{clientesUnicos} clientes distintos</strong> ·{" "}
                  <strong style={{ color: "#05873C" }}>{matchedCount} vinculados a contratos</strong> ·{" "}
                  {grouped.length - matchedCount} pendentes
                </div>
                <div className="overflow-hidden rounded-lg" style={{ border: "0.5px solid #E8ECF2", maxHeight: 240, overflowY: "auto" }}>
                  <table className="w-full" style={{ fontSize: 11 }}>
                    <thead style={{ backgroundColor: "#F7F9FC" }}>
                      <tr style={{ color: "#6B7A90" }}>
                        <th className="px-2 py-1.5 text-left w-6"></th>
                        <th className="px-2 py-1.5 text-left">Cliente</th>
                        <th className="px-2 py-1.5 text-left">Pedido</th>
                        <th className="px-2 py-1.5 text-left">Ambiente (OC)</th>
                        <th className="px-2 py-1.5 text-left">Previsão</th>
                        <th className="px-2 py-1.5 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grouped.map((g, i) => (
                        <tr key={i} style={{ borderTop: "0.5px solid #E8ECF2" }}>
                          <td className="px-2 py-1.5">
                            {g.contratoMatch ? <span style={{ color: "#05873C" }}>✓</span> : <span style={{ color: "#E8A020" }}>⚠</span>}
                          </td>
                          <td className="px-2 py-1.5 truncate max-w-[140px]" title={g.cliente}>{g.clienteBase || "—"}</td>
                          <td className="px-2 py-1.5">{g.numeroPedido || "—"}</td>
                          <td className="px-2 py-1.5 truncate max-w-[140px]" title={g.oc}>{g.oc || "—"}</td>
                          <td className="px-2 py-1.5">{g.dataPrevista || "—"}</td>
                          <td className="px-2 py-1.5 text-right">
                            {g.valor > 0 ? g.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!parsing && grouped.length === 0 && rows.length === 0 && !result && (
              <div className="flex items-center gap-2 rounded-lg p-3" style={{ backgroundColor: "#FEF3F2" }}>
                <AlertCircle className="h-4 w-4" style={{ color: "#D92D20" }} />
                <span className="text-sm" style={{ color: "#D92D20" }}>Nenhuma linha válida encontrada</span>
              </div>
            )}

            {result && (
              <div className="rounded-lg p-3 space-y-2" style={{ backgroundColor: result.ignorados > 0 ? "#FEF3F2" : "#D1FAE5" }}>
                <div className="flex items-center gap-2">
                  {result.ignorados > 0
                    ? <AlertCircle className="h-4 w-4" style={{ color: "#D92D20" }} />
                    : <CheckCircle2 className="h-4 w-4" style={{ color: "#05873C" }} />}
                  <span className="text-sm font-medium" style={{ color: result.ignorados > 0 ? "#D92D20" : "#05873C" }}>
                    {result.atualizados} atualizados · {result.novos} novos · {result.ignorados} ignorados
                  </span>
                </div>
                {result.erros && result.erros.length > 0 && (
                  <div className="text-xs space-y-1 pt-1" style={{ color: "#7A271A" }}>
                    <div style={{ fontWeight: 600 }}>Erros (até 5):</div>
                    {result.erros.slice(0, 5).map((e, i) => (
                      <div key={i}>
                        <strong>#{e.pedido}</strong>: {e.mensagem}
                      </div>
                    ))}
                    {result.erros.length > 5 && (
                      <div className="opacity-70">… e mais {result.erros.length - 5}</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{result ? "Fechar" : "Cancelar"}</Button>
          {!result && (
            <Button onClick={handleImport} disabled={!file || !grouped.length || importing || parsing || !lojaId} style={{ backgroundColor: "#1E6FBF", color: "#fff" }}>
              {importing ? "Importando..." : "Importar"}
              {!importing && <ArrowRight className="h-4 w-4 ml-1" />}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
