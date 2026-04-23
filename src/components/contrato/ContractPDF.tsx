import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { substituteContractVariables } from '@/lib/contract-utils';


// Register a font for better appearance
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontFamily: 'Roboto',
    fontSize: 10,
    color: '#333',
    lineHeight: 1.5,
  },
  header: {
    marginBottom: 30,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 10,
    fontWeight: 'medium',
    color: '#666',
  },
  preamble: {
    marginBottom: 20,
    textAlign: 'justify',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8,
    textTransform: 'uppercase',
    borderBottomWidth: 0.5,
    borderBottomColor: '#EEE',
    paddingBottom: 2,
  },
  clause: {
    marginBottom: 10,
    textAlign: 'justify',
  },
  clauseTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  clauseContent: {
    fontSize: 9,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: 120,
    fontWeight: 'bold',
    fontSize: 9,
  },
  value: {
    flex: 1,
    fontSize: 9,
  },
  summaryTable: {
    marginTop: 20,
    borderWidth: 0.5,
    borderColor: '#333',
  },
  summaryHeader: {
    backgroundColor: '#F3F4F6',
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#333',
    padding: 5,
    fontWeight: 'bold',
  },
  summaryRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#EEE',
    paddingVertical: 4,
    paddingHorizontal: 6,
    minHeight: 18,
    alignItems: 'flex-start',
  },
  colLabel: { 
    width: '30%', 
    fontSize: 9, 
    fontWeight: 'bold',
    paddingRight: 10 
  },
  colValue: { 
    width: '70%', 
    fontSize: 8, 
    fontWeight: 'medium',
  },
  signatureSection: {
    marginTop: 40,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  signatureBlock: {
    width: '45%',
    marginTop: 30,
    alignItems: 'center',
  },
  signatureLine: {
    width: '100%',
    borderTopWidth: 0.5,
    borderTopColor: '#333',
    marginBottom: 5,
  },
  signatureText: {
    fontSize: 8,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    fontSize: 8,
    textAlign: 'center',
    color: '#999',
    borderTopWidth: 0.5,
    borderTopColor: '#EEE',
    paddingTop: 10,
  },
});

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

interface ContractPDFProps {
  contrato: any;
  loja: any;
  ambientes: any[];
  orcamentos?: any[];
}

