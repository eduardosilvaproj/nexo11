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
  
  // Se parcelas_datas não estiver no contrato, tenta pegar do primeiro orçamento
  const parcelasDatas = contrato?.parcelas_datas || orcamentos?.[0]?.parcelas_datas;
  
  const replacements: Record<string, string> = {
    '{{empresa.razao_social}}': loja?.nome || '',
    '{{empresa.cnpj}}': loja?.cnpj || '',
    '{{empresa.endereco}}': loja?.endereco || '',
    '{{empresa.cidade}}': loja?.cidade || '',
    '{{cliente.nome}}': cliente?.nome || contrato?.cliente_nome || '',
    '{{cliente.email}}': cliente?.email || '',
    '{{cliente.telefone}}': cliente?.telefone || contrato?.cliente_contato || '',
    '{{contrato.valor_total}}': formatBRL(contrato?.valor_venda),
    '{{contrato.parcelas_description}}': generateParcelasDescription(parcelasDatas),
    '{{contrato.parcelas_descricao}}': generateParcelasDescription(parcelasDatas), // Both versions just in case
    '{{contrato.ambientes}}': ambientes?.map((a: any) => a.nome).join(', ') || '',
    '{{DIA}}': String(now.getDate()).padStart(2, '0'),
    '{{MES}}': String(now.getMonth() + 1).padStart(2, '0'),
    '{{ANO}}': String(now.getFullYear()),
  };

  let result = text;
  for (const [key, value] of Object.entries(replacements)) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escapedKey, 'g'), value || '');
  }
  return result;
}

