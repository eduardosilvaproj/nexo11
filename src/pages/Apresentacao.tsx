import { Link } from "react-router-dom";
import { 
  CheckCircle2, 
  ArrowRight, 
  LayoutDashboard, 
  ClipboardList, 
  ShoppingCart, 
  Box, 
  Truck, 
  Hammer, 
  HeartHandshake, 
  BarChart3, 
  Users,
  AlertCircle,
  FileText,
  TrendingUp,
  ShieldCheck,
  Package,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Apresentacao = () => {
  const modulos = [
    {
      title: "Comercial e Contratos",
      description: "Gestão de leads, orçamentos e formalização de contratos com assinatura digital e controle de status.",
      icon: Users
    },
    {
      title: "Medição e Conferência",
      description: "Fluxo técnico para levantamento de medidas e conferência detalhada antes da produção.",
      icon: ClipboardList
    },
    {
      title: "Compras",
      description: "Centralização de pedidos a fornecedores, cotações e controle de prazos de entrega.",
      icon: ShoppingCart
    },
    {
      title: "Almoxarifado",
      description: "Controle de estoque real, reserva de materiais por contrato e rastreabilidade total.",
      icon: Box
    },
    {
      title: "Logística",
      description: "Planejamento de rotas, controle de carregamento e confirmação de entrega em tempo real.",
      icon: Truck
    },
    {
      title: "Montagem",
      description: "Agendamento de equipes, checklists de instalação e acompanhamento de finalização.",
      icon: Hammer
    },
    {
      title: "Pós-venda",
      description: "Gestão de assistências técnicas e pesquisas de satisfação integradas ao contrato.",
      icon: HeartHandshake
    },
    {
      title: "Financeiro e DRE",
      description: "Controle de fluxo de caixa, contas a pagar/receber e demonstrativos de resultados automáticos.",
      icon: BarChart3
    },
    {
      title: "Analytics",
      description: "Dashboards inteligentes com indicadores de performance, vendas e lucratividade por loja.",
      icon: TrendingUp
    }
  ];

  const beneficios = [
    {
      title: "Rastreabilidade por contrato",
      description: "Saiba exatamente em que etapa está cada projeto, desde o primeiro contato até o pós-venda.",
      icon: ShieldCheck
    },
    {
      title: "Menos retrabalho",
      description: "Informações técnicas precisas e centralizadas reduzem erros de medição e montagem.",
      icon: CheckCircle2
    },
    {
      title: "Menos perda de material",
      description: "Controle de estoque rigoroso e reserva inteligente evitam desperdícios e compras desnecessárias.",
      icon: Package
    },
    {
      title: "Previsibilidade de entrega",
      description: "Visão clara do cronograma de produção e montagem para cumprir prazos com segurança.",
      icon: Calendar
    },
    {
      title: "Controle de estoque real",
      description: "Gestão de itens por origem (compra ou estoque) com movimentação automática.",
      icon: Box
    },
    {
      title: "Indicadores para gestão",
      description: "Dados concretos para tomada de decisão baseada em resultados e produtividade.",
      icon: FileText
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation - Simple Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-2xl tracking-tighter text-primary">
            <LayoutDashboard className="h-6 w-6" />
            NEXO
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-medium">
            <a href="#solucao" className="transition-colors hover:text-primary">Solução</a>
            <a href="#modulos" className="transition-colors hover:text-primary">Módulos</a>
            <a href="#beneficios" className="transition-colors hover:text-primary">Benefícios</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Button size="sm">Solicitar Demonstração</Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 lg:py-32 bg-slate-50">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <Badge variant="outline" className="px-3 py-1 text-sm font-medium border-primary/20 bg-primary/5 text-primary">
              A revolução operacional no seu mobiliário
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl/none max-w-4xl">
              NEXO — Gestão completa para lojas de móveis planejados
            </h1>
            <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
              Do comercial à montagem, conecte contratos, medição, compras, almoxarifado, logística, pós-venda e financeiro em um único fluxo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <Link to="/login">
                <Button size="lg" className="px-8 h-12 text-base font-semibold">
                  Ver demonstração
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#modulos">
                <Button variant="outline" size="lg" className="px-8 h-12 text-base font-semibold">
                  Conhecer módulos
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Problema Section */}
      <section className="py-20">
        <div className="container px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                Sua operação não deveria depender de planilhas e grupos de WhatsApp
              </h2>
              <div className="grid gap-4">
                {[
                  "Informações espalhadas entre setores",
                  "Falta de rastreabilidade por contrato",
                  "Compras duplicadas ou esquecidas",
                  "Estoque sem controle confiável",
                  "Logística sem visão de materiais",
                  "Montagem impactada por pendências invisíveis"
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <AlertCircle className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
                    <span className="text-lg text-gray-600 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative aspect-video rounded-xl overflow-hidden border shadow-2xl bg-slate-900 flex items-center justify-center p-8">
               <div className="text-center space-y-4">
                  <div className="text-slate-400 text-sm uppercase tracking-widest font-semibold">Visualização do Sistema</div>
                  <div className="bg-slate-800 h-2 w-48 mx-auto rounded-full" />
                  <div className="bg-slate-800 h-2 w-32 mx-auto rounded-full" />
                  <div className="grid grid-cols-3 gap-2 mt-8">
                     <div className="bg-slate-800 h-24 rounded-lg" />
                     <div className="bg-slate-800 h-24 rounded-lg" />
                     <div className="bg-slate-800 h-24 rounded-lg" />
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solução Section */}
      <section id="solucao" className="py-20 bg-primary text-white">
        <div className="container px-4 md:px-6">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Um fluxo integrado da venda à entrega
            </h2>
            <p className="text-primary-foreground/80 max-w-[800px] mx-auto text-lg">
              Elimine gargalos e conecte todos os departamentos em uma jornada única de trabalho.
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 md:gap-8 max-w-5xl mx-auto">
            {[
              "Comercial", "Contrato", "Medição", "Conferência", "Compras", 
              "Almoxarifado", "Logística", "Montagem", "Pós-venda", "Financeiro"
            ].map((step, index, arr) => (
              <div key={index} className="flex items-center gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-12 w-12 rounded-full bg-white text-primary flex items-center justify-center font-bold text-lg shadow-lg">
                    {index + 1}
                  </div>
                  <span className="mt-2 font-medium text-sm md:text-base">{step}</span>
                </div>
                {index < arr.length - 1 && (
                  <div className="hidden sm:block h-[2px] w-6 bg-primary-foreground/30 mt-[-24px]" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Módulos Section */}
      <section id="modulos" className="py-20 bg-slate-50">
        <div className="container px-4 md:px-6">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Tudo o que você precisa para gerir sua loja
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {modulos.map((modulo, index) => (
              <Card key={index} className="border-none shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                    <modulo.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{modulo.title}</h3>
                  <p className="text-gray-500 leading-relaxed">
                    {modulo.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefícios Section */}
      <section id="beneficios" className="py-20">
        <div className="container px-4 md:px-6">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 flex flex-col justify-center space-y-4">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                Otimização real para sua gestão
              </h2>
              <p className="text-gray-500 text-lg">
                Implementamos as melhores práticas de processos para lojas que buscam excelência operacional.
              </p>
            </div>
            <div className="lg:col-span-2 grid sm:grid-cols-2 gap-6">
              {beneficios.map((ben, index) => (
                <div key={index} className="flex gap-4 p-4 rounded-xl border border-slate-100 hover:border-primary/20 hover:bg-primary/5 transition-all">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <ben.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">{ben.title}</h3>
                    <p className="text-gray-500 text-sm">{ben.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Para quem é Section */}
      <section className="py-20 bg-slate-900 text-white overflow-hidden relative">
        <div className="container px-4 md:px-6 relative z-10">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl mb-6">
              Para quem é o NEXO?
            </h2>
            <p className="text-xl text-slate-300 leading-relaxed">
              O NEXO foi pensado para lojas de móveis planejados que precisam organizar a operação, melhorar comunicação entre setores e ganhar controle gerencial. Seja uma loja compacta ou uma grande rede, o fluxo integrado garante a escala que seu negócio precisa.
            </p>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/10 skew-x-[-20deg] translate-x-1/2" />
      </section>

      {/* CTA Final */}
      <section className="py-24 text-center">
        <div className="container px-4 md:px-6">
          <div className="max-w-2xl mx-auto space-y-8">
            <h2 className="text-4xl font-bold tracking-tighter sm:text-5xl">
              Pronto para transformar a operação da sua loja?
            </h2>
            <p className="text-gray-500 text-lg">
              Junte-se a lojas que já utilizam o NEXO para escalar seus resultados com controle total de cada etapa.
            </p>
            <Button size="lg" className="px-10 h-14 text-lg font-bold">
              Solicitar demonstração
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t bg-slate-50">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2 font-bold text-2xl tracking-tighter text-primary">
              <LayoutDashboard className="h-6 w-6" />
              NEXO
            </div>
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} NEXO — Gestão Inteligente para Móveis Planejados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Apresentacao;