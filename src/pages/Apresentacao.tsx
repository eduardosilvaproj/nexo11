import { Helmet } from "react-helmet-async";
import { NavBar } from "@/components/apresentacao/NavBar";
import { Hero } from "@/components/apresentacao/Hero";
import { FluxoOperacional } from "@/components/apresentacao/FluxoOperacional";
import { TimelineLateral } from "@/components/apresentacao/TimelineLateral";
import { ModuloSection } from "@/components/apresentacao/ModuloSection";
import { AppFuncionarioShowcase } from "@/components/apresentacao/AppFuncionarioShowcase";
import { EcossistemaNexo } from "@/components/apresentacao/EcossistemaNexo";
import { ArquiteturaPlataforma } from "@/components/apresentacao/ArquiteturaPlataforma";
import { EncerramentoInstitucional } from "@/components/apresentacao/EncerramentoInstitucional";
import { Footer } from "@/components/apresentacao/Footer";
import { MODULOS } from "@/components/apresentacao/data";

const Apresentacao = () => {
  const url = "https://nexo11.lovable.app/apresentacao";

  return (
    <div className="min-h-screen bg-[#060d1a] text-white relative overflow-x-hidden font-sans antialiased">
      <Helmet>
        <html lang="pt-BR" />
        <title>NEXO — Apresentação Institucional</title>
        <meta
          name="description"
          content="Apresentação institucional da plataforma NEXO: gestão integrada para a operação completa de móveis planejados."
        />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={url} />
        <meta property="og:title" content="NEXO — Apresentação Institucional" />
        <meta
          property="og:description"
          content="Plataforma integrada para a operação completa de móveis planejados."
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="theme-color" content="#060d1a" />
      </Helmet>

      {/* Ambient gradients sitewide */}
      <div className="fixed inset-0 pointer-events-none opacity-60">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#00AAFF]/10 blur-[160px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-[#12B76A]/10 blur-[160px] rounded-full" />
      </div>

      <div className="relative z-10">
        <NavBar />
        <TimelineLateral />
        <main>
          <Hero />
          <FluxoOperacional />

          <section>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center pt-16 sm:pt-24 pb-4">
              <div className="text-[10px] font-semibold tracking-[0.4em] text-white/40 uppercase mb-4">
                Módulos
              </div>
              <h2 className="text-[clamp(1.75rem,5vw,3rem)] font-semibold text-white tracking-tight max-w-3xl mx-auto leading-tight">
                Doze capítulos. Uma única operação.
              </h2>
            </div>
            {MODULOS.map((m, i) => (
              <ModuloSection key={m.slug} modulo={m} index={i} />
            ))}
          </section>

          <AppFuncionarioShowcase />
          <EcossistemaNexo />
          <ArquiteturaPlataforma />
          <EncerramentoInstitucional />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Apresentacao;
