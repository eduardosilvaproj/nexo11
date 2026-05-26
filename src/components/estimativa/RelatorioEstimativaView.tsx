import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, User, Building2, PenTool, Calendar } from 'lucide-react';
import type { RelatorioEstimativa, MovelIdentificado } from '@/types/estimativa';

interface RelatorioEstimativaViewProps {
  relatorio: RelatorioEstimativa;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface AmbienteGroup {
  ambiente: string;
  total_min: number;
  total_max: number;
  total_med: number;
}

const agruparPorAmbiente = (relatorio: RelatorioEstimativa): AmbienteGroup[] => {
  const map = new Map<string, AmbienteGroup>();
  relatorio.moveis.forEach((m: MovelIdentificado) => {
    const key = m.ambiente || 'Outros';
    if (!map.has(key)) {
      map.set(key, { ambiente: key, total_min: 0, total_max: 0, total_med: 0 });
    }
    const g = map.get(key)!;
    const e = relatorio.estimativas.find((x) => x.movel_id === m.id);
    if (e) {
      g.total_min += e.preco_minimo;
      g.total_max += e.preco_maximo;
      g.total_med += e.preco_medio;
    }
  });
  return Array.from(map.values());
};

const temDadosProjeto = (r: RelatorioEstimativa) => {
  const d = r.dados_projeto;
  return !!(d && (d.nome_cliente || d.nome_obra || d.arquiteto || d.data_projeto));
};

const INCLUSOS = [
  'Projeto executivo detalhado e renderizações 3D',
  'Móveis planejados sob medida em MDF de alta qualidade',
  'Ferragens premium (Blum, Hettich ou equivalente)',
  'Entrega e instalação por equipe especializada',
  'Garantia de 5 anos contra defeitos de fabricação',
  'Acompanhamento pós-venda dedicado',
];

const PROXIMOS_PASSOS = [
  'Visita técnica para medição presencial',
  'Apresentação do projeto 3D com ajustes finais',
  'Aprovação e assinatura do contrato',
  'Produção sob medida (prazo médio 30–45 dias)',
  'Entrega e montagem na sua obra',
];

const SOBRE_ESTIMATIVA = [
  { titulo: 'Estimativa preliminar', texto: 'Valores baseados em análise inicial do projeto e referências de mercado.' },
  { titulo: 'Variações possíveis', texto: 'Acabamentos, ferragens e especificações podem ajustar o orçamento final.' },
  { titulo: 'Não inclui terceiros', texto: 'Itens como eletrodomésticos, bancadas e iluminação não estão contemplados.' },
  { titulo: 'Próximos passos', texto: 'Visita técnica, projeto executivo e orçamento detalhado no Promob.' },
];

const COMO_FUNCIONA = [
  { n: '01', t: 'Estimativa Inicial', d: 'Análise preliminar do projeto e definição da faixa de investimento.' },
  { n: '02', t: 'Reunião Técnica', d: 'Alinhamento de acabamentos, ferragens e especificações.' },
  { n: '03', t: 'Projeto Executivo', d: 'Detalhamento técnico completo no Promob.' },
  { n: '04', t: 'Produção', d: 'Fabricação sob medida em prazo médio de 30 a 45 dias.' },
  { n: '05', t: 'Instalação', d: 'Montagem por equipe especializada com garantia de 5 anos.' },
];

const HERO_IMG = 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1600&q=80';
const FOOTER_IMG = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=60';

const gerarHTML = (relatorio: RelatorioEstimativa, grupos: AmbienteGroup[]): string => {
  const data = new Date(relatorio.data_analise).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const d = relatorio.dados_projeto || {};

  const cards: string[] = [];
  if (d.nome_obra) cards.push(`<div class="meta-card"><span class="meta-lbl">Obra</span><span class="meta-val">${d.nome_obra}</span></div>`);
  if (d.arquiteto) cards.push(`<div class="meta-card"><span class="meta-lbl">Arquiteto</span><span class="meta-val">${d.arquiteto}</span></div>`);
  if (d.nome_cliente) cards.push(`<div class="meta-card"><span class="meta-lbl">Cliente</span><span class="meta-val">${d.nome_cliente}</span></div>`);
  const metaHTML = cards.length ? `<div class="meta-row">${cards.join('')}</div>` : '';

  const ambientesHTML = grupos
    .map(
      (g) => `
      <article class="amb-card">
        <div class="amb-icon">◇</div>
        <h3 class="amb-nome">${g.ambiente}</h3>
        <p class="amb-faixa">${formatCurrency(g.total_min)} — ${formatCurrency(g.total_max)}</p>
        <div class="amb-med">${formatCurrency(g.total_med)}</div>
        <span class="amb-lbl">valor médio estimado</span>
      </article>`
    )
    .join('');

  const sobreHTML = SOBRE_ESTIMATIVA.map(
    (s) => `<div class="sobre-card"><div class="sobre-dot"></div><h4>${s.titulo}</h4><p>${s.texto}</p></div>`
  ).join('');

  const timelineHTML = COMO_FUNCIONA.map(
    (s) => `<div class="tl-item"><div class="tl-num">${s.n}</div><div class="tl-body"><h4>${s.t}</h4><p>${s.d}</p></div></div>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><title>NEXO — Estimativa de Investimento</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@200;300;400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
  :root{
    --bg:#F5F3EF; --ink:#1C1C1A; --ink-soft:#3A3A36; --muted:#8A867E;
    --line:#E4DFD6; --olive:#3D4A2A; --olive-deep:#2A331C; --champagne:#C9A961;
    --paper:#FBFAF7;
  }
  *{box-sizing:border-box;margin:0;padding:0;}
  html,body{background:var(--bg);color:var(--ink);font-family:'Manrope',-apple-system,sans-serif;font-weight:300;line-height:1.55;-webkit-font-smoothing:antialiased;}
  .page{max-width:1100px;margin:0 auto;background:var(--bg);}
  .eyebrow{font-family:'Inter',sans-serif;font-size:10px;font-weight:500;letter-spacing:.32em;text-transform:uppercase;color:var(--muted);}

  /* HERO */
  .hero{position:relative;height:760px;overflow:hidden;color:#F5F3EF;}
  .hero-img{position:absolute;inset:0;background:url('${HERO_IMG}') center/cover no-repeat;}
  .hero-overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(20,18,15,.55) 0%,rgba(20,18,15,.45) 40%,rgba(20,18,15,.85) 100%);}
  .hero-inner{position:relative;height:100%;display:flex;flex-direction:column;justify-content:space-between;padding:56px 72px;}
  .hero-top{display:flex;justify-content:space-between;align-items:center;}
  .brand{font-family:'Inter',sans-serif;font-size:18px;font-weight:600;letter-spacing:.5em;}
  .hero-tag{font-family:'Inter',sans-serif;font-size:10px;letter-spacing:.3em;text-transform:uppercase;opacity:.75;}
  .hero-body{max-width:780px;}
  .hero-eyebrow{color:rgba(245,243,239,.7);font-family:'Inter',sans-serif;font-size:11px;letter-spacing:.4em;text-transform:uppercase;margin-bottom:28px;}
  .hero h1{font-family:'Manrope',sans-serif;font-weight:200;font-size:84px;line-height:.98;letter-spacing:-.02em;margin-bottom:28px;}
  .hero h1 em{font-style:italic;font-weight:300;color:var(--champagne);}
  .hero p{font-size:16px;font-weight:300;line-height:1.6;max-width:560px;color:rgba(245,243,239,.82);}
  .hero-bottom{display:flex;justify-content:space-between;align-items:flex-end;gap:48px;}
  .hero-date{font-family:'Inter',sans-serif;font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:rgba(245,243,239,.6);}
  .meta-row{display:flex;gap:14px;}
  .meta-card{backdrop-filter:blur(14px);background:rgba(245,243,239,.08);border:1px solid rgba(245,243,239,.15);padding:18px 24px;min-width:180px;display:flex;flex-direction:column;gap:6px;}
  .meta-lbl{font-family:'Inter',sans-serif;font-size:9px;letter-spacing:.3em;text-transform:uppercase;color:rgba(245,243,239,.6);}
  .meta-val{font-size:15px;font-weight:400;color:#F5F3EF;}

  /* SECTION SHELL */
  section{padding:120px 72px;}
  .section-head{display:flex;flex-direction:column;gap:18px;margin-bottom:64px;max-width:720px;}
  .section-head h2{font-family:'Manrope',sans-serif;font-weight:200;font-size:54px;line-height:1.05;letter-spacing:-.02em;color:var(--ink);}
  .section-head h2 em{font-style:italic;color:var(--olive);font-weight:300;}
  .section-head p{font-size:15px;color:var(--ink-soft);max-width:520px;}

  /* FAIXA */
  .faixa-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;}
  .tier{background:var(--paper);border:1px solid var(--line);padding:48px 36px;display:flex;flex-direction:column;gap:14px;transition:all .4s ease;}
  .tier .tier-lbl{font-family:'Inter',sans-serif;font-size:10px;font-weight:500;letter-spacing:.35em;text-transform:uppercase;color:var(--muted);}
  .tier .tier-val{font-family:'Manrope',sans-serif;font-size:38px;font-weight:300;color:var(--ink);letter-spacing:-.02em;margin-top:8px;}
  .tier-line{width:32px;height:1px;background:var(--line);margin-top:18px;}
  .tier.featured{background:var(--olive-deep);color:#F5F3EF;border-color:var(--olive-deep);box-shadow:0 30px 80px -30px rgba(42,51,28,.5);}
  .tier.featured .tier-lbl{color:rgba(245,243,239,.6);}
  .tier.featured .tier-val{color:#F5F3EF;}
  .tier.featured .tier-line{background:var(--champagne);}
  .faixa-note{margin-top:48px;padding:28px 32px;border-left:2px solid var(--champagne);background:var(--paper);font-size:13.5px;color:var(--ink-soft);line-height:1.7;max-width:820px;}

  /* AMBIENTES */
  .amb-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
  .amb-card{background:var(--paper);border:1px solid var(--line);padding:36px 32px;display:flex;flex-direction:column;gap:8px;transition:all .35s ease;}
  .amb-icon{font-size:18px;color:var(--olive);margin-bottom:14px;}
  .amb-nome{font-family:'Manrope',sans-serif;font-weight:400;font-size:20px;color:var(--ink);}
  .amb-faixa{font-family:'Inter',sans-serif;font-size:12px;color:var(--muted);letter-spacing:.04em;}
  .amb-med{font-family:'Manrope',sans-serif;font-size:28px;font-weight:300;color:var(--olive);margin-top:18px;letter-spacing:-.01em;}
  .amb-lbl{font-family:'Inter',sans-serif;font-size:9.5px;letter-spacing:.3em;text-transform:uppercase;color:var(--muted);}

  /* SOBRE */
  .sobre-section{background:var(--paper);}
  .sobre-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1px;background:var(--line);border:1px solid var(--line);}
  .sobre-card{background:var(--paper);padding:44px 40px;display:flex;flex-direction:column;gap:14px;}
  .sobre-dot{width:6px;height:6px;background:var(--champagne);border-radius:50%;}
  .sobre-card h4{font-family:'Manrope',sans-serif;font-weight:500;font-size:18px;color:var(--ink);}
  .sobre-card p{font-size:14px;color:var(--ink-soft);line-height:1.65;}

  /* TIMELINE */
  .timeline{display:flex;flex-direction:column;gap:0;border-top:1px solid var(--line);}
  .tl-item{display:grid;grid-template-columns:120px 1fr;gap:48px;padding:32px 0;border-bottom:1px solid var(--line);align-items:baseline;}
  .tl-num{font-family:'Manrope',sans-serif;font-weight:200;font-size:42px;color:var(--olive);letter-spacing:-.02em;}
  .tl-body h4{font-family:'Manrope',sans-serif;font-weight:500;font-size:20px;color:var(--ink);margin-bottom:6px;}
  .tl-body p{font-size:14px;color:var(--ink-soft);max-width:520px;}

  /* FOOTER */
  .footer{position:relative;background:#16140F;color:#F5F3EF;padding:96px 72px 48px;overflow:hidden;}
  .footer-img{position:absolute;inset:0;background:url('${FOOTER_IMG}') center/cover no-repeat;opacity:.12;}
  .footer-inner{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:72px;align-items:end;}
  .footer-left .brand{font-size:22px;letter-spacing:.5em;margin-bottom:28px;display:block;}
  .footer-left p{font-family:'Manrope',sans-serif;font-weight:200;font-size:24px;line-height:1.4;letter-spacing:-.01em;max-width:380px;color:rgba(245,243,239,.85);}
  .footer-right{display:flex;flex-direction:column;gap:12px;font-family:'Inter',sans-serif;font-size:13px;color:rgba(245,243,239,.75);}
  .footer-right .lbl{font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:rgba(245,243,239,.45);margin-bottom:4px;}
  .footer-base{position:relative;margin-top:72px;padding-top:24px;border-top:1px solid rgba(245,243,239,.1);display:flex;justify-content:space-between;font-family:'Inter',sans-serif;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:rgba(245,243,239,.45);}

  @media(max-width:780px){
    .hero{height:auto;}
    .hero-inner{padding:40px 28px;gap:64px;}
    .hero h1{font-size:48px;}
    section{padding:72px 28px;}
    .section-head h2{font-size:36px;}
    .faixa-grid,.amb-grid,.sobre-grid,.footer-inner{grid-template-columns:1fr;}
    .meta-row{flex-direction:column;}
    .tl-item{grid-template-columns:1fr;gap:8px;}
    .footer{padding:64px 28px 32px;}
  }
  @media print{
    body{background:#fff;}
    .hero{height:auto;page-break-after:always;}
    section{page-break-inside:avoid;}
  }
</style></head><body>
<div class="page">

  <header class="hero">
    <div class="hero-img"></div>
    <div class="hero-overlay"></div>
    <div class="hero-inner">
      <div class="hero-top">
        <div class="brand">NEXO</div>
        <div class="hero-tag">Móveis Planejados — Alto Padrão</div>
      </div>
      <div class="hero-body">
        <div class="hero-eyebrow">Apresentação Confidencial</div>
        <h1>Estimativa de <em>Investimento</em></h1>
        <p>Estimativa preliminar para validação da expectativa orçamentária antes do desenvolvimento do projeto executivo.</p>
      </div>
      <div class="hero-bottom">
        <div class="hero-date">${data}</div>
        ${metaHTML}
      </div>
    </div>
  </header>

  <section>
    <div class="section-head">
      <span class="eyebrow">01 — Investimento</span>
      <h2>Faixa de Investimento <em>Estimada</em></h2>
      <p>Transparência para decisões seguras. Três cenários que delimitam a expectativa de investimento conforme acabamentos e especificações.</p>
    </div>
    <div class="faixa-grid">
      <div class="tier">
        <span class="tier-lbl">Mínimo Estimado</span>
        <div class="tier-val">${formatCurrency(relatorio.total_minimo)}</div>
        <div class="tier-line"></div>
      </div>
      <div class="tier featured">
        <span class="tier-lbl">Média Prevista</span>
        <div class="tier-val">${formatCurrency(relatorio.total_medio)}</div>
        <div class="tier-line"></div>
      </div>
      <div class="tier">
        <span class="tier-lbl">Máximo Estimado</span>
        <div class="tier-val">${formatCurrency(relatorio.total_maximo)}</div>
        <div class="tier-line"></div>
      </div>
    </div>
    <p class="faixa-note">Os valores apresentados representam uma estimativa preliminar baseada nas informações atuais do projeto e poderão variar conforme definições técnicas, acabamentos e especificações finais.</p>
  </section>

  <section style="padding-top:0;">
    <div class="section-head">
      <span class="eyebrow">02 — Detalhamento</span>
      <h2>Por <em>Ambiente</em></h2>
      <p>Composição da estimativa por ambiente projetado, com faixa mínima, máxima e valor médio referencial.</p>
    </div>
    <div class="amb-grid">${ambientesHTML}</div>
  </section>

  <section class="sobre-section">
    <div class="section-head">
      <span class="eyebrow">03 — Esclarecimentos</span>
      <h2>Sobre esta <em>Estimativa</em></h2>
    </div>
    <div class="sobre-grid">${sobreHTML}</div>
  </section>

  <section>
    <div class="section-head">
      <span class="eyebrow">04 — Processo</span>
      <h2>Como <em>Funciona</em></h2>
      <p>Da estimativa inicial à entrega final — um processo conduzido com precisão técnica e cuidado editorial.</p>
    </div>
    <div class="timeline">${timelineHTML}</div>
  </section>

  <footer class="footer">
    <div class="footer-img"></div>
    <div class="footer-inner">
      <div class="footer-left">
        <span class="brand">NEXO</span>
        <p>Transformando ambientes em experiências de morar refinadas.</p>
      </div>
      <div class="footer-right">
        <div><span class="lbl">Contato</span>contato@nexo.com.br</div>
        <div><span class="lbl">Telefone</span>+55 (00) 00000-0000</div>
        <div><span class="lbl">Instagram</span>@nexo.planejados</div>
      </div>
    </div>
    <div class="footer-base">
      <span>NEXO — Móveis Planejados</span>
      <span>${data}</span>
    </div>
  </footer>

</div>
</body></html>`;
};

export const RelatorioEstimativaView = ({ relatorio }: RelatorioEstimativaViewProps) => {
  const grupos = agruparPorAmbiente(relatorio);
  const d = relatorio.dados_projeto;
  const mostrarProjeto = temDadosProjeto(relatorio);

  const baixarPDF = () => {
    const html = gerarHTML(relatorio, grupos);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estimativa-nexo-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Relatório de Estimativa</h2>
            <p className="text-sm text-muted-foreground">
              Análise realizada em {new Date(relatorio.data_analise).toLocaleString('pt-BR')}
            </p>
          </div>
          <Button className="gap-2" onClick={baixarPDF}>
            <Download className="h-4 w-4" />
            Baixar PDF
          </Button>
        </div>
      </Card>

      {mostrarProjeto && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Dados do Projeto</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {d?.nome_cliente && (
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <User className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Cliente</p>
                  <p className="font-medium">{d.nome_cliente}</p>
                </div>
              </div>
            )}
            {d?.nome_obra && (
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <Building2 className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Obra</p>
                  <p className="font-medium">{d.nome_obra}</p>
                </div>
              </div>
            )}
            {d?.arquiteto && (
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <PenTool className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Arquiteto</p>
                  <p className="font-medium">{d.arquiteto}</p>
                </div>
              </div>
            )}
            {d?.data_projeto && (
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <Calendar className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Data do Projeto</p>
                  <p className="font-medium">{d.data_projeto}</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Faixa de Investimento</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-6 border rounded-lg">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Mínimo</p>
            <p className="text-2xl font-bold mt-3">{formatCurrency(relatorio.total_minimo)}</p>
          </div>
          <div className="text-center p-6 border rounded-lg">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Médio</p>
            <p className="text-2xl font-bold mt-3">{formatCurrency(relatorio.total_medio)}</p>
          </div>
          <div className="text-center p-6 border rounded-lg">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Máximo</p>
            <p className="text-2xl font-bold mt-3">{formatCurrency(relatorio.total_maximo)}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Ambientes ({grupos.length})</h3>
        <div className="space-y-3">
          {grupos.map((g) => (
            <div key={g.ambiente} className="p-4 border rounded-lg flex items-center justify-between">
              <p className="font-semibold text-base">{g.ambiente}</p>
              <div className="text-right">
                <p className="font-semibold text-primary text-lg">{formatCurrency(g.total_med)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(g.total_min)} — {formatCurrency(g.total_max)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 bg-amber-50 border-amber-200">
        <p className="text-sm text-amber-800">
          <strong>Importante:</strong> Estimativa preliminar. Orçamento final deve ser feito no Promob após medição técnica.
        </p>
      </Card>
    </div>
  );
};
