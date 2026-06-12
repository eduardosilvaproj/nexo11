import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Camera, X, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  // Chamado sempre que o scanner le um codigo com sucesso
  onScan: (codigo: string) => void;
  // Mensagem exibida no topo (opcional)
  hint?: string;
}

const SCANNER_ID = "barcode-scanner-region";

export function BarcodeScannerDialog({ open, onOpenChange, onScan, hint }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const stopTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      stopScanner();
      setError(null);
      setLastScan(null);
      return;
    }
    startScanner();
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const startScanner = async () => {
    if (starting || scannerRef.current) return;
    setStarting(true);
    setError(null);
    try {
      // Suporta QR + Code 128 + EAN (1D) — usados pelos codigos de barra do Promob
      const formatsToSupport = [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
      ];
      const scanner = new Html5Qrcode(SCANNER_ID, {
        formatsToSupport,
        verbose: false,
      });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 12,
          qrbox: (vw, vh) => {
            // Quadrado de leitura ocupa 70% da menor dimensao
            const min = Math.min(vw, vh);
            const size = Math.floor(min * 0.7);
            return { width: size, height: Math.floor(size * 0.6) }; // retângulo horizontal p/ 1D
          },
          aspectRatio: 1.6,
        },
        (decodedText) => {
          // Sucesso: bipou um código
          setLastScan(decodedText);
          onScan(decodedText);

          // Feedback visual rapido
          if (stopTimeoutRef.current) window.clearTimeout(stopTimeoutRef.current);
          stopTimeoutRef.current = window.setTimeout(() => setLastScan(null), 800);
        },
        () => {
          // Erros de decode sao frequentes e inuteis de logar (camera nao enxergou codigo)
        },
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao acessar camera";
      setError(msg);
      toast.error("Nao foi possivel iniciar a camera: " + msg);
    } finally {
      setStarting(false);
    }
  };

  const stopScanner = async () => {
    if (stopTimeoutRef.current) {
      window.clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
    const sc = scannerRef.current;
    if (!sc) return;
    scannerRef.current = null;
    try {
      if (sc.isScanning) {
        await sc.stop();
        await sc.clear();
      }
    } catch {
      // ignora erros de stop
    }
  };

  if (!open) return null;

  // Overlay puro (sem Radix Dialog) — evita conflito com Dialogs ja abertos
  // (RecebimentoDialog). O z-index alto garante que fica acima de tudo.
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Scanner de codigo de barras"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "#000",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div className="relative flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 text-white" style={{ backgroundColor: "#0D1117" }}>
          <div className="flex items-center gap-2">
            <ScanLine className="h-4 w-4" />
            <span className="text-sm font-medium">Aponte para o codigo de barras</span>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-md hover:bg-white/10"
            aria-label="Fechar scanner"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>

        {/* Area de video */}
        <div className="relative flex-1" style={{ minHeight: 320, backgroundColor: "#000" }}>
          <div id={SCANNER_ID} className="w-full h-full" />
          {starting && (
            <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
              <Camera className="h-4 w-4 mr-2 animate-pulse" />
              Iniciando camera...
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-white text-sm">
              <div>
                <p className="font-semibold mb-2">Camera nao disponivel</p>
                <p className="opacity-70 text-xs">{error}</p>
                <p className="opacity-70 text-xs mt-2">Verifique permissoes do navegador</p>
              </div>
            </div>
          )}

          {/* Overlay de mira */}
          {!error && !starting && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                style={{
                  width: "70%",
                  height: "40%",
                  border: "2px solid rgba(255,255,255,0.7)",
                  borderRadius: 8,
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)",
                }}
              />
            </div>
          )}

          {/* Flash de "leu!" */}
          {lastScan && (
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              style={{ backgroundColor: "rgba(16, 185, 129, 0.35)" }}
            >
              <div
                className="rounded-full px-4 py-2 text-white font-mono text-sm"
                style={{ backgroundColor: "rgba(16, 185, 129, 0.9)" }}
              >
                {lastScan}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 text-center" style={{ backgroundColor: "#0D1117" }}>
          <p className="text-xs text-white/70">
            {hint || "A camera bipa automaticamente. Continue passando as caixas."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="mt-2"
          >
            Voltar para digitacao
          </Button>
        </div>
      </div>
    </div>
  );
}