export const ContractPDF = ({ contrato, loja, ambientes, orcamentos }: ContractPDFProps) => {
  const cliente = contrato.cliente;
  
  const getParcelasDesc = () => {
    const p = contrato.parcelas_datas || orcamentos?.[0]?.parcelas_datas;
    if (!Array.isArray(p)) return "A definir";
    return p.map((item: any) => `${item.label || 'Parcela'}: ${formatCurrency(item.valor)} (${new Date(item.data).toLocaleDateString('pt-BR')})`).join(', ');
  };

  const ambientesNomes = ambientes?.map(a => a.nome).join(', ') || orcamentos?.map(o => o.nome).join(', ') || '—';
  const clienteDocumento = cliente?.cpf || cliente?.cnpj || '—';
  const clienteEndereco = cliente?.endereco ? `${cliente.endereco}, ${cliente.cidade || ''} - ${cliente.estado || ''}` : '—';
  const clienteContato = cliente?.telefone || cliente?.celular || contrato.cliente_contato || '—';
  const clienteEmail = cliente?.email || orcamentos?.[0]?.cliente_email || '—';

  const getDynamicStyles = (text: string) => {
    const len = text?.length || 0;
    if (len > 250) return { fontSize: 6, paddingVertical: 1.5, minHeight: 12 };
    if (len > 180) return { fontSize: 6.5, paddingVertical: 2, minHeight: 14 };
    if (len > 120) return { fontSize: 7, paddingVertical: 3, minHeight: 16 };
    return { fontSize: 8, paddingVertical: 4, minHeight: 18 };
  };

  const contratanteStyles = getDynamicStyles(contrato.cliente_nome || '');
  const ambientesStyles = getDynamicStyles(ambientesNomes);
  const parcelasStyles = getDynamicStyles(getParcelasDesc());


  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>CONTRATO DE PRESTAÇÃO DE SERVIÇOS E FORNECIMENTO DE MÓVEIS PLANEJADOS SOB MEDIDA</Text>
          <Text style={styles.subtitle}>CONTRATO Nº: {contrato.id?.slice(0, 8).toUpperCase()}</Text>
        </View>

        {/* Preambulo */}
        <View style={styles.preamble}>
          <Text style={{ fontSize: 9 }}>
            Pelo presente instrumento particular, de um lado, <Text style={{ fontWeight: 'bold' }}>{loja?.nome || 'DIAS & DIAS'}</Text>, 
            inscrita no CNPJ sob o nº {loja?.cnpj || '—'}, com sede em {loja?.endereco || '—'}, {loja?.cidade || '—'}/{loja?.estado || '—'}, 
            doravante denominada CONTRATADA; e de outro lado, <Text style={{ fontWeight: 'bold' }}>{contrato.cliente_nome || '—'}</Text>, 
            inscrito(a) no CPF/CNPJ sob o nº {clienteDocumento}, residente e domiciliado(a) em {clienteEndereco}, 
            telefone {clienteContato}, e-mail {clienteEmail}, doravante denominado(a) CONTRATANTE, 
            têm entre si justo e contratado o que segue:
          </Text>
        </View>


        {/* Clauses */}
        <View>
          <Text style={styles.clauseTitle}>CLÁUSULA PRIMEIRA - DO OBJETO</Text>
          <Text style={styles.clauseContent}>
            O presente contrato tem por objeto a prestação de serviços de projeto, fabricação e instalação de móveis planejados sob medida, conforme descritivo técnico e orçamentos aprovados para os ambientes: {ambientesNomes}.
          </Text>

          <Text style={[styles.clauseTitle, { marginTop: 10 }]}>CLÁUSULA SEGUNDA - DA NATUREZA DA RELAÇÃO JURÍDICA</Text>
          <Text style={styles.clauseContent}>
            As partes declaram que a relação estabelecida é de prestação de serviços e fornecimento de produtos, regida pelo Código de Defesa do Consumidor.
          </Text>

          <Text style={[styles.clauseTitle, { marginTop: 10 }]}>CLÁUSULA TERCEIRA - DA MEDIÇÃO, DO PROJETO TÉCNICO E DA APROVAÇÃO</Text>
          <Text style={styles.clauseContent}>
            A CONTRATADA realizará a medição técnica no local após a assinatura deste contrato. O projeto final será apresentado ao CONTRATANTE para aprovação definitiva antes do início da produção.
          </Text>

          <Text style={[styles.clauseTitle, { marginTop: 10 }]}>CLÁUSULA QUARTA - DAS OBRIGAÇÕES DO CONTRATANTE</Text>
          <Text style={styles.clauseContent}>
            O CONTRATANTE obriga-se a disponibilizar o local livre e desembaraçado para medição e instalação, bem como realizar os pagamentos nos prazos acordados.
          </Text>

          <Text style={[styles.clauseTitle, { marginTop: 10 }]}>CLÁUSULA QUINTA - DOS PRAZOS DE EXECUÇÃO</Text>
          <Text style={styles.clauseContent}>
            O prazo para entrega e montagem dos móveis é de 45 (quarenta e cinco) dias corridos, contados a partir da aprovação final do projeto técnico e liberação financeira.
          </Text>

          <Text style={[styles.clauseTitle, { marginTop: 10 }]}>CLÁUSULA SEXTA - DAS TOLERÂNCIAS TÉCNICAS</Text>
          <Text style={styles.clauseContent}>
            Ficam estabelecidas as tolerâncias técnicas de fabricação e instalação conforme normas da ABNT aplicáveis ao setor moveleiro.
          </Text>

          <Text style={[styles.clauseTitle, { marginTop: 10 }]}>CLÁUSULA SÉTIMA - DO PREÇO E DO PAGAMENTO</Text>
          <Text style={styles.clauseContent}>
            Pelo objeto deste contrato, o CONTRATANTE pagará o valor total de {formatCurrency(contrato.valor_venda)}, sendo parcelado da seguinte forma: {getParcelasDesc()}.
          </Text>

          <Text style={[styles.clauseTitle, { marginTop: 10 }]}>CLÁUSULA OITAVA - DAS GARANTIAS</Text>
          <Text style={styles.clauseContent}>
            A CONTRATADA oferece garantia legal de 90 (noventa) dias acrescida de garantia contratual de 3 (três) anos contra defeitos de fabricação, totalizando a proteção ao consumidor.
          </Text>

          <Text style={[styles.clauseTitle, { marginTop: 10 }]}>CLÁUSULA NONA - DA ENTREGA E DA INSTALAÇÃO</Text>
          <Text style={styles.clauseContent}>
            A entrega e instalação serão realizadas em horário comercial, devendo haver responsável no local para acompanhamento e assinatura do termo de aceite.
          </Text>

          <Text style={[styles.clauseTitle, { marginTop: 10 }]}>CLÁUSULA DÉCIMA - DA RESCISÃO E DAS PENALIDADES</Text>
          <Text style={styles.clauseContent}>
            Em caso de rescisão imotivada por parte do CONTRATANTE após o início da produção, será aplicada multa de 30% (trinta por cento) sobre o valor total do contrato.
          </Text>

          <Text style={[styles.clauseTitle, { marginTop: 10 }]}>CLÁUSULA DÉCIMA PRIMEIRA - DAS ALTERAÇÕES DO PROJETO</Text>
          <Text style={styles.clauseContent}>
            Alterações solicitadas após a aprovação técnica poderão gerar custos adicionais e dilação do prazo de entrega.
          </Text>

          <Text style={[styles.clauseTitle, { marginTop: 10 }]}>CLÁUSULA DÉCIMA SEGUNDA - DA PROPRIEDADE INTELECTUAL</Text>
          <Text style={styles.clauseContent}>
            Os projetos elaborados pela CONTRATADA são de sua propriedade intelectual exclusiva, vedada a reprodução total ou parcial sem autorização.
          </Text>

          <Text style={[styles.clauseTitle, { marginTop: 10 }]}>CLÁUSULA DÉCIMA TERCEIRA - DA VISTORIA E ACEITE</Text>
          <Text style={styles.clauseContent}>
            Após a finalização da montagem, as partes realizarão a vistoria final, formalizada pelo Termo de Entrega e Aceite.
          </Text>

          <Text style={[styles.clauseTitle, { marginTop: 10 }]}>CLÁUSULA DÉCIMA QUARTA - DOS DOCUMENTOS INTEGRANTES</Text>
          <Text style={styles.clauseContent}>
            Integram este contrato o orçamento aprovado, o projeto técnico e os memoriais descritivos dos materiais.
          </Text>

          <Text style={[styles.clauseTitle, { marginTop: 10 }]}>CLÁUSULA DÉCIMA QUINTA - DO TRATAMENTO DE DADOS (LGPD)</Text>
          <Text style={styles.clauseContent}>
            As partes comprometem-se a tratar os dados pessoais envolvidos nesta relação conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
          </Text>

          <Text style={[styles.clauseTitle, { marginTop: 10 }]}>CLÁUSULA DÉCIMA SEXTA - DAS COMUNICAÇÕES</Text>
          <Text style={styles.clauseContent}>
            As comunicações oficiais serão realizadas através dos endereços de e-mail e telefones indicados no preâmbulo.
          </Text>

          <Text style={[styles.clauseTitle, { marginTop: 10 }]}>CLÁUSULA DÉCIMA SÉTIMA - DA ASSINATURA ELETRÔNICA</Text>
          <Text style={styles.clauseContent}>
            Este contrato poderá ser assinado eletronicamente, possuindo plena validade jurídica conforme MP nº 2.200-2/2001.
          </Text>

          <Text style={[styles.clauseTitle, { marginTop: 10 }]}>CLÁUSULA DÉCIMA OITAVA - DAS CONDIÇÕES GERAIS</Text>
          <Text style={styles.clauseContent}>
            Eventuais tolerâncias de uma parte com relação a infrações contratuais da outra não constituirão novação ou renúncia a direitos.
          </Text>

          <Text style={[styles.clauseTitle, { marginTop: 10 }]}>CLÁUSULA DÉCIMA NONA - DO FORO</Text>
          <Text style={styles.clauseContent}>
            Fica eleito o Foro da Comarca de {loja?.cidade || '—'}/{loja?.estado || '—'} para dirimir quaisquer dúvidas oriundas deste instrumento.
          </Text>
        </View>

        {/* Footer info */}
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 9, textAlign: 'right' }}>
            {loja?.cidade || '—'}, {new Date().toLocaleDateString('pt-BR')}
          </Text>
        </View>

        {/* Signature Blocks */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureText}>CONTRATADA</Text>
            <Text style={[styles.signatureText, { fontWeight: 'bold' }]}>{loja?.nome || 'DIAS & DIAS'}</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureText}>CONTRATANTE</Text>
            <Text style={[styles.signatureText, { fontWeight: 'bold' }]}>{contrato.cliente_nome}</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureText}>Testemunha 1</Text>
            <Text style={styles.signatureText}>CPF:</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureText}>Testemunha 2</Text>
            <Text style={styles.signatureText}>CPF:</Text>
          </View>
        </View>

        {/* Page Break for Summary */}
        <View break />

        {/* Quadro Resumo */}
        <View style={styles.header}>
          <Text style={styles.title}>QUADRO RESUMO DO CONTRATO</Text>
        </View>

        <View style={styles.summaryTable}>
          <View style={[styles.summaryRow, { minHeight: contratanteStyles.minHeight, paddingVertical: contratanteStyles.paddingVertical }]}>
            <Text style={styles.colLabel}>Contratante:</Text>
            <Text style={[styles.colValue, { fontSize: contratanteStyles.fontSize }]}>{contrato.cliente_nome}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.colLabel}>CPF/CNPJ:</Text>
            <Text style={styles.colValue}>{clienteDocumento}</Text>
          </View>

          <View style={[styles.summaryRow, { minHeight: ambientesStyles.minHeight, paddingVertical: ambientesStyles.paddingVertical }]}>
            <Text style={styles.colLabel}>Ambientes:</Text>
            <Text style={[styles.colValue, { fontSize: ambientesStyles.fontSize }]}>
              {ambientesNomes}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.colLabel}>Valor Total:</Text>
            <Text style={styles.colValue}>{formatCurrency(contrato.valor_venda)}</Text>
          </View>
          <View style={[styles.summaryRow, { minHeight: parcelasStyles.minHeight, paddingVertical: parcelasStyles.paddingVertical }]}>
            <Text style={styles.colLabel}>Pagamento:</Text>
            <Text style={[styles.colValue, { fontSize: parcelasStyles.fontSize }]}>
              {getParcelasDesc()}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.colLabel}>Prazo:</Text>
            <Text style={styles.colValue}>45 dias corridos após aprovação técnica e liberação financeira</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.colLabel, { borderBottomWidth: 0 }]}>Garantia:</Text>
            <Text style={[styles.colValue, { borderBottomWidth: 0 }]}>90 dias legal + 3 anos contratual contra defeitos de fabricação</Text>
          </View>
        </View>

        {/* Signature Stamp if signed */}
        {contrato.assinado && (
          <View style={{ marginTop: 30, padding: 10, border: '1pt solid #05873C', borderRadius: 4, backgroundColor: '#F0FDF4' }}>
            <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#05873C', textAlign: 'center' }}>ASSINADO ELETRONICAMENTE</Text>
            <Text style={{ fontSize: 8, color: '#333', marginTop: 5 }}>Signatário: {contrato.assinatura_nome}</Text>
            <Text style={{ fontSize: 8, color: '#333' }}>Data: {new Date(contrato.data_assinatura).toLocaleString('pt-BR')}</Text>
            <Text style={{ fontSize: 8, color: '#333' }}>IP: {contrato.assinatura_ip}</Text>
            <Text style={{ fontSize: 8, color: '#333' }}>Hash: {contrato.assinatura_hash}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          Documento gerado pelo Sistema NEXO em {new Date().toLocaleString('pt-BR')}
        </Text>
      </Page>
    </Document>
  );
};


