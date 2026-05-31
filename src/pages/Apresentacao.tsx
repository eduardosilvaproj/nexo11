import { Helmet } from "react-helmet-async";
import { NavBar } from "@/components/apresentacao/NavBar";
import { Hero } from "@/components/apresentacao/Hero";
import { FluxoOperacional } from "@/components/apresentacao/FluxoOperacional";
import { ModuloSection } from "@/components/apresentacao/ModuloSection";
import { AppFuncionarioShowcase } from "@/components/apresentacao/AppFuncionarioShowcase";
import { TecnologiaGrid } from "@/components/apresentacao/TecnologiaGrid";
import { DiferenciaisGrid } from "@/components/apresentacao/DiferenciaisGrid";
import { Footer } from "@/components/apresentacao/Footer";
import { MODULOS } from "@/components/apresentacao/data";

const Apresentacao = () => {
  const url = "https://nexo11.lovable.app/apresentacao";

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white relative overflow-x-hidden font-sans antialiased">
      <Helmet>
        <html lang="pt-BR" />
        <title>NEXO — Gestão Inteligente para Móveis Planejados</title>
        <meta
          name="description"
          content="ERP especializado em móveis planejados: do comercial à pós-venda, multi-loja, em tempo real."
        />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={url} />
        <meta property="og:title" content="NEXO — Gestão Inteligente para Móveis Planejados" />
        <meta
          property="og:description"
          content="Do comercial à pós-venda, tudo em um só lugar. ERP multi-loja em tempo real."
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="theme-color" content="#0A0E1A" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "NEXO",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            description:
              "Plataforma de gestão completa para lojas de móveis planejados. Comercial, contratos, técnico, produção, logística, montagem, pós-venda, financeiro e analytics.",
            url,
            offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
          })}
        </script>
      </Helmet>

      {/* Ambient gradients sitewide */}
      <div className="fixed inset-0 pointer-events-none opacity-60">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#1A9BE8]/8 blur-[160px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-[#22C97A]/8 blur-[160px] rounded-full" />
      </div>

      <div className="relative z-10">
        <NavBar />
        <main>
          <Hero />
          <FluxoOperacional />

          <section id="modulos" className="pt-12">
            <div className="max-w-7xl mx-auto px-6 text-center mb-8">
              <div className="text-xs font-semibold tracking-[0.3em] text-[#1A9BE8] uppercase mb-3">Módulos</div>
              <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
                Tudo que sua loja precisa
              </h2>
              <p className="text-white/60 mt-4 max-w-2xl mx-auto">
                12 módulos especializados trabalhando de forma integrada.
              </p>
            </div>
            {MODULOS.map((m, i) => (
              <ModuloSection key={m.slug} modulo={m} index={i} />
            ))}
          </section>

          <AppFuncionarioShowcase />
          <TecnologiaGrid />
          <DiferenciaisGrid />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Apresentacao;
