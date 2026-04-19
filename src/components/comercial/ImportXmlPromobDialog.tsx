import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Upload, FileCode2, AlertCircle, CheckCircle2 } from "lucide-react";
import { parsePromobXml, type PromobParsed } from "@/lib/promob-xml";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function ImportXmlPromobDialog({ open, onOpenChange }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsed, setParsed] = useState<PromobParsed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);

  const reset = () => {
    setFile(null);
    setParsed(null);
    setError(null);
    setParsing(false);
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleFile = async (f: File | null) => {
    if (!f) return;
    if (!/\.xml$/i.test(f.name)) {
      setError("Apenas arquivos .xml são aceitos");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("Arquivo muito grande (máx 10MB)");
      return;
    }
    setError(null);
    setParsing(true);
    setFile(f);
    try {
      const text = await f.text();
      const data = parsePromobXml(text);
      setParsed(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao ler XML");
      setParsed(null);
    } finally {
      setParsing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[760px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar XML Promob</DialogTitle>
          <DialogDescription>
            Passo 1 — Faça upload do XML para gerar um orçamento.
          </DialogDescription>
        </DialogHeader>

        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0] ?? null);
          }}
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed py-10 transition-colors hover:border-[#1E6FBF]"
          style={{
            borderColor: dragOver ? "#1E6FBF" : "#E8ECF2",
            background: dragOver ? "#F0F7FF" : "#FAFBFC",
          }}
        >
          <input
            type="file"
            accept=".xml,text/xml,application/xml"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          {file && !error ? (
            <>
              <FileCode2 className="h-8 w-8" style={{ color: "#1E6FBF" }} />
              <p className="mt-2 text-sm font-medium" style={{ color: "#0D1117" }}>
                {file.name}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: "#6B7A90" }}>
                {(file.size / 1024).toFixed(1)} KB · clique para trocar
              </p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8" style={{ color: "#6B7A90" }} />
              <p className="mt-2 text-sm font-medium" style={{ color: "#0D1117" }}>
                Arraste o XML gerado pelo Promob
              </p>
              <p className="mt-0.5 text-xs" style={{ color: "#6B7A90" }}>
                Promob → Relatórios → Orçamento → Exportar XML
              </p>
            </>
          )}
        </label>

        {parsing && (
          <p className="text-center text-sm" style={{ color: "#6B7A90" }}>
            Lendo XML...
          </p>
        )}

        {error && (
          <div
            className="flex items-start gap-2 rounded-md p-3"
            style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}
          >
            <AlertCircle className="h-4 w-4 mt-0.5" style={{ color: "#E53935" }} />
            <p className="text-sm" style={{ color: "#991B1B" }}>{error}</p>
          </div>
        )}

        {parsed && !error && (
          <div className="space-y-3">
            <div
              className="flex items-center gap-2 rounded-md p-3"
              style={{ background: "#ECFDF3", border: "1px solid #B7E4C7" }}
            >
              <CheckCircle2 className="h-4 w-4" style={{ color: "#12B76A" }} />
              <p className="text-sm" style={{ color: "#0D1117" }}>
                XML lido com sucesso
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Cliente" value={parsed.cliente_nome || "—"} />
              <Field label="Ordem de compra" value={parsed.ordem_compra || "—"} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Money label="Total tabela" value={parsed.total_tabela} />
              <Money label="Total pedido" value={parsed.total_pedido} />
              <Money label="Total orçamento" value={parsed.total_orcamento} highlight />
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs" style={{ color: "#6B7A90" }}>
              <span>{parsed.categorias.length} categorias</span>
              <span>{parsed.itens.length} itens</span>
              <span>{parsed.acrescimos.length} acréscimos</span>
            </div>
          </div>
        )}

        <p className="text-xs" style={{ color: "#B0BAC9" }}>
          Próximo passo: revisar itens e salvar o orçamento.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-md p-3"
      style={{ background: "#F5F7FA", border: "1px solid #E8ECF2" }}
    >
      <p className="text-xs" style={{ color: "#6B7A90" }}>{label}</p>
      <p className="mt-0.5 text-sm font-medium truncate" style={{ color: "#0D1117" }}>
        {value}
      </p>
    </div>
  );
}

function Money({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className="rounded-md p-3"
      style={{
        background: highlight ? "#E6F3FF" : "#F5F7FA",
        border: `1px solid ${highlight ? "#1E6FBF" : "#E8ECF2"}`,
      }}
    >
      <p className="text-xs" style={{ color: "#6B7A90" }}>{label}</p>
      <p
        className="mt-0.5 text-sm font-semibold"
        style={{ color: highlight ? "#1E6FBF" : "#0D1117" }}
      >
        {formatBRL(value)}
      </p>
    </div>
  );
}
