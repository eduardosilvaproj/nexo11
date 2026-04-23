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
    padding: 40,
    fontFamily: 'Roboto',
    fontSize: 10,
    color: '#333',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0D1117',
  },
  storeInfo: {
    fontSize: 9,
    textAlign: 'right',
    color: '#666',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
    backgroundColor: '#F3F4F6',
    padding: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  label: {
    width: 100,
    fontWeight: 'bold',
  },
  value: {
    flex: 1,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 3,
    fontWeight: 'bold',
    backgroundColor: '#FAFAFA',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingVertical: 5,
  },
  col1: { width: '60%' },
  col2: { width: '20%', textAlign: 'right' },
  col3: { width: '20%', textAlign: 'right' },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingTop: 10,
    fontSize: 8,
    textAlign: 'center',
    color: '#999',
  },
  totals: {
    marginTop: 20,
    alignSelf: 'flex-end',
    width: 150,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  grandTotal: {
    borderTopWidth: 1,
    borderTopColor: '#000',
    marginTop: 5,
    paddingTop: 5,
    fontWeight: 'bold',
    fontSize: 12,
  },
  signatureStamp: {
    marginTop: 30,
    padding: 15,
    borderWidth: 1,
    borderColor: '#05873C',
    borderRadius: 8,
    width: '100%',
    backgroundColor: '#F0FDF4',
  },
  signatureStampText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#05873C',
    marginBottom: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  signatureStampGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  signatureStampItem: {
    width: '48%',
    marginBottom: 4,
  },
  signatureStampLabel: {
    fontSize: 7,
    color: '#666',
    marginBottom: 2,
  },
  signatureStampValue: {
    fontSize: 8,
    color: '#333',
    fontWeight: 'medium',
  },
  signatureStampFooter: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#05873C',
    fontSize: 7,
    color: '#05873C',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const formatDateTime = (date: any) => {
  if (!date) return '—';
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

interface ContractPDFProps {
  contrato: any;
  loja: any;
  ambientes: any[];
  orcamentos?: any[];
}

export const ContractPDF = ({ contrato, loja, ambientes, orcamentos }: ContractPDFProps) => {
  const termsText = loja?.contrato_modelo 
    ? substituteContractVariables(loja.contrato_modelo, { loja, cliente: null, contrato, ambientes, orcamentos })
    : "";

  return (

  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</Text>
          <Text style={{ color: '#666' }}>ID: {contrato.id?.slice(0, 8).toUpperCase()}</Text>
        </View>
        <View style={styles.storeInfo}>
          <Text style={{ fontWeight: 'bold' }}>{loja?.nome || '—'}</Text>
          <Text>{loja?.cidade || '—'} - {loja?.estado || '—'}</Text>
          {loja?.cnpj && <Text>CNPJ: {loja.cnpj}</Text>}
        </View>
      </View>

      {/* Customer Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DADOS DO CLIENTE</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Nome:</Text>
          <Text style={styles.value}>{contrato.cliente_nome || '—'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Contato:</Text>
          <Text style={styles.value}>{contrato.cliente_contato || '—'}</Text>
        </View>
      </View>

      {/* Contract Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DETALHES DO CONTRATO</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Data:</Text>
          <Text style={styles.value}>{contrato.created_at ? new Date(contrato.created_at).toLocaleDateString('pt-BR') : '—'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Status:</Text>
          <Text style={styles.value}>{(contrato.status || 'Pendente').toUpperCase()}</Text>
        </View>
      </View>

      {/* Environments / Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AMBIENTES E SERVIÇOS</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Descrição</Text>
            <Text style={styles.col2}>Status</Text>
            <Text style={styles.col3}>Valor</Text>
          </View>
          {ambientes && ambientes.length > 0 ? ambientes.map((amb, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.col1}>{amb.nome || '—'}</Text>
              <Text style={styles.col2}>{amb.status_montagem || 'Pendente'}</Text>
              <Text style={styles.col3}>{formatCurrency(amb.valor_liquido || 0)}</Text>
            </View>
          )) : (
            <View style={styles.tableRow}>
              <Text style={styles.col1}>Nenhum ambiente registrado</Text>
              <Text style={styles.col2}>—</Text>
              <Text style={styles.col3}>{formatCurrency(0)}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Totals */}
      <View style={styles.totals}>
        <View style={styles.totalRow}>
          <Text>Subtotal:</Text>
          <Text>{formatCurrency(contrato.valor_venda)}</Text>
        </View>
        <View style={[styles.totalRow, styles.grandTotal]}>
          <Text>TOTAL:</Text>
          <Text>{formatCurrency(contrato.valor_venda)}</Text>
        </View>
      </View>

      {/* Custom Terms from Loja Template */}
      {termsText ? (
        <View style={[styles.section, { marginTop: 30, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 20 }]}>
          <Text style={styles.sectionTitle}>TERMOS E CONDIÇÕES</Text>
          <Text style={{ fontSize: 9, lineHeight: 1.4, textAlign: 'justify' }}>
            {termsText}
          </Text>
        </View>
      ) : null}

      {/* Signature Stamp */}
      {contrato.assinado && (
        <View style={styles.signatureStamp}>
          <Text style={styles.signatureStampText}>
            Documento Assinado Eletronicamente
          </Text>
          <View style={styles.signatureStampGrid}>
            <View style={styles.signatureStampItem}>
              <Text style={styles.signatureStampLabel}>Signatário</Text>
              <Text style={styles.signatureStampValue}>{contrato.assinatura_nome || "—"}</Text>
            </View>
            <View style={styles.signatureStampItem}>
              <Text style={styles.signatureStampLabel}>Data e Hora</Text>
              <Text style={styles.signatureStampValue}>{formatDateTime(contrato.data_assinatura)}</Text>
            </View>
            <View style={styles.signatureStampItem}>
              <Text style={styles.signatureStampLabel}>IP de Origem</Text>
              <Text style={styles.signatureStampValue}>{contrato.assinatura_ip || "—"}</Text>
            </View>
            <View style={styles.signatureStampItem}>
              <Text style={styles.signatureStampLabel}>Hash de Verificação</Text>
              <Text style={styles.signatureStampValue}>{contrato.assinatura_hash || "—"}</Text>
            </View>
          </View>
          <Text style={styles.signatureStampFooter}>
            A autenticidade deste documento pode ser validada através do hash de verificação.
            Validade jurídica conforme Medida Provisória nº 2.200-2/2001.
          </Text>
        </View>
      )}

      {/* Footer */}
      <Text style={styles.footer}>
        Este documento é um resumo do contrato. Para mais detalhes, consulte o portal do cliente.
        {"\n"}Gerado em {new Date().toLocaleString('pt-BR')}
      </Text>
    </Page>
  </Document>
);
}

