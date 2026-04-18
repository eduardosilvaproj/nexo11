import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { loja_id } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: integracao, error: integErr } = await supabase
      .from('integracoes')
      .select('config, ativo, ultima_sincronizacao')
      .eq('loja_id', loja_id)
      .eq('tipo', 'promob')
      .single()

    console.log('integracao encontrada:', JSON.stringify(integracao))
    console.log('integErr:', integErr)

    if (integErr || !integracao) {
      return new Response(JSON.stringify({
        ok: false,
        erro: 'Integração Promob não encontrada para esta loja.',
        detalhe: integErr?.message
      }), { status: 400, headers: corsHeaders })
    }

    const empresa = integracao.config?.empresa
    const usuario = integracao.config?.usuario
    const senha   = integracao.config?.senha

    console.log('empresa:', empresa, 'usuario:', usuario)

    if (!empresa || !usuario || !senha) {
      return new Response(JSON.stringify({
        ok: false,
        erro: 'Credenciais incompletas. Preencha Empresa, Usuário e Senha em Integrações.',
        config_recebido: integracao.config
      }), { status: 400, headers: corsHeaders })
    }

    const loginResp = await fetch(
      'https://consultasweb.promob.com/Authentication/Index',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        body: new URLSearchParams({
          Empresa: empresa,
          UserName: usuario,
          Password: senha,
          RememberMe: 'false',
        }),
        redirect: 'manual'
      }
    )

    console.log('login status:', loginResp.status)
    const setCookieHeader = loginResp.headers.get('set-cookie') || ''
    const locationHeader  = loginResp.headers.get('location') || ''
    console.log('location após login:', locationHeader)

    const loginFalhou =
      !setCookieHeader ||
      locationHeader.includes('Authentication') ||
      locationHeader === ''

    if (loginFalhou) {
      await supabase.from('integracoes')
        .update({ ativo: false, updated_at: new Date().toISOString() })
        .eq('loja_id', loja_id).eq('tipo', 'promob')

      return new Response(JSON.stringify({
        ok: false,
        erro: 'Login no Promob falhou. Verifique Empresa, Usuário e Senha.',
        login_status: loginResp.status,
        location: locationHeader
      }), { status: 401, headers: corsHeaders })
    }

    const cookies = setCookieHeader
      .split(',')
      .map((c: string) => c.split(';')[0].trim())
      .join('; ')

    const hoje   = new Date()
    const inicio = new Date(hoje.getTime() - 60 * 24 * 60 * 60 * 1000)
    const fmtBR  = (d: Date) =>
      `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`

    const url = `https://consultasweb.promob.com/Order/Index?DataEmissaoInicial=${fmtBR(inicio)}&DataEmissaoFinal=${fmtBR(hoje)}`
    const pedidosResp = await fetch(url, {
      headers: { Cookie: cookies, 'User-Agent': 'Mozilla/5.0' }
    })

    const html = await pedidosResp.text()
    console.log('html length:', html.length)
    console.log('html preview:', html.substring(0, 500))

    const pedidos: Array<{numeroPedido:string,oc:string,dataPrevista:string,transportadora:string}> = []
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
    let trMatch
    while ((trMatch = trRegex.exec(html)) !== null) {
      const cells: string[] = []
      const tdLocal = /<td[^>]*>([\s\S]*?)<\/td>/gi
      let tdMatch
      while ((tdMatch = tdLocal.exec(trMatch[1])) !== null) {
        cells.push(tdMatch[1].replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim())
      }
      if (cells.length >= 8 && /^\d{5,}$/.test(cells[0])) {
        pedidos.push({
          numeroPedido: cells[0],
          oc: cells[5] || '',
          dataPrevista: cells[7] || '',
          transportadora: cells[14] || cells[13] || ''
        })
      }
    }

    console.log('pedidos encontrados:', pedidos.length)
    if (pedidos.length > 0) console.log('primeiro pedido:', JSON.stringify(pedidos[0]))

    const { data: contratos } = await supabase
      .from('contratos')
      .select('id, cliente_nome')
      .eq('loja_id', loja_id)
      .not('status', 'in', '("finalizado","cancelado")')

    const normalize = (s: string) =>
      s.toLowerCase()
       .normalize('NFD')
       .replace(/[\u0300-\u036f]/g,'')
       .replace(/[^a-z0-9]/g,'')

    let atualizados = 0

    for (const pedido of pedidos) {
      const ocNorm = normalize(pedido.oc)
      if (!ocNorm || !pedido.dataPrevista) continue

      const contrato = contratos?.find(c => {
        const n = normalize(c.cliente_nome)
        return n === ocNorm ||
          (ocNorm.length >= 4 && n.includes(ocNorm)) ||
          (n.length >= 4 && ocNorm.includes(n))
      })
      if (!contrato) continue

      const [d,m,a] = pedido.dataPrevista.split('/')
      if (!d||!m||!a) continue
      const dataISO = `${a}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`

      const { data: ex } = await supabase.from('entregas')
        .select('id').eq('contrato_id', contrato.id).maybeSingle()

      if (ex) {
        await supabase.from('entregas')
          .update({ data_prevista: dataISO, transportadora: pedido.transportadora })
          .eq('contrato_id', contrato.id)
      } else {
        await supabase.from('entregas')
          .insert({ contrato_id: contrato.id, data_prevista: dataISO,
                    transportadora: pedido.transportadora, status: 'pendente' })
      }

      await supabase.from('contrato_logs').insert({
        contrato_id: contrato.id,
        acao: 'promob_sincronizado',
        titulo: 'Promob sincronizado',
        descricao: `Pedido #${pedido.numeroPedido} · Previsão: ${pedido.dataPrevista} · ${pedido.transportadora}`
      })
      atualizados++
    }

    await supabase.from('integracoes')
      .update({ ativo: true, ultima_sincronizacao: new Date().toISOString() })
      .eq('loja_id', loja_id).eq('tipo', 'promob')

    return new Response(JSON.stringify({
      ok: true,
      total_pedidos: pedidos.length,
      atualizados,
      mensagem: atualizados > 0
        ? `${atualizados} contrato(s) atualizado(s) com previsão do Promob`
        : `${pedidos.length} pedidos encontrados mas nenhum cruzou com contratos ativos`
    }), { status: 200, headers: corsHeaders })

  } catch (error) {
    console.error('Erro:', error)
    return new Response(JSON.stringify({
      ok: false,
      erro: 'Erro interno',
      detalhe: error instanceof Error ? error.message : String(error)
    }), { status: 500, headers: corsHeaders })
  }
})