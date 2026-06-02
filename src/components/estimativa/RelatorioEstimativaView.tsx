import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Download, Home } from 'lucide-react';
import type { RelatorioEstimativa } from '@/types/estimativa';

interface RelatorioEstimativaViewProps {
  relatorio: RelatorioEstimativa;
}

interface AmbienteResumo {
  nome: string;
  totalMin: number;
  totalMax: number;
  totalMedio: number;
}

function agruparPorAmbiente(relatorio: RelatorioEstimativa): AmbienteResumo[] {
  const mapa: Record<string, AmbienteResumo> = {};
  for (const movel of relatorio.moveis) {
    const amb = movel.ambiente || "Geral";
    if (!mapa[amb]) {
      mapa[amb] = { nome: amb, totalMin: 0, totalMax: 0, totalMedio: 0 };
    }
    const est = relatorio.estimativas.find(e => e.movel_id === movel.id);
    if (est) {
      mapa[amb].totalMin += est.preco_minimo;
      mapa[amb].totalMax += est.preco_maximo;
      mapa[amb].totalMedio += est.preco_medio;
    }
  }
  return Object.values(mapa).sort((a, b) => b.totalMedio - a.totalMedio);
}

function gerarPDFPremium(relatorio: RelatorioEstimativa, sliderValue: number = 50) {
  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  const dataFmt = new Date(relatorio.data_analise).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const ambientes = agruparPorAmbiente(relatorio);
  const dp = relatorio.dados_projeto || {};

  const totalAtual = relatorio.total_minimo + (relatorio.total_maximo - relatorio.total_minimo) * (sliderValue / 100);
  const sliderLabel = sliderValue <= 25 ? "Econômico" : sliderValue <= 50 ? "Padrão" : sliderValue <= 75 ? "Premium" : "Alto Padrão";

  const ambientesHtml = ambientes.map(a => {
    const valor = a.totalMin + (a.totalMax - a.totalMin) * (sliderValue / 100);
    return `<div class="amb-row"><div class="nome">${a.nome}</div><div class="preco"><div class="medio">${fmt(valor)}</div><div class="range">${fmt(a.totalMin)} — ${fmt(a.totalMax)}</div></div></div>`;
  }).join("");

  const css = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',sans-serif;color:#1C1917;background:#F5F3EF;line-height:1.6}.page{max-width:860px;margin:0 auto}.hero{background:linear-gradient(135deg,#1C1917 0%,#292524 50%,#3B3835 100%);color:#fff;padding:80px 60px 60px;position:relative}.hero-badge{font-size:10px;text-transform:uppercase;letter-spacing:3px;color:#A39480;font-weight:600;margin-bottom:24px}.hero h1{font-size:32px;font-weight:300;letter-spacing:-0.5px;margin-bottom:8px;color:#FAFAF9}.hero h2{font-size:16px;font-weight:400;color:#A8A29E;margin-bottom:32px}.hero-meta{display:flex;gap:32px;font-size:12px;color:#78716C}.hero-meta span{display:flex;flex-direction:column;gap:2px}.hero-meta .label{font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#A39480}.invest-section{padding:48px 60px;background:#fff}.invest-label{font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#78716C;font-weight:600;margin-bottom:24px}.invest-grid{display:flex;gap:20px}.invest-card{flex:1;padding:28px 20px;border-radius:12px;text-align:center}.invest-card.min{background:#FAFAF9;border:1px solid #E7E5E4}.invest-card.med{background:#FAFAF9;border:1px solid #E7E5E4}.invest-card.max{background:#FAFAF9;border:1px solid #E7E5E4}.invest-card .card-label{font-size:10px;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;margin-bottom:12px}.invest-card.min .card-label,.invest-card.max .card-label,.invest-card.med .card-label{color:#78716C}.invest-card .card-valor{font-size:26px;font-weight:700;letter-spacing:-1px}.invest-card .card-sub{font-size:11px;margin-top:6px;opacity:0.6}.amb-section{padding:48px 60px;background:#F5F3EF}.amb-title{font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#78716C;font-weight:600;margin-bottom:24px}.amb-list{display:flex;flex-direction:column;gap:8px}.amb-row{display:flex;justify-content:space-between;align-items:center;padding:20px 24px;background:#fff;border-radius:10px;border:1px solid #E7E5E4}.amb-row .nome{font-size:15px;font-weight:600;color:#1C1917}.amb-row .preco{text-align:right}.amb-row .preco .medio{font-size:17px;font-weight:700;color:#1C1917}.amb-row .preco .range{font-size:11px;color:#A8A29E;margin-top:2px}.valor-section{padding:48px 60px;background:#fff}.valor-title{font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#78716C;font-weight:600;margin-bottom:24px}.valor-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.valor-item{padding:20px;border-radius:10px;background:#FAFAF9;border:1px solid #F5F5F4}.valor-item h4{font-size:13px;font-weight:600;color:#1C1917;margin-bottom:4px}.valor-item p{font-size:12px;color:#78716C;line-height:1.5}.proc-section{padding:48px 60px;background:#F5F3EF}.proc-title{font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#78716C;font-weight:600;margin-bottom:24px}.proc-steps{display:flex;gap:12px}.proc-step{flex:1;text-align:center;padding:20px 12px;background:#fff;border-radius:10px;border:1px solid #E7E5E4}.proc-step .num{font-size:20px;font-weight:800;color:#A39480;margin-bottom:6px}.proc-step .step-label{font-size:11px;font-weight:600;color:#1C1917}.disc-section{padding:36px 60px;background:#fff;border-top:1px solid #E7E5E4}.disc-section p{font-size:11px;color:#A8A29E;line-height:1.7;max-width:600px}.footer{padding:40px 60px;background:#1C1917;color:#78716C;text-align:center}.footer .logo{font-size:24px;font-weight:800;letter-spacing:4px;color:#FAFAF9;margin-bottom:8px}.footer .tagline{font-size:12px;color:#A39480;margin-bottom:16px;font-style:italic}.footer .info{font-size:10px;letter-spacing:0.5px}@media print{body{background:#fff}.hero{padding:48px 40px}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`;

  const heroMeta = [
    dp.nome_cliente ? `<span><span class="label">Cliente</span>${dp.nome_cliente}</span>` : "",
    `<span><span class="label">Data</span>${dataFmt}</span>`,
    dp.data_projeto ? `<span><span class="label">Projeto</span>${dp.data_projeto}</span>` : "",
  ].filter(Boolean).join("");

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>NEXO - Estimativa</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"><style>${css}</style></head><body><div class="page">
<div class="hero"><div class="hero-badge">Estimativa Personalizada</div><h1>${dp.nome_obra || "Projeto Residencial"}</h1><h2>${dp.arquiteto || "Móveis Planejados Sob Medida"}</h2><div class="hero-meta">${heroMeta}</div></div>
<div class="invest-section"><div class="invest-label">Investimento Estimado — ${sliderLabel}</div><div class="invest-grid"><div class="invest-card min"><div class="card-label">Mínimo</div><div class="card-valor">${fmt(relatorio.total_minimo)}</div></div><div class="invest-card med"><div class="card-label">Selecionado</div><div class="card-valor">${fmt(totalAtual)}</div></div><div class="invest-card max"><div class="card-label">Máximo</div><div class="card-valor">${fmt(relatorio.total_maximo)}</div></div></div></div>
<div class="amb-section"><div class="amb-title">Ambientes</div><div class="amb-list">${ambientesHtml}</div></div>
<div class="valor-section"><div class="valor-title">O que está incluso</div><div class="valor-grid"><div class="valor-item"><h4>Projeto Personalizado</h4><p>Cada peça desenhada exclusivamente para seu espaço</p></div><div class="valor-item"><h4>Materiais Selecionados</h4><p>MDF/MDP premium com revestimento de alta durabilidade</p></div><div class="valor-item"><h4>Ferragens de Qualidade</h4><p>Dobradiças e corrediças com tecnologia soft-close</p></div><div class="valor-item"><h4>Execução Sob Medida</h4><p>Fabricação própria com controle de qualidade rigoroso</p></div><div class="valor-item"><h4>Acabamento Refinado</h4><p>Atenção aos detalhes em cada etapa do processo</p></div><div class="valor-item"><h4>Garantia Estendida</h4><p>5 anos contra defeitos de fabricação</p></div></div></div>
<div class="proc-section"><div class="proc-title">Próximos Passos</div><div class="proc-steps"><div class="proc-step"><div class="num">01</div><div class="step-label">Estimativa</div></div><div class="proc-step"><div class="num">02</div><div class="step-label">Visita Técnica</div></div><div class="proc-step"><div class="num">03</div><div class="step-label">Projeto 3D</div></div><div class="proc-step"><div class="num">04</div><div class="step-label">Produção</div></div><div class="proc-step"><div class="num">05</div><div class="step-label">Instalação</div></div></div></div>
<div class="disc-section"><p>Esta estimativa é baseada em análise automatizada do projeto e serve como referência inicial. O investimento final será definido após visita técnica, medição presencial e detalhamento do projeto em software profissional. Valores podem variar conforme acabamentos, ferragens especiais e acessórios escolhidos.</p></div>
<div class="footer"><div class="logo">NEXO</div><div class="tagline">Móveis que transformam espaços em experiências</div><div class="info">Documento gerado automaticamente • Sem valor contratual</div></div>
</div></body></html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (win) { win.onload = () => { setTimeout(() => win.print(), 500); }; }
}

export const RelatorioEstimativaView = ({ relatorio }: RelatorioEstimativaViewProps) => {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  const ambientes = agruparPorAmbiente(relatorio);
  const dp = relatorio.dados_projeto || {};

  // Slider de preço: posição 0-100 onde 0=mínimo, 50=médio, 100=máximo
  const [sliderValue, setSliderValue] = useState(50);
  const totalAtual = relatorio.total_minimo + (relatorio.total_maximo - relatorio.total_minimo) * (sliderValue / 100);

  // Calcular valor por ambiente baseado no slider
  const getAmbienteValor = (amb: AmbienteResumo) => {
    return amb.totalMin + (amb.totalMax - amb.totalMin) * (sliderValue / 100);
  };

  const sliderLabel = sliderValue <= 25 ? "Econômico" : sliderValue <= 50 ? "Padrão" : sliderValue <= 75 ? "Premium" : "Alto Padrão";

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Estimativa de Investimento</h2>
            <p className="text-sm text-gray-600">
              {new Date(relatorio.data_analise).toLocaleString("pt-BR")}
            </p>
            {(dp.nome_cliente || dp.nome_obra || dp.arquiteto) && (
              <div className="mt-3 text-sm text-gray-700 space-y-1">
                {dp.nome_cliente && <p><span className="text-gray-400">Cliente:</span> {dp.nome_cliente}</p>}
                {dp.nome_obra && <p><span className="text-gray-400">Obra:</span> {dp.nome_obra}</p>}
                {dp.arquiteto && <p><span className="text-gray-400">Arquiteto(a):</span> {dp.arquiteto}</p>}
              </div>
            )}
          </div>
          <Button className="gap-2" onClick={() => gerarPDFPremium(relatorio, sliderValue)}>
            <Download className="h-4 w-4" />
            Baixar PDF
          </Button>
        </div>
      </Card>

      {/* Slider de Preço */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-2">Ajuste de Faixa de Preço</h3>
        <p className="text-sm text-gray-500 mb-4">Deslize para ajustar o nível de acabamento e investimento</p>

        <div className="space-y-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-[#1E6FBF]">{formatCurrency(totalAtual)}</p>
            <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#1E6FBF]/10 text-[#1E6FBF]">
              {sliderLabel}
            </span>
          </div>

          <div className="px-2">
            <Slider
              value={[sliderValue]}
              onValueChange={(v) => setSliderValue(v[0])}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>{formatCurrency(relatorio.total_minimo)}</span>
              <span>{formatCurrency(relatorio.total_medio)}</span>
              <span>{formatCurrency(relatorio.total_maximo)}</span>
            </div>
            <div className="flex justify-between mt-0.5 text-[10px] text-gray-400">
              <span>Econômico</span>
              <span>Padrão</span>
              <span>Alto Padrão</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Home className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-semibold">Ambientes</h3>
        </div>
        <div className="space-y-2">
          {ambientes.map((amb) => (
            <div key={amb.nome} className="flex items-center justify-between p-4 rounded-lg bg-gray-50/80 border border-gray-100">
              <p className="font-semibold text-gray-900">{amb.nome}</p>
              <div className="text-right">
                <p className="font-bold text-gray-900">{formatCurrency(getAmbienteValor(amb))}</p>
                <p className="text-xs text-gray-400">{formatCurrency(amb.totalMin)} {"—"} {formatCurrency(amb.totalMax)}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 bg-stone-50 border-stone-200">
        <p className="text-xs text-stone-500">
          Estimativa preliminar. Valores podem variar conforme acabamento, ferragens e acessórios.
          Solicite uma visita técnica para orçamento definitivo.
        </p>
      </Card>
    </div>
  );
};
