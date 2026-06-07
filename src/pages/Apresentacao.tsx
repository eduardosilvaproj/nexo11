import { Helmet } from "react-helmet-async";
import { NavBar } from "@/components/apresentacao/NavBar";
import { Hero } from "@/components/apresentacao/Hero";
import { FluxoOperacional } from "@/components/apresentacao/FluxoOperacional";
import { InformacaoIsolada } from "@/components/apresentacao/InformacaoIsolada";
import { EcossistemaNexo } from "@/components/apresentacao/EcossistemaNexo";
import { TransformacaoSection } from "@/components/apresentacao/TransformacaoSection";
import { ArquiteturaPlataforma } from "@/components/apresentacao/ArquiteturaPlataforma";
import { PlataformaGestores } from "@/components/apresentacao/PlataformaGestores";
import { VisaoAnalitica } from "@/components/apresentacao/VisaoAnalitica";
import { EncerramentoInstitucional } from "@/components/apresentacao/EncerramentoInstitucional";
import { Footer } from "@/components/apresentacao/Footer";

const Apresentacao = () => {
  const url = "https://nexusplanejados.com.br";

  return (
    <div className="min-h-screen bg-[#060d1a] text-white relative overflow-x-hidden font-sans antialiased">
      <Helmet>
        <html lang="pt-BR" />
        <title>NEXUS PLANEJADOS — Plataforma para Móveis Sob Medida</title>
        <meta
          name="description"
          content="NEXUS PLANEJADOS é a plataforma completa para lojas de móveis planejados. Do primeiro contato comercial ao pós-venda, todos os processos integrados em uma única plataforma."
        />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={url} />
        <meta property="og:title" content="NEXUS PLANEJADOS — Plataforma para Móveis Sob Medida" />
        <meta
          property="og:description"
          content="Plataforma completa para lojas de móveis planejados. Do primeiro contato ao pós-venda."
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="theme-color" content="#060d1a" />
      </Helmet>

      <div className="fixed inset-0 pointer-events-none opacity-60">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#00AAFF]/10 blur-[160px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-[#2DD4BF]/10 blur-[160px] rounded-full" />
      </div>

      <div className="relative z-10">
        <NavBar />
        <main>
          <Hero />
          <FluxoOperacional />
          <InformacaoIsolada />
          <EcossistemaNexo />
          <TransformacaoSection />
          <ArquiteturaPlataforma />
          <PlataformaGestores />
          <VisaoAnalitica />
          <EncerramentoInstitucional />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Apresentacao;
