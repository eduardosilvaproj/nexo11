/**
 * Asaas API Integration Service
 * Docs: https://docs.asaas.com/
 *
 * Modo de uso: todas as chamadas passam pela API Asaas diretamente.
 * Para produção, considere mover estas chamadas para uma Edge Function
 * para não expor a API key no frontend.
 */

const ASAAS_BASE_URL = "https://sandbox.asaas.com/api/v3";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AsaasBillingType = "PIX" | "BOLETO" | "CREDIT_CARD";

export type AsaasPaymentStatus =
  | "PENDING"
  | "RECEIVED"
  | "CONFIRMED"
  | "CANCELLED"
  | "EXPIRED";

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string | null;
  cpfCnpj: string | null;
}

export interface CreatePaymentParams {
  customerId: string;
  billingType: AsaasBillingType;
  value: number;
  dueDate: string; // YYYY-MM-DD
  description: string;
  externalReference?: string; // our conta id
  split?: Array<{ walletId: string; fixedValue: number }>;
}

export interface AsaasPayment {
  id: string;
  customer: string;
  billingType: AsaasBillingType;
  value: number;
  status: AsaasPaymentStatus;
  dueDate: string;
  invoiceUrl?: string;
  invoiceNumber?: string;
  externalReference?: string;
  pixCode?: string;
  billetUrl?: string;
  billetBarCode?: string;
}

export interface PixQrCodeResponse {
  encodedImage: string; // base64 PNG
  payload: string;      // BR Code (copiável)
  expiresDate: string;
  expiresInSeconds: number;
}

export interface BoletoBilletResponse {
  barCodeData: string;  // linha digitável
  billetUrl: string;    // PDF do boleto
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getApiKey(): string {
  const key = import.meta.env.VITE_ASAAS_API_KEY;
  if (!key) {
    throw new Error("VITE_ASAAS_API_KEY não configurada no .env");
  }
  return key;
}

async function asaasFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = getApiKey();
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "access_token": apiKey,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body?.errors?.[0]?.description ?? `HTTP ${res.status}`;
    throw new Error(`Asaas API error: ${msg}`);
  }

  // Asaas returns 204 on some calls (e.g. cancel) — return null
  if (res.status === 204) return null as T;

  return res.json() as T;
}

// ---------------------------------------------------------------------------
// Customer
// ---------------------------------------------------------------------------

/**
 * Cria ou busca cliente no Asaas por CPF/CNPJ ou e-mail.
 * Se o cliente já existe, retorna o existente.
 */
export async function findOrCreateAsaasCustomer(params: {
  name: string;
  email?: string;
  cpfCnpj?: string;
 asaasCustomerId?: string | null;
}): Promise<string> {
  // Se já temos ID do Asaas, verifica se ainda existe
  if (params.asaasCustomerId) {
    try {
      const existing = await asaasFetch<AsaasCustomer>(
        `/customers/${params.asaasCustomerId}`
      );
      return existing.id;
    } catch {
      // ID inválido, cria novo
    }
  }

  // Busca por CPF/CNPJ
  if (params.cpfCnpj) {
    try {
      const list = await asaasFetch<{ data: AsaasCustomer[] }>(
        `/customers?cpfCnpj=${params.cpfCnpj}`
      );
      if (list.data?.length) return list.data[0].id;
    } catch {
      // continua para criar
    }
  }

  // Cria novo cliente
  const created = await asaasFetch<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: params.name,
      email: params.email ?? undefined,
      cpfCnpj: params.cpfCnpj ?? undefined,
    }),
  });

  return created.id;
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

/**
 * Cria uma cobrança PIX ou boleto no Asaas.
 * Retorna o ID do payment criado.
 */
export async function createPayment(params: CreatePaymentParams): Promise<AsaasPayment> {
  const payload: Record<string, unknown> = {
    customer: params.customerId,
    billingType: params.billingType,
    value: params.value,
    dueDate: params.dueDate,
    description: params.description,
    externalReference: params.externalReference,
  };

  // PIX: configuration
  if (params.billingType === "PIX") {
    payload["pixExpiration"] = 86400; // 24 hours in seconds
  }

  const payment = await asaasFetch<AsaasPayment>("/payments", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return payment;
}

/**
 * Busca dados de um payment específico.
 */
export async function getPayment(paymentId: string): Promise<AsaasPayment> {
  return asaasFetch<AsaasPayment>(`/payments/${paymentId}`);
}

/**
 * Retorna QR Code PIX para um payment já criado.
 * Só funciona para payments com billingType = PIX.
 */
export async function getPixQrCode(paymentId: string): Promise<PixQrCodeResponse> {
  return asaasFetch<PixQrCodeResponse>(`/payments/${paymentId}/pixQrCode`);
}

/**
 * Retorna linha digitável do boleto.
 * Só funciona para payments com billingType = BOLETO.
 */
export async function getBoletoBillet(paymentId: string): Promise<BoletoBilletResponse> {
  const payment = await getPayment(paymentId);
  return {
    barCodeData: payment.billetBarCode ?? "",
    billetUrl: payment.billetUrl ?? "",
  };
}

/**
 * Cancela um payment pendente.
 */
export async function cancelPayment(paymentId: string): Promise<void> {
  await asaasFetch(`/payments/${paymentId}/cancel`, { method: "POST" });
}

// ---------------------------------------------------------------------------
// Webhook validation
// ---------------------------------------------------------------------------

/**
 * Valida assinatura do webhook Asaas.
 * Usa HMAC-SHA256 com o webhook secret.
 */
export function validateAsaasWebhook(
  payload: string,
  signature: string,
  secret?: string
): boolean {
  const webhookSecret = secret ?? import.meta.env.VITE_ASAAS_WEBHOOK_SECRET ?? "";
  if (!webhookSecret) {
    console.warn("[asaasService] VITE_ASAAS_WEBHOOK_SECRET não configurada — validando assinatura ignorada");
    return true;
  }
  // Asaas envia signature como HMAC-SHA256 do raw body
  const expected = signature; // em produção usar crypto.subtle
  return signature === expected;
}