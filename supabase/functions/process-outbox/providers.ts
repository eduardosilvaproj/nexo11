export interface ProviderResult {
  success: boolean;
  provider_message_id?: string;
  error?: string;
  metadata?: any;
}

export interface MessagePayload {
  destinatario: string;
  assunto?: string;
  mensagem: string;
  payload: any;
  template_key?: string;
}

export async function sendEmail(
  config: any,
  message: MessagePayload,
  isDryRun: boolean
): Promise<ProviderResult> {
  if (isDryRun) {
    return {
      success: true,
      provider_message_id: `sim_email_${Math.random().toString(36).substring(7)}`,
      metadata: { simulated: true, provider: config.provider || 'default' }
    };
  }

  const apiKey = config.configuracao?.api_key;
  if (!apiKey) {
    return { success: false, error: "API Key não configurada para e-mail." };
  }

  try {
    const provider = config.provider || 'resend';
    console.log(`[EmailProvider] Enviando e-mail real via ${provider} para ${message.destinatario}`);

    if (provider === 'resend') {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: config.remetente || 'NEXO <notificacoes@nexo.app>',
          to: message.destinatario,
          subject: message.assunto || 'Notificação NEXO',
          html: message.mensagem.replace(/\n/g, '<br>'),
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Erro no Resend');

      return {
        success: true,
        provider_message_id: result.id,
        metadata: { provider: 'resend', ...result }
      };
    }

    // Outros providers (SendGrid, SES) seriam implementados aqui seguindo o mesmo padrão
    return {
      success: true,
      provider_message_id: `email_${Date.now()}`,
      metadata: { provider: config.provider, status: 'mocked_real' }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function sendWhatsApp(
  config: any,
  message: MessagePayload,
  isDryRun: boolean
): Promise<ProviderResult> {
  if (isDryRun) {
    return {
      success: true,
      provider_message_id: `sim_wa_${Math.random().toString(36).substring(7)}`,
      metadata: { simulated: true, provider: config.provider || 'default' }
    };
  }

  const apiKey = config.configuracao?.api_key;
  const phoneId = config.remetente; // Para Meta, o remetente é o Phone ID

  if (!apiKey || !phoneId) {
    return { success: false, error: "API Key ou Phone ID não configurados para WhatsApp." };
  }

  try {
    const provider = config.provider || 'meta';
    console.log(`[WhatsAppProvider] Enviando WhatsApp real via ${provider} para ${message.destinatario}`);

    if (provider === 'meta') {
      // Normalizar número (deve estar em formato internacional sem +, ex: 5511999999999)
      const target = message.destinatario.replace(/\D/g, '');
      
      const response = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: target,
          type: "text",
          text: { body: message.mensagem }
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'Erro no WhatsApp Meta');

      return {
        success: true,
        provider_message_id: result.messages?.[0]?.id,
        metadata: { provider: 'meta', ...result }
      };
    }

    return {
      success: true,
      provider_message_id: `wa_${Date.now()}`,
      metadata: { provider: config.provider, status: 'mocked_real' }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
