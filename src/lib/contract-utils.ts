const formatBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

export function generateParcelasDescription(parcelasDatas: any): string {
  if (!Array.isArray(parcelasDatas) || parcelasDatas.length === 0) return "À vista";

  return parcelasDatas
    .map((p: any) => {
      const valor = formatBRL(p.valor);
      const data = p.data ? new Date(p.data).toLocaleDateString("pt-BR") : "";
      return `${p.label || "Parcela"}: ${valor}${data ? ` em ${data}` : ""}`;
    })
    .join(" | ");
}

export function substituteContractVariables(text: string, data: {
  loja: any;
  cliente: any;
  contrato: any;
  ambientes: any[];
  orcamentos?: any[];
}) {
  const { loja, cliente, contrato, ambientes, orcamentos } = data;
  const now = new Date();
  
  const parcelasDatas = contrato?.parcelas_datas || orcamentos?.[0]?.parcelas_datas;
  
  const formatDate = (date: any) => {
    if (!date) return '—';
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR');
  };

  const replacements: Record<string, string> = {
    '{{empresa.razao_social}}': loja?.nome || '—',
    '{{empresa.cnpj}}': loja?.cnpj || '—',
    '{{empresa.endereco}}': loja?.endereco || '—',
    '{{empresa.cidade}}': loja?.cidade || '—',
    '{{empresa.estado}}': loja?.estado || '—',
    '{{cliente.nome}}': cliente?.nome || contrato?.cliente_nome || '—',
    '{{cliente.email}}': cliente?.email || '—',
    '{{cliente.telefone}}': cliente?.telefone || contrato?.cliente_contato || '—',
    '{{contrato.valor_total}}': formatBRL(contrato?.valor_venda || contrato?.valor_negociado || orcamentos?.[0]?.valor_negociado),
    '{{contrato.parcelas}}': generateParcelasDescription(parcelasDatas),
    '{{contrato.ambientes}}': ambientes?.map((a: any) => a.nome).join(', ') || orcamentos?.map(o => o.nome).join(', ') || '—',
    '{{assinatura.nome}}': contrato?.assinatura_nome || '—',
    '{{assinatura.data}}': formatDate(contrato?.data_assinatura),
    '{{assinatura.ip}}': contrato?.assinatura_ip || '—',
    '{{assinatura.hash}}': contrato?.assinatura_hash || '—',
    '{{DIA}}': String(now.getDate()).padStart(2, '0'),
    '{{MES}}': String(now.getMonth() + 1).padStart(2, '0'),
    '{{ANO}}': String(now.getFullYear()),
  };

  let result = text;
  for (const [key, value] of Object.entries(replacements)) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escapedKey, 'g'), value);
  }
  return result;
}


