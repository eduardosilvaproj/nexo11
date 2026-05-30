import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, QrCode, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { createPayment, getPixQrCode, getBoletoBillet, AsaasBillingType } from "@/services/asaasService";
import { PixQRCodeDisplay } from "./PixQRCodeDisplay";

interface CobrancaAlvo {
  id: string;
  descricao: string;
  valor: number;
  vencimento: string;
  contrato_id: string | null;
  contratos?: { id: string; cliente_nome: string } | null;
  asaas_payment_id?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cobranca: CobrancaAlvo | null;
  onCobrado: () => void;
}

type Step = "escolher" | "gerando" | "resultado";

export function GerarCobrancaDialog({ open, onOpenChange, cobranca, onCobrado }: Props) {
  const [step, setStep] = useState<Step>("escolher");
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{ encodedImage: string; payload: string } | null>(null);
  const [boletoData, setBoletoData] = useState<{ barCodeData: string; billetUrl: string } | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [billingType, setBillingType] = useState<AsaasBillingType | null>(null);

  function reset() {
    setStep("escolher");
    setLoading(false);
    setPixData(null);
    setBoletoData(null);
    setPaymentId(null);
    setBillingType(null);
  }

  function handleOpenChange(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  async function gerar(billingType: AsaasBillingType) {
    if (!cobranca) return;
    setStep("gerando");
    setLoading(true);

    try {
      // 1. Buscar dados do cliente pelo contrato
      let clienteNome = "Cliente";
      let cpfCnpj: string | undefined;
      let asaasCustomerId: string | undefined;

      if (cobranca.contrato_id) {
        const { data: contrato } = await supabase
          .from("contratos")
          .select("cliente_nome, cliente_cpf_cnpj, asaas_customer_id")
          .eq("id", cobranca.contrato_id)
          .single();

        if (contrato) {
          clienteNome = contrato.cliente_nome ?? clienteNome;
          cpfCnpj = contrato.cliente_cpf_cnpj ?? undefined;
          asaasCustomerId = contrato.asaas_customer_id ?? undefined;
        }
      }

      // 2. Criar cobrança no Asaas
      const payment = await createPayment({
        customerId: asaasCustomerId ?? "",
        billingType,
        value: Number(cobranca.valor),
        dueDate: cobranca.vencimento,
        description: cobranca.descricao,
        externalReference: cobranca.id,
      });

      setPaymentId(payment.id);
      setBillingType(billingType);

      // 3. Salvar payment_id na conta
      const table = "financeiro_contas_receber";
      const { error: updateError } = await supabase
        .from(table)
        .update({
          asaas_payment_id: payment.id,
          asaas_billing_type: billingType,
          asaas_payment_status: payment.status,
        })
        .eq("id", cobranca.id);

      if (updateError) {
        console.error("[GerarCobrancaDialog] Erro ao salvar payment_id:", updateError);
        toast.error("Cobrança criada, mas falha ao salvar referência local.");
      }

      // 4. Buscar QR Code / linha digitável
      if (billingType === "PIX") {
        const qr = await getPixQrCode(payment.id);
        setPixData({ encodedImage: qr.encodedImage, payload: qr.payload });
      } else if (billingType === "BOLETO") {
        const billet = await getBoletoBillet(payment.id);
        setBoletoData({ barCodeData: billet.barCodeData, billetUrl: billet.billetUrl });
      }

      setStep("resultado");
      toast.success("Cobrança gerada com sucesso!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(`Falha ao gerar cobrança: ${msg}`);
      setStep("escolher");
    } finally {
      setLoading(false);
    }
  }

  if (!cobranca) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "escolher" && "Gerar Cobrança"}
            {step === "gerando" && "Gerando Cobrança..."}
            {step === "resultado" && "Cobrança Gerada"}
          </DialogTitle>
        </DialogHeader>

        {/* ---- Escolher tipo ---- */}
        {step === "escolher" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-700">{cobranca.descricao}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {cobranca.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
              {cobranca.contratos && (
                <p className="mt-1 text-xs text-slate-500">Cliente: {cobranca.contratos.cliente_nome}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-1.5"
                onClick={() => gerar("PIX")}
              >
                <QrCode className="h-6 w-6 text-[#1E6FBF]" />
                <span className="text-sm font-medium">PIX</span>
                <span className="text-[10px] text-muted-foreground">QR Code instantâneo</span>
              </Button>

              <Button
                variant="outline"
                className="h-20 flex flex-col gap-1.5"
                onClick={() => gerar("BOLETO")}
              >
                <FileText className="h-6 w-6 text-[#1E6FBF]" />
                <span className="text-sm font-medium">Boleto</span>
                <span className="text-[10px] text-muted-foreground">Impressão ou envio</span>
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Ao gerar, um link de pagamento será criado no Asaas.
            </p>
          </div>
        )}

        {/* ---- Gerando ---- */}
        {step === "gerando" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#1E6FBF]" />
            <p className="text-sm text-muted-foreground">
              Criando cobrança no Asaas...
            </p>
          </div>
        )}

        {/* ---- Resultado ---- */}
        {step === "resultado" && (
          <div className="space-y-4">
            {billingType === "PIX" && pixData && (
              <PixQRCodeDisplay
                encodedImage={pixData.encodedImage}
                payload={pixData.payload}
                billingType="PIX"
              />
            )}

            {billingType === "BOLETO" && boletoData && (
              <PixQRCodeDisplay
                encodedImage=""
                payload=""
                billingType="BOLETO"
                barCodeData={boletoData.barCodeData}
                billetUrl={boletoData.billetUrl}
              />
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { reset(); onOpenChange(false); onCobrado(); }}
              >
                Fechar
              </Button>
              {paymentId && (
                <Button
                  className="flex-1 bg-[#1E6FBF] hover:bg-[#1E6FBF]/90"
                  onClick={() => navigator.clipboard.writeText(paymentId)}
                >
                  Copiar ID Cobrança
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}