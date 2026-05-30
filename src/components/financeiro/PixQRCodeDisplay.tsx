import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface Props {
  encodedImage: string; // base64 PNG
  payload: string;      // BR Code PIX
  billingType: "PIX" | "BOLETO";
  billetUrl?: string;
  barCodeData?: string;
}

export function PixQRCodeDisplay({ encodedImage, payload, billingType, billetUrl, barCodeData }: Props) {
  const [copied, setCopied] = useState(false);

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text
    }
  }

  if (billingType === "BOLETO") {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-center">
          <p className="text-xs text-muted-foreground mb-2">Linha Digitável</p>
          <p
            className="font-mono text-sm leading-relaxed select-all cursor-pointer"
            onClick={() => copiar(barCodeData ?? "")}
            title="Clique para copiar"
          >
            {barCodeData}
          </p>
        </div>
        {billetUrl && (
          <a
            href={billetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-lg bg-[#1E6FBF] hover:bg-[#1E6FBF]/90 text-white py-3 px-4 font-medium text-sm transition-colors"
          >
            Visualizar Boleto (PDF)
          </a>
        )}
        <button
          onClick={() => copiar(barCodeData ?? "")}
          className="flex items-center justify-center gap-2 w-full rounded-lg border border-slate-300 bg-white hover:bg-slate-50 py-2.5 px-4 font-medium text-sm transition-colors"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copiado!" : "Copiar Linha Digitável"}
        </button>
        <p className="text-center text-xs text-muted-foreground">
          Válido até o vencimento. Imprima ou envie ao cliente.
        </p>
      </div>
    );
  }

  // PIX
  return (
    <div className="space-y-4">
      {/* QR Code */}
      <div className="flex justify-center bg-white rounded-xl p-4 border border-slate-200">
        <img
          src={`data:image/png;base64,${encodedImage}`}
          alt="QR Code PIX"
          className="w-52 h-52"
        />
      </div>

      {/* Payload */}
      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
        <p className="text-xs text-muted-foreground mb-1.5 text-center">Código PIX (copie e cole)</p>
        <p
          className="font-mono text-xs leading-relaxed break-all select-all cursor-pointer text-center"
          onClick={() => copiar(payload)}
          title="Clique para copiar"
        >
          {payload}
        </p>
      </div>

      <button
        onClick={() => copiar(payload)}
        className="flex items-center justify-center gap-2 w-full rounded-lg border border-slate-300 bg-white hover:bg-slate-50 py-2.5 px-4 font-medium text-sm transition-colors"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        {copied ? "Código copiado!" : "Copiar Código PIX"}
      </button>

      <p className="text-center text-xs text-muted-foreground">
        QR Code válido por 24 horas. O pagamento será confirmado automaticamente.
      </p>
    </div>
  );
}