import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { usuario_id, usuarios_ids, titulo, mensagem, data, link, modulo } = await req.json()

    const targetUserIds = usuarios_ids || [usuario_id]

    if (!targetUserIds || targetUserIds.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum usuário especificado' }), { status: 400 })
    }

    // Busca tokens ativos para os usuários
    const { data: tokens, error: tokenError } = await supabase
      .from('device_tokens')
      .select('token')
      .in('usuario_id', targetUserIds)
      .eq('ativo', true)

    if (tokenError) throw tokenError

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ message: 'Nenhum token ativo encontrado' }), { status: 200 })
    }

    const messages = tokens.map(t => ({
      to: t.token,
      sound: 'default',
      title: titulo,
      body: mensagem,
      data: { ...data, link, modulo },
    }))

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    })

    const result = await response.json()

    return new Response(JSON.stringify({ result }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    })
  }
})
