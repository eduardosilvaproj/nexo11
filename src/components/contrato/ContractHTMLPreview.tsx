import React from "react";
import { generateParcelasDescription } from "@/lib/contract-utils";

interface ContractHTMLPreviewProps {
  contrato: any;
  loja: any;
  ambientes: any[];
  orcamentos?: any[];
}

export const ContractHTMLPreview = ({
  contrato,
  loja,
  ambientes,
  orcamentos,
}: ContractHTMLPreviewProps) => {
  const cliente = contrato.cliente;
  const ambientesNomes =
    ambientes?.map((a) => a.nome).join(", ") ||
    orcamentos?.map((o) => o.nome).join(", ") ||
    "—";
  const clienteDocumento = cliente?.cpf || cliente?.cnpj || "—";
  const clienteEndereco = cliente?.endereco
    ? `${cliente.endereco}, ${cliente.cidade || ""} - ${cliente.estado || ""}`
    : "—";
  const clienteContato =
    cliente?.telefone || cliente?.celular || contrato.cliente_contato || "—";
  const clienteEmail = cliente?.email || orcamentos?.[0]?.cliente_email || "—";

  const parcelasDatas = contrato.parcelas_datas || orcamentos?.[0]?.parcelas_datas;
  const valorTotal = contrato.valor_venda || contrato.valor_negociado || orcamentos?.[0]?.valor_negociado || 0;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val || 0);

  const parcelasDesc = generateParcelasDescription(parcelasDatas);

  return (
    <div className="bg-white p-[20mm] text-[#333] font-serif text-[12pt] leading-[1.6] printable-content min-h-[297mm]">
      {/* Header */}
      <div className="text-center border-b-2 border-[#333] pb-6 mb-10">
        <h1 className="text-xl font-bold uppercase mb-2">
          CONTRATO DE PRESTAÇÃO DE SERVIÇOS E FORNECIMENTO DE MÓVEIS PLANEJADOS SOB MEDIDA
        </h1>
        <p className="text-sm text-gray-600 font-sans tracking-widest">
          CONTRATO Nº: {contrato.id?.slice(0, 8).toUpperCase()}
        </p>
      </div>

      {/* Preamble */}
      <div className="mb-8 text-justify">
        <p>
          Pelo presente instrumento particular, de um lado,{" "}
          <span className="font-bold">{loja?.nome || "DIAS & DIAS"}</span>,
          inscrita no CNPJ sob o nº {loja?.cnpj || "—"}, com sede em{" "}
          {loja?.endereco || "—"}, {loja?.cidade || "—"}/{loja?.estado || "—"},
          doravante denominada CONTRATADA; e de outro lado,{" "}
          <span className="font-bold">{contrato.cliente_nome || "—"}</span>,
          inscrito(a) no CPF/CNPJ sob o nº {clienteDocumento}, residente e
          domiciliado(a) em {clienteEndereco}, telefone {clienteContato}, e-mail{" "}
          {clienteEmail}, doravante denominado(a) CONTRATANTE, têm entre si justo e
          contratado o que segue:
        </p>
      </div>

      {/* Clauses */}
      <div className="space-y-6">
        <section>
          <h2 className="font-bold uppercase mb-2">CLÁUSULA PRIMEIRA - DO OBJETO</h2>
          <p className="text-justify">
            O presente contrato tem por objeto a prestação de serviços de projeto,
            fabricação e instalação de móveis planejados sob medida, conforme descritivo
            técnico e orçamentos aprovados para os ambientes: {ambientesNomes}.
          </p>
        </section>

        <section>
          <h2 className="font-bold uppercase mb-2">
            CLÁUSULA SEGUNDA - DA NATUREZA DA RELAÇÃO JURÍDICA
          </h2>
          <p className="text-justify">
            As partes declaram que a relação estabelecida é de prestação de serviços e
            fornecimento de produtos, regida pelo Código de Defesa do Consumidor.
          </p>
        </section>

        <section>
          <h2 className="font-bold uppercase mb-2">
            CLÁUSULA TERCEIRA - DA MEDIÇÃO, DO PROJETO TÉCNICO E DA APROVAÇÃO
          </h2>
          <p className="text-justify">
            A CONTRATADA realizará a medição técnica no local após a assinatura deste
            contrato. O projeto final será apresentado ao CONTRATANTE para aprovação
            definitiva antes do início da produção.
          </p>
        </section>

        <section>
          <h2 className="font-bold uppercase mb-2">
            CLÁUSULA QUARTA - DAS OBRIGAÇÕES DO CONTRATANTE
          </h2>
          <p className="text-justify">
            O CONTRATANTE obriga-se a disponibilizar o local livre e desembaraçado para
            medição e instalação, bem como realizar os pagamentos nos prazos acordados.
          </p>
        </section>

        <section>
          <h2 className="font-bold uppercase mb-2">CLÁUSULA QUINTA - DOS PRAZOS DE EXECUÇÃO</h2>
          <p className="text-justify">
            O prazo para entrega e montagem dos móveis é de 45 (quarenta e cinco) dias
            corridos, contados a partir da aprovação final do projeto técnico e liberação
            financeira.
          </p>
        </section>

        <section>
          <h2 className="font-bold uppercase mb-2">CLÁUSULA SEXTA - DAS TOLERÂNCIAS TÉCNICAS</h2>
          <p className="text-justify">
            Ficam estabelecidas as tolerâncias técnicas de fabricação e instalação
            conforme normas da ABNT aplicáveis ao setor moveleiro.
          </p>
        </section>

        <section>
          <h2 className="font-bold uppercase mb-2">CLÁUSULA SÉTIMA - DO PREÇO E DO PAGAMENTO</h2>
          <p className="text-justify">
            Pelo objeto deste contrato, o CONTRATANTE pagará o valor total de{" "}
            {formatCurrency(valorTotal)}, sendo parcelado da seguinte forma: {parcelasDesc}.
          </p>
        </section>

        <section>
          <h2 className="font-bold uppercase mb-2">CLÁUSULA OITAVA - DAS GARANTIAS</h2>
          <p className="text-justify">
            A CONTRATADA oferece garantia legal de 90 (noventa) dias acrescida de garantia
            contratual de 3 (três) anos contra defeitos de fabricação, totalizando a
            proteção ao consumidor.
          </p>
        </section>

        <section>
          <h2 className="font-bold uppercase mb-2">
            CLÁUSULA NONA - DA ENTREGA E DA INSTALAÇÃO
          </h2>
          <p className="text-justify">
            A entrega e instalação serão realizadas em horário comercial, devendo haver
            responsável no local para acompanhamento e assinatura do termo de aceite.
          </p>
        </section>

        <section>
          <h2 className="font-bold uppercase mb-2">
            CLÁUSULA DÉCIMA - DA RESCISÃO E DAS PENALIDADES
          </h2>
          <p className="text-justify">
            Em caso de rescisão imotivada por parte do CONTRATANTE após o início da
            produção, será aplicada multa de 30% (trinta por cento) sobre o valor total do
            contrato.
          </p>
        </section>

        <section>
          <h2 className="font-bold uppercase mb-2">
            CLÁUSULA DÉCIMA PRIMEIRA - DAS ALTERAÇÕES DO PROJETO
          </h2>
          <p className="text-justify">
            Alterações solicitadas após a aprovação técnica poderão gerar custos
            adicionais e dilação do prazo de entrega.
          </p>
        </section>

        <section>
          <h2 className="font-bold uppercase mb-2">
            CLÁUSULA DÉCIMA SEGUNDA - DA PROPRIEDADE INTELECTUAL
          </h2>
          <p className="text-justify">
            Os projetos elaborados pela CONTRATADA são de sua propriedade intelectual
            exclusiva, vedada a reprodução total ou parcial sem autorização.
          </p>
        </section>

        <section>
          <h2 className="font-bold uppercase mb-2">
            CLÁUSULA DÉCIMA TERCEIRA - DA VISTORIA E ACEITE
          </h2>
          <p className="text-justify">
            Após a finalização da montagem, as partes realizarão a vistoria final,
            formalizada pelo Termo de Entrega e Aceite.
          </p>
        </section>

        <section>
          <h2 className="font-bold uppercase mb-2">
            CLÁUSULA DÉCIMA QUARTA - DOS DOCUMENTOS INTEGRANTES
          </h2>
          <p className="text-justify">
            Integram este contrato o orçamento aprovado, o projeto técnico e os memoriais
            descritivos dos materiais.
          </p>
        </section>

        <section>
          <h2 className="font-bold uppercase mb-2">
            CLÁUSULA DÉCIMA QUINTA - DO TRATAMENTO DE DADOS (LGPD)
          </h2>
          <p className="text-justify">
            As partes comprometem-se a tratar os dados pessoais envolvidos nesta relação
            conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
          </p>
        </section>

        <section>
          <h2 className="font-bold uppercase mb-2">CLÁUSULA DÉCIMA SEXTA - DAS COMUNICAÇÕES</h2>
          <p className="text-justify">
            As comunicações oficiais serão realizadas através dos endereços de e-mail e
            telefones indicados no preâmbulo.
          </p>
        </section>

        <section>
          <h2 className="font-bold uppercase mb-2">
            CLÁUSULA DÉCIMA SÉTIMA - DA ASSINATURA ELETRÔNICA
          </h2>
          <p className="text-justify">
            Este contrato poderá ser assinado eletronicamente, possuindo plena validade
            jurídica conforme MP nº 2.200-2/2001.
          </p>
        </section>

        <section>
          <h2 className="font-bold uppercase mb-2">
            CLÁUSULA DÉCIMA OITAVA - DAS CONDIÇÕES GERAIS
          </h2>
          <p className="text-justify">
            Eventuais tolerâncias de uma parte com relação a infrações contratuais da outra
            não constituirão novação ou renúncia a direitos.
          </p>
        </section>

        <section>
          <h2 className="font-bold uppercase mb-2">CLÁUSULA DÉCIMA NONA - DO FORO</h2>
          <p className="text-justify">
            Fica eleito o Foro da Comarca de {loja?.cidade || "—"}/{loja?.estado || "—"}{" "}
            para dirimir quaisquer dúvidas oriundas deste instrumento.
          </p>
        </section>
      </div>

      {/* Date */}
      <div className="mt-16 text-right font-bold">
        <p>
          {loja?.cidade || "—"}, {new Date().toLocaleDateString("pt-BR")}
        </p>
      </div>

      {/* Signatures */}
      <div className="mt-20 grid grid-cols-2 gap-x-12 gap-y-16">
        <div className="text-center">
          <div className="border-t border-[#333] pt-3">
            <p className="text-xs uppercase font-sans mb-1">CONTRATADA</p>
            <p className="font-bold text-sm">{loja?.nome || "DIAS & DIAS"}</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-[#333] pt-3">
            <p className="text-xs uppercase font-sans mb-1">CONTRATANTE</p>
            <p className="font-bold text-sm">{contrato.cliente_nome}</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-[#333] pt-3">
            <p className="text-xs uppercase font-sans mb-1">Testemunha 1</p>
            <p className="text-xs">CPF:</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-[#333] pt-3">
            <p className="text-xs uppercase font-sans mb-1">Testemunha 2</p>
            <p className="text-xs">CPF:</p>
          </div>
        </div>
      </div>

      {/* Quadro Resumo */}
      <div className="mt-32 pt-10 border-t-2 border-dashed border-gray-400">
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold uppercase tracking-wider">QUADRO RESUMO DO CONTRATO</h2>
        </div>

        <div className="border-2 border-[#333] overflow-hidden rounded-sm">
          {[
            { label: "Contratante", value: contrato.cliente_nome },
            { label: "CPF/CNPJ", value: clienteDocumento },
            { label: "Ambientes", value: ambientesNomes },
            { label: "Valor Total", value: formatCurrency(valorTotal) },
            { label: "Pagamento", value: parcelasDesc },
            {
              label: "Prazo",
              value: "45 dias corridos após aprovação técnica e liberação financeira",
            },
            {
              label: "Garantia",
              value: "90 dias legal + 3 anos contratual contra defeitos de fabricação",
            },
          ].map((row, idx) => (
            <div
              key={idx}
              className={`flex border-b-2 border-[#333] last:border-0 ${
                idx % 2 === 0 ? "bg-gray-50" : "bg-white"
              }`}
            >
              <div className="w-1/3 p-3 font-bold border-r-2 border-[#333] text-sm uppercase font-sans bg-gray-100">
                {row.label}:
              </div>
              <div className="w-2/3 p-3 text-sm font-medium">{row.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Signature Stamp if signed */}
      {contrato.assinado && (
        <div className="mt-16 p-6 border-4 border-green-600 rounded-lg bg-green-50 text-green-800">
          <p className="font-bold text-center text-lg mb-3">✓ DOCUMENTO ASSINADO DIGITALMENTE</p>
          <div className="grid grid-cols-2 gap-4 text-xs font-sans">
            <div>
              <p className="font-bold uppercase opacity-60">Assinado por:</p>
              <p className="font-medium text-sm">{contrato.assinatura_nome}</p>
            </div>
            <div>
              <p className="font-bold uppercase opacity-60">Data/hora:</p>
              <p className="font-medium text-sm">{new Date(contrato.data_assinatura).toLocaleString("pt-BR")}</p>
            </div>
            <div>
              <p className="font-bold uppercase opacity-60">Endereço IP:</p>
              <p className="font-medium text-sm">{contrato.assinatura_ip}</p>
            </div>
            <div>
              <p className="font-bold uppercase opacity-60">Hash de Segurança:</p>
              <p className="font-medium text-sm font-mono truncate">{contrato.assinatura_hash}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-16 text-[10px] text-gray-400 text-center italic font-sans">
        Documento gerado pelo Sistema NEXO em {new Date().toLocaleString("pt-BR")}
      </div>
    </div>
  );
};
