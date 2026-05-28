import { useMemo, useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Download, User, Building2, PenTool, Calendar, Pencil, Briefcase, Target } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { RelatorioEstimativa, MovelIdentificado } from '@/types/estimativa';
import { LABEL_TIPO_PROJETO } from '@/types/estimativa';

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
  comentario?: string;
}

const agruparPorAmbiente = (relatorio: RelatorioEstimativa): AmbienteGroup[] => {
  const map = new Map<string, AmbienteGroup>();
  const coments = relatorio.comentarios_ambientes || {};
  const findComent = (key: string): string | undefined => {
    if (coments[key]) return coments[key];
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const target = norm(key);
    const hit = Object.keys(coments).find((k) => norm(k) === target);
    return hit ? coments[hit] : undefined;
  };
  relatorio.moveis.forEach((m: MovelIdentificado) => {
    const key = m.ambiente || 'Outros';
    if (!map.has(key)) {
      map.set(key, { ambiente: key, total_min: 0, total_max: 0, total_med: 0, comentario: findComent(key) });
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

const SVG = {
  cozinha: '<path d="M6 2v6M10 2v6M8 8v14M14 22V10a4 4 0 0 1 4-4v16"/>',
  sala: '<path d="M3 12v6a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6"/><path d="M5 12V9a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3"/><path d="M5 19v2M19 19v2"/>',
  tv: '<rect x="2" y="5" width="20" height="13" rx="2"/><path d="M8 21h8M12 18v3"/>',
  closet: '<path d="M12 3a2 2 0 1 0 0 4"/><path d="M3 21l9-6 9 6"/><path d="M12 7v8"/>',
  dormitorio: '<path d="M2 17v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4"/><path d="M2 17h20v4M6 11V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3"/>',
  escritorio: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  lavanderia: '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="14" r="4"/><path d="M8 7h.01M12 7h.01"/>',
  banheiro: '<path d="M4 12h16v4a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M6 12V6a2 2 0 0 1 4 0M6 20l-1 2M19 20l1 2"/>',
  academia: '<path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12"/>',
  gourmet: '<path d="M14 11V3l4 4-4 4z"/><path d="M6 3v18M6 11h4M10 3v8"/>',
  hall: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M15 12h.01"/>',
  varanda: '<path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6"/>',
  default: '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 10h16M10 4v16"/>',
};

const iconForAmbiente = (nome: string): string => {
  const n = nome.toLowerCase();
  if (/cozinh/.test(n)) return SVG.cozinha;
  if (/tv|home|cinema/.test(n)) return SVG.tv;
  if (/sala|estar|living/.test(n)) return SVG.sala;
  if (/closet|vestidor/.test(n)) return SVG.closet;
  if (/dormit|quart|suíte|suite/.test(n)) return SVG.dormitorio;
  if (/escrit|home.?office|office/.test(n)) return SVG.escritorio;
  if (/lavand|área de serviço|area de servico/.test(n)) return SVG.lavanderia;
  if (/banh|wc|lavabo|toilet/.test(n)) return SVG.banheiro;
  if (/academ|fitness|ginás/.test(n)) return SVG.academia;
  if (/gourm|churras|bar/.test(n)) return SVG.gourmet;
  if (/hall|entrada|foy/.test(n)) return SVG.hall;
  if (/varand|terra|sacad|jard/.test(n)) return SVG.varanda;
  return SVG.default;
};

const renderIcon = (paths: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

// === PDF: A4 portrait @ 96dpi → 794 x 1123 px ===
const PAGE_W = 794;
const PAGE_H = 1123;

const SHARED_CSS = `
  *{box-sizing:border-box;margin:0;padding:0;}
  html,body{font-family:'Manrope',-apple-system,sans-serif;font-weight:300;color:#1C1C1A;-webkit-font-smoothing:antialiased;}
  .pdf-page{width:${PAGE_W}px;height:${PAGE_H}px;position:relative;overflow:hidden;background:#F5F3EF;}
  .eyebrow{font-family:'Inter',sans-serif;font-size:9px;font-weight:500;letter-spacing:.34em;text-transform:uppercase;color:#8A867E;}
  em{font-style:italic;font-weight:300;color:#3D4A2A;}
`;

const FONT_LINKS = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@200;300;400;500;600&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
`;

// ───────── PÁGINA 1 — CAPA ─────────
const gerarCapa = (relatorio: RelatorioEstimativa): string => {
  const d = relatorio.dados_projeto || {};
  const data = new Date(relatorio.data_analise).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const metaItems: string[] = [];
  if (d.nome_obra) metaItems.push(`<div class="m-item"><span class="m-lbl">Obra</span><span class="m-val">${d.nome_obra}</span></div>`);
  if (d.arquiteto) metaItems.push(`<div class="m-item"><span class="m-lbl">Arquiteto</span><span class="m-val">${d.arquiteto}</span></div>`);
  if (d.nome_cliente) metaItems.push(`<div class="m-item"><span class="m-lbl">Cliente</span><span class="m-val">${d.nome_cliente}</span></div>`);
  if (relatorio.contexto?.tipo_projeto) {
    metaItems.push(`<div class="m-item"><span class="m-lbl">Tipo</span><span class="m-val">${LABEL_TIPO_PROJETO[relatorio.contexto.tipo_projeto]}</span></div>`);
  }

  const c = relatorio.comparacao_orcamento;
  const comparacaoHTML = c
    ? `<div class="cv-comparacao">
        <div class="cv-comp-row"><span class="cv-comp-lbl">Orçamento do cliente</span><span class="cv-comp-val">${formatCurrency(c.orcamento_cliente)}</span></div>
        <div class="cv-comp-row"><span class="cv-comp-lbl">Estimativa média</span><span class="cv-comp-val">${formatCurrency(c.estimativa_media)}</span></div>
        <div class="cv-comp-row"><span class="cv-comp-lbl">Diferença</span><span class="cv-comp-val" style="color:${c.diferenca_valor > 0 ? '#C9A961' : '#9BBF6E'}">${c.diferenca_valor > 0 ? '+' : ''}${c.diferenca_pct.toFixed(1)}%</span></div>
      </div>`
    : '';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONT_LINKS}<style>${SHARED_CSS}
    .cover{color:#F5F3EF;}
    .cover-img{position:absolute;inset:0;background:url('https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1600&q=80') center/cover no-repeat;}
    .cover-overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,13,10,.45) 0%,rgba(15,13,10,.55) 50%,rgba(15,13,10,.92) 100%);}
    .cover-inner{position:relative;height:100%;display:flex;flex-direction:column;justify-content:space-between;padding:64px 72px;}
    .cv-top{display:flex;justify-content:space-between;align-items:flex-start;}
    .cv-brand{font-family:'Inter',sans-serif;font-size:16px;font-weight:600;letter-spacing:.55em;}
    .cv-tag{font-family:'Inter',sans-serif;font-size:9px;letter-spacing:.32em;text-transform:uppercase;opacity:.7;text-align:right;line-height:1.6;}
    .cv-mid{max-width:620px;}
    .cv-eyebrow{font-family:'Inter',sans-serif;font-size:10px;letter-spacing:.42em;text-transform:uppercase;color:rgba(245,243,239,.65);margin-bottom:24px;}
    .cv-title{font-family:'Manrope',sans-serif;font-weight:200;font-size:68px;line-height:1;letter-spacing:-.025em;margin-bottom:20px;}
    .cv-title em{color:#C9A961;font-style:italic;font-weight:200;}
    .cv-sub{font-family:'Manrope',sans-serif;font-weight:300;font-size:15px;line-height:1.6;color:rgba(245,243,239,.78);max-width:480px;}
    .cv-bottom{display:flex;flex-direction:column;gap:24px;}
    .cv-investimento{padding:20px 0;border-top:1px solid rgba(245,243,239,.18);border-bottom:1px solid rgba(245,243,239,.18);display:flex;justify-content:space-between;align-items:baseline;}
    .cv-inv-lbl{font-family:'Inter',sans-serif;font-size:9px;letter-spacing:.34em;text-transform:uppercase;color:rgba(245,243,239,.6);}
    .cv-inv-val{font-family:'Manrope',sans-serif;font-weight:200;font-size:26px;color:#F5F3EF;letter-spacing:-.01em;}
    .cv-inv-val em{color:#C9A961;font-style:normal;font-weight:300;}
    .cv-meta{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;flex-wrap:wrap;}
    .cv-date{font-family:'Inter',sans-serif;font-size:9px;letter-spacing:.32em;text-transform:uppercase;color:rgba(245,243,239,.55);}
    .cv-meta-row{display:flex;gap:32px;flex-wrap:wrap;}
    .cv-comparacao{display:flex;flex-direction:column;gap:6px;padding:14px 0;border-bottom:1px solid rgba(245,243,239,.18);}
    .cv-comp-row{display:flex;justify-content:space-between;align-items:baseline;}
    .cv-comp-lbl{font-family:'Inter',sans-serif;font-size:9px;letter-spacing:.3em;text-transform:uppercase;color:rgba(245,243,239,.55);}
    .cv-comp-val{font-family:'Manrope',sans-serif;font-weight:300;font-size:14px;color:#F5F3EF;}
    .m-item{display:flex;flex-direction:column;gap:4px;min-width:120px;}
    .m-lbl{font-family:'Inter',sans-serif;font-size:8px;letter-spacing:.34em;text-transform:uppercase;color:rgba(245,243,239,.5);}
    .m-val{font-family:'Manrope',sans-serif;font-weight:400;font-size:13px;color:#F5F3EF;}
  </style></head><body>
  <div class="pdf-page cover">
    <div class="cover-img"></div>
    <div class="cover-overlay"></div>
    <div class="cover-inner">
      <div class="cv-top">
        <div class="cv-brand">NEXO</div>
        <div class="cv-tag">Móveis Planejados<br>Alto Padrão</div>
      </div>
      <div class="cv-mid">
        <div class="cv-eyebrow">Apresentação Confidencial</div>
        <div class="cv-title">Estimativa de<br><em>Investimento</em></div>
        <div class="cv-sub">Estimativa preliminar para validação da expectativa orçamentária antes do desenvolvimento do projeto executivo.</div>
      </div>
      <div class="cv-bottom">
        <div class="cv-investimento">
          <span class="cv-inv-lbl">Faixa de Investimento</span>
          <span class="cv-inv-val">${formatCurrency(relatorio.total_minimo)} <em>—</em> ${formatCurrency(relatorio.total_maximo)}</span>
        </div>
        ${comparacaoHTML}
        <div class="cv-meta">
          <div class="cv-date">${data}</div>
          <div class="cv-meta-row">${metaItems.join('')}</div>
        </div>
      </div>
    </div>
  </div>
  </body></html>`;
};

// ───────── PÁGINA 2 — INVESTIMENTO + AMBIENTES ─────────
const gerarInvestimento = (relatorio: RelatorioEstimativa, grupos: AmbienteGroup[]): string => {
  const ambientesHTML = grupos.map((g) => `
    <article class="amb-card">
      <div class="amb-icon">${renderIcon(iconForAmbiente(g.ambiente))}</div>
      <div class="amb-body">
        <h3 class="amb-nome">${g.ambiente}</h3>
        ${g.comentario ? `<p class="amb-coment">${g.comentario}</p>` : ''}
        <p class="amb-faixa">${formatCurrency(g.total_min)} — ${formatCurrency(g.total_max)}</p>
      </div>
      <div class="amb-med">${formatCurrency(g.total_med)}</div>
    </article>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONT_LINKS}<style>${SHARED_CSS}
    .p2{padding:60px 64px;display:flex;flex-direction:column;gap:36px;}
    .p2-head{display:flex;justify-content:space-between;align-items:baseline;padding-bottom:16px;border-bottom:1px solid #E4DFD6;}
    .p2-head .brand{font-family:'Inter',sans-serif;font-size:12px;font-weight:600;letter-spacing:.5em;color:#1C1C1A;}
    .p2-head .pg{font-family:'Inter',sans-serif;font-size:9px;letter-spacing:.32em;text-transform:uppercase;color:#8A867E;}
    .sec-head{display:flex;flex-direction:column;gap:8px;}
    .sec-head h2{font-family:'Manrope',sans-serif;font-weight:200;font-size:32px;line-height:1.05;letter-spacing:-.022em;color:#1C1C1A;}
    .sec-head h2 em{color:#3D4A2A;}
    .sec-head p{font-size:12px;color:#3A3A36;line-height:1.55;max-width:520px;}
    .tiers{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
    .tier{background:#FBFAF7;border:1px solid #E4DFD6;padding:24px 20px;display:flex;flex-direction:column;gap:10px;}
    .tier-lbl{font-family:'Inter',sans-serif;font-size:9px;font-weight:500;letter-spacing:.32em;text-transform:uppercase;color:#8A867E;}
    .tier-val{font-family:'Manrope',sans-serif;font-size:24px;font-weight:300;color:#1C1C1A;letter-spacing:-.02em;}
    .tier-line{width:28px;height:1px;background:#E4DFD6;margin-top:4px;}
    .tier-desc{font-family:'Inter',sans-serif;font-size:9px;line-height:1.45;color:#8A867E;margin-top:2px;}
    .tier.featured{background:#2A331C;color:#F5F3EF;border-color:#2A331C;}
    .tier.featured .tier-lbl{color:rgba(245,243,239,.6);}
    .tier.featured .tier-val{color:#F5F3EF;}
    .tier.featured .tier-line{background:#C9A961;}
    .tier.featured .tier-desc{color:rgba(245,243,239,.55);}
    .amb-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px 12px;}
    .amb-card{background:#FBFAF7;border:1px solid #E4DFD6;padding:14px 16px;display:flex;align-items:center;gap:14px;}
    .amb-icon{width:28px;height:28px;color:#3D4A2A;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
    .amb-icon svg{width:22px;height:22px;}
    .amb-body{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0;}
    .amb-nome{font-family:'Manrope',sans-serif;font-weight:500;font-size:13px;color:#1C1C1A;letter-spacing:-.005em;}
    .amb-faixa{font-family:'Inter',sans-serif;font-size:9.5px;color:#8A867E;letter-spacing:.02em;}
    .amb-med{font-family:'Manrope',sans-serif;font-size:15px;font-weight:400;color:#3D4A2A;letter-spacing:-.015em;}
  </style></head><body>
  <div class="pdf-page">
    <div class="p2">
      <div class="p2-head">
        <span class="brand">NEXO</span>
        <span class="pg">02 — Investimento &amp; Ambientes</span>
      </div>
      <div>
        <div class="sec-head" style="margin-bottom:18px;">
          <span class="eyebrow">01 — Investimento</span>
          <h2>Faixa de Investimento <em>Estimada</em></h2>
          <p>Três cenários que delimitam a expectativa de investimento conforme acabamentos e especificações.</p>
        </div>
        <div class="tiers">
          <div class="tier"><span class="tier-lbl">Mínimo</span><div class="tier-val">${formatCurrency(relatorio.total_minimo)}</div><div class="tier-line"></div><p class="tier-desc">Acabamento padrão, ferragens básicas, sem acessórios especiais</p></div>
          <div class="tier featured"><span class="tier-lbl">Média Prevista</span><div class="tier-val">${formatCurrency(relatorio.total_medio)}</div><div class="tier-line"></div><p class="tier-desc">Acabamento intermediário, ferragens soft-close, acessórios selecionados</p></div>
          <div class="tier"><span class="tier-lbl">Máximo</span><div class="tier-val">${formatCurrency(relatorio.total_maximo)}</div><div class="tier-line"></div><p class="tier-desc">Alto padrão, ferragens premium, acessórios completos, iluminação LED</p></div>
        </div>
      </div>
      <div>
        <div class="sec-head" style="margin-bottom:16px;">
          <span class="eyebrow">02 — Detalhamento</span>
          <h2>Por <em>Ambiente</em></h2>
        </div>
        <div class="amb-grid">${ambientesHTML}</div>
      </div>
    </div>
  </div>
  </body></html>`;
};

// ───────── PÁGINA 3 — PROCESSO + OBSERVAÇÕES + FOOTER ─────────
const gerarProcesso = (relatorio: RelatorioEstimativa): string => {
  const data = new Date(relatorio.data_analise).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const sobreHTML = SOBRE_ESTIMATIVA.map((s) => `
    <div class="sobre-card"><h4>${s.titulo}</h4><p>${s.texto}</p></div>`).join('');
  const inclusosHTML = INCLUSOS.map((i) => `<li>${i}</li>`).join('');
  const proximosHTML = PROXIMOS_PASSOS.map((p, i) => `<li><span>${String(i + 1).padStart(2, '0')}</span>${p}</li>`).join('');
  const timelineHTML = COMO_FUNCIONA.map((s) => `
    <div class="tl-item"><div class="tl-num">${s.n}</div><div class="tl-body"><h4>${s.t}</h4><p>${s.d}</p></div></div>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONT_LINKS}<style>${SHARED_CSS}
    .pdf-page{display:flex;flex-direction:column;}
    .p3{padding:50px 64px 24px;display:flex;flex-direction:column;gap:24px;flex:1;}
    .p3-head{display:flex;justify-content:space-between;align-items:baseline;padding-bottom:14px;border-bottom:1px solid #E4DFD6;}
    .p3-head .brand{font-family:'Inter',sans-serif;font-size:12px;font-weight:600;letter-spacing:.5em;color:#1C1C1A;}
    .p3-head .pg{font-family:'Inter',sans-serif;font-size:9px;letter-spacing:.32em;text-transform:uppercase;color:#8A867E;}
    .sec-head h2{font-family:'Manrope',sans-serif;font-weight:200;font-size:22px;line-height:1.05;letter-spacing:-.022em;color:#1C1C1A;}
    .sec-head h2 em{color:#3D4A2A;}
    .sec-head{display:flex;flex-direction:column;gap:6px;margin-bottom:10px;}
    .sobre-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1px;background:#E4DFD6;border:1px solid #E4DFD6;}
    .sobre-card{background:#FBFAF7;padding:12px 14px;}
    .sobre-card h4{font-family:'Manrope',sans-serif;font-weight:500;font-size:11px;color:#1C1C1A;margin-bottom:3px;}
    .sobre-card p{font-size:10px;color:#3A3A36;line-height:1.5;}
    .two-col{display:grid;grid-template-columns:1fr 1fr;gap:24px;}
    .col h3{font-family:'Manrope',sans-serif;font-weight:500;font-size:13px;color:#1C1C1A;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #E4DFD6;}
    .col ul{list-style:none;display:flex;flex-direction:column;gap:6px;}
    .col li{font-size:10.5px;color:#3A3A36;line-height:1.5;padding-left:14px;position:relative;}
    .col.incl li:before{content:'';position:absolute;left:0;top:8px;width:6px;height:1px;background:#C9A961;}
    .col.prox li{display:flex;gap:10px;padding-left:0;align-items:baseline;}
    .col.prox li span{font-family:'Manrope',sans-serif;font-size:10px;color:#3D4A2A;font-weight:500;min-width:18px;}
    .timeline{display:flex;flex-direction:column;border-top:1px solid #E4DFD6;}
    .tl-item{display:grid;grid-template-columns:48px 1fr;gap:14px;padding:10px 0;border-bottom:1px solid #E4DFD6;align-items:baseline;}
    .tl-num{font-family:'Manrope',sans-serif;font-weight:200;font-size:20px;color:#3D4A2A;letter-spacing:-.02em;}
    .tl-body h4{font-family:'Manrope',sans-serif;font-weight:500;font-size:11.5px;color:#1C1C1A;margin-bottom:2px;}
    .tl-body p{font-size:10px;color:#3A3A36;line-height:1.45;}
    .footer{background:#16140F;color:#F5F3EF;padding:24px 64px;}
    .footer-row{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;}
    .footer .brand{font-family:'Inter',sans-serif;font-size:13px;font-weight:600;letter-spacing:.55em;display:block;margin-bottom:8px;}
    .footer p{font-family:'Manrope',sans-serif;font-weight:200;font-size:11px;line-height:1.4;color:rgba(245,243,239,.78);max-width:280px;}
    .footer-right{display:flex;flex-direction:column;gap:4px;font-family:'Inter',sans-serif;font-size:10px;color:rgba(245,243,239,.75);text-align:right;}
    .footer-right .lbl{font-size:7.5px;letter-spacing:.32em;text-transform:uppercase;color:rgba(245,243,239,.45);}
    .footer-base{margin-top:14px;padding-top:10px;border-top:1px solid rgba(245,243,239,.12);display:flex;justify-content:space-between;font-family:'Inter',sans-serif;font-size:8px;letter-spacing:.22em;text-transform:uppercase;color:rgba(245,243,239,.5);}
  </style></head><body>
  <div class="pdf-page">
    <div class="p3">
      <div class="p3-head">
        <span class="brand">NEXO</span>
        <span class="pg">03 — Processo &amp; Esclarecimentos</span>
      </div>

      <div>
        <div class="sec-head"><span class="eyebrow">03 — Esclarecimentos</span><h2>Sobre esta <em>Estimativa</em></h2></div>
        <div class="sobre-grid">${sobreHTML}</div>
      </div>

      <div>
        <div class="sec-head"><span class="eyebrow">04 — Escopo</span><h2>O que está <em>incluso</em> &amp; próximos passos</h2></div>
        <div class="two-col">
          <div class="col incl"><h3>Incluso no investimento</h3><ul>${inclusosHTML}</ul></div>
          <div class="col prox"><h3>Próximos passos</h3><ul>${proximosHTML}</ul></div>
        </div>
      </div>

      <div>
        <div class="sec-head"><span class="eyebrow">05 — Processo</span><h2>Como <em>Funciona</em></h2></div>
        <div class="timeline">${timelineHTML}</div>
      </div>
    </div>

    <footer class="footer">
      <div class="footer-row">
        <div>
          <span class="brand">NEXO</span>
          <p>Transformando ambientes em experiências de morar refinadas.</p>
        </div>
        <div class="footer-right">
          <div><span class="lbl">Contato</span><br>contato@nexo.com.br</div>
          <div><span class="lbl">Telefone</span><br>+55 (00) 00000-0000</div>
          <div><span class="lbl">Instagram</span><br>@nexo.planejados</div>
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
  const gruposCompletos = useMemo(() => agruparPorAmbiente(relatorio), [relatorio]);
  const [selecionados, setSelecionados] = useState<Set<string>>(
    () => new Set(gruposCompletos.map((g) => g.ambiente)),
  );
  // Overrides do valor médio por ambiente (editado manualmente)
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [editando, setEditando] = useState<string | null>(null);
  // Ajuste percentual global (-50% a +100%)
  const [ajustePct, setAjustePct] = useState<number>(0);
  const fatorAjuste = 1 + ajustePct / 100;

  const toggleAmbiente = (ambiente: string) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(ambiente)) next.delete(ambiente);
      else next.add(ambiente);
      return next;
    });
  };

  // Grupos com overrides aplicados (escala min/max proporcionalmente ao médio) + fator global
  const gruposEfetivos = useMemo(() => {
    return gruposCompletos.map((g) => {
      const override = overrides[g.ambiente];
      const base = override != null && g.total_med ? {
        ambiente: g.ambiente,
        total_med: override,
        total_min: g.total_min * (override / g.total_med),
        total_max: g.total_max * (override / g.total_med),
      } : g;
      return {
        ambiente: base.ambiente,
        total_med: base.total_med * fatorAjuste,
        total_min: base.total_min * fatorAjuste,
        total_max: base.total_max * fatorAjuste,
        comentario: g.comentario,
      };
    });
  }, [gruposCompletos, overrides, fatorAjuste]);

  const relatorioFiltrado = useMemo<RelatorioEstimativa>(() => {
    const moveisFiltrados = relatorio.moveis.filter((m) =>
      selecionados.has(m.ambiente || 'Outros'),
    );
    const idsValidos = new Set(moveisFiltrados.map((m) => m.id));

    // Mapa de ratio por ambiente para escalar estimativas individuais
    const ratioMap = new Map<string, number>();
    gruposCompletos.forEach((g) => {
      const override = overrides[g.ambiente];
      const overrideRatio = override != null && g.total_med > 0 ? override / g.total_med : 1;
      ratioMap.set(g.ambiente, overrideRatio * fatorAjuste);
    });

    const estimativasFiltradas = relatorio.estimativas
      .filter((e) => idsValidos.has(e.movel_id))
      .map((e) => {
        const movel = relatorio.moveis.find((m) => m.id === e.movel_id);
        const amb = movel?.ambiente || 'Outros';
        const r = ratioMap.get(amb) ?? 1;
        return {
          ...e,
          preco_minimo: e.preco_minimo * r,
          preco_maximo: e.preco_maximo * r,
          preco_medio: e.preco_medio * r,
        };
      });

    const total_minimo = estimativasFiltradas.reduce((s, e) => s + e.preco_minimo, 0);
    const total_maximo = estimativasFiltradas.reduce((s, e) => s + e.preco_maximo, 0);
    const total_medio = estimativasFiltradas.reduce((s, e) => s + e.preco_medio, 0);
    return {
      ...relatorio,
      moveis: moveisFiltrados,
      estimativas: estimativasFiltradas,
      total_minimo,
      total_maximo,
      total_medio,
    };
  }, [relatorio, selecionados, overrides, gruposCompletos, fatorAjuste]);

  const gruposFiltrados = useMemo(
    () => gruposEfetivos.filter((g) => selecionados.has(g.ambiente)),
    [gruposEfetivos, selecionados],
  );
  const d = relatorio.dados_projeto;
  const mostrarProjeto = temDadosProjeto(relatorio);

  const baixarPDF = async () => {
    const paginas = [
      gerarCapa(relatorioFiltrado),
      gerarInvestimento(relatorioFiltrado, gruposFiltrados),
      gerarProcesso(relatorioFiltrado),
    ];

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfW = 210;
    const pdfH = 297;

    for (let i = 0; i < paginas.length; i++) {
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-10000px';
      container.style.top = '0';
      container.style.width = `${PAGE_W}px`;
      container.style.height = `${PAGE_H}px`;
      container.innerHTML = paginas[i];
      document.body.appendChild(container);

      try {
        await new Promise((r) => setTimeout(r, 600));
        const target = container.querySelector('.pdf-page') as HTMLElement;
        const canvas = await html2canvas(target, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          width: PAGE_W,
          height: PAGE_H,
          windowWidth: PAGE_W,
          windowHeight: PAGE_H,
          backgroundColor: '#F5F3EF',
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH);
      } finally {
        document.body.removeChild(container);
      }
    }

    pdf.save(`estimativa-nexo-${Date.now()}.pdf`);
  };

  const pdfDisabled = selecionados.size === 0;

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
          <Button className="gap-2" onClick={baixarPDF} disabled={pdfDisabled}>
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

      {relatorio.contexto && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Contexto da Estimativa</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {relatorio.contexto.tipo_projeto && (
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <Briefcase className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Tipo de Projeto</p>
                  <p className="font-medium">{LABEL_TIPO_PROJETO[relatorio.contexto.tipo_projeto]}</p>
                </div>
              </div>
            )}
            {relatorio.contexto.orcamento_cliente != null && (
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <Target className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Orçamento do Cliente</p>
                  <p className="font-medium">{formatCurrency(relatorio.contexto.orcamento_cliente)}</p>
                </div>
              </div>
            )}
          </div>
          {relatorio.contexto.observacoes && (
            <p className="text-sm text-muted-foreground mt-3 italic">"{relatorio.contexto.observacoes}"</p>
          )}
          {relatorio.comparacao_orcamento && (() => {
            const c = relatorio.comparacao_orcamento;
            const acima = c.diferenca_valor > 0;
            return (
              <div className={`mt-4 p-4 rounded-lg border ${acima ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <p className={`text-sm ${acima ? 'text-amber-900' : 'text-emerald-900'}`}>
                  <strong>Orçamento do cliente:</strong> {formatCurrency(c.orcamento_cliente)} ·{' '}
                  <strong>Estimativa média:</strong> {formatCurrency(c.estimativa_media)} ·{' '}
                  <strong>Diferença:</strong> {acima ? '+' : ''}{c.diferenca_pct.toFixed(1)}% ({acima ? '+' : ''}{formatCurrency(c.diferenca_valor)})
                </p>
              </div>
            );
          })()}
        </Card>
      )}


      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Faixa de Investimento</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-6 border rounded-lg">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Mínimo</p>
            <p className="text-2xl font-bold mt-3">{formatCurrency(relatorioFiltrado.total_minimo)}</p>
            <p className="text-xs text-muted-foreground mt-2">Acabamento padrão, ferragens básicas, sem acessórios especiais</p>
          </div>
          <div className="text-center p-6 border rounded-lg">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Médio</p>
            <p className="text-2xl font-bold mt-3">{formatCurrency(relatorioFiltrado.total_medio)}</p>
            <p className="text-xs text-muted-foreground mt-2">Acabamento intermediário, ferragens soft-close, acessórios selecionados</p>
          </div>
          <div className="text-center p-6 border rounded-lg">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Máximo</p>
            <p className="text-2xl font-bold mt-3">{formatCurrency(relatorioFiltrado.total_maximo)}</p>
            <p className="text-xs text-muted-foreground mt-2">Alto padrão, ferragens premium, acessórios completos, iluminação LED</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Ajuste Global</h3>
            <p className="text-xs text-muted-foreground mt-1">Aplica desconto ou acréscimo em todos os valores</p>
          </div>
          <div className={`text-2xl font-bold tabular-nums ${ajustePct > 0 ? 'text-amber-600' : ajustePct < 0 ? 'text-emerald-600' : 'text-foreground'}`}>
            {ajustePct > 0 ? '+' : ''}{ajustePct}%
          </div>
        </div>
        <Slider
          value={[ajustePct]}
          onValueChange={(v) => setAjustePct(v[0])}
          min={-50}
          max={100}
          step={1}
          className="my-3"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>−50%</span>
          <button
            type="button"
            onClick={() => setAjustePct(0)}
            className="hover:text-foreground transition-colors"
          >
            Resetar
          </button>
          <span>+100%</span>
        </div>
      </Card>


      <Card className="p-6">
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="text-lg font-semibold">
            Ambientes ({selecionados.size}/{gruposCompletos.length})
          </h3>
          <p className="text-xs text-muted-foreground">
            Desmarque ou clique no valor para editar
          </p>
        </div>
        <div className="space-y-2">
          {gruposEfetivos.map((g) => {
            const checked = selecionados.has(g.ambiente);
            const isEdit = editando === g.ambiente;
            const original = gruposCompletos.find((x) => x.ambiente === g.ambiente)?.total_med ?? 0;
            const foiEditado = overrides[g.ambiente] != null;
            return (
              <div
                key={g.ambiente}
                className={`p-4 border rounded-lg flex items-center gap-4 transition-colors ${
                  checked ? 'bg-background' : 'bg-muted/40 opacity-60'
                }`}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggleAmbiente(g.ambiente)}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base">{g.ambiente}</p>
                  {g.comentario && (
                    <p className="text-xs italic text-muted-foreground mt-0.5">{g.comentario}</p>
                  )}
                </div>
                <div className="text-right">
                  {isEdit ? (
                    <ValorEditavel
                      valorInicial={g.total_med}
                      onSalvar={(v) => {
                        if (v <= 0 || Math.abs(v - original) < 0.005) {
                          setOverrides((prev) => {
                            const next = { ...prev };
                            delete next[g.ambiente];
                            return next;
                          });
                        } else {
                          setOverrides((prev) => ({ ...prev, [g.ambiente]: v }));
                        }
                        setEditando(null);
                      }}
                      onCancelar={() => setEditando(null)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditando(g.ambiente)}
                      className="group inline-flex items-center gap-2 px-2 py-1 -mr-2 rounded-md hover:bg-muted transition-colors"
                      title="Clique para editar"
                    >
                      <span className={`font-semibold text-lg ${foiEditado ? 'text-emerald-600' : 'text-primary'}`}>
                        {formatCurrency(g.total_med)}
                      </span>
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(g.total_min)} — {formatCurrency(g.total_max)}
                    {foiEditado && <span className="ml-1 text-emerald-600">• editado</span>}
                  </p>
                </div>
              </div>
            );
          })}
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

interface ValorEditavelProps {
  valorInicial: number;
  onSalvar: (v: number) => void;
  onCancelar: () => void;
}

const ValorEditavel = ({ valorInicial, onSalvar, onCancelar }: ValorEditavelProps) => {
  const [valor, setValor] = useState<string>(() =>
    valorInicial.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  );
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const confirmar = () => {
    const limpo = valor.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
    const num = parseFloat(limpo);
    if (isNaN(num)) onCancelar();
    else onSalvar(num);
  };

  return (
    <div className="inline-flex items-center gap-1">
      <span className="text-sm text-muted-foreground">R$</span>
      <Input
        ref={ref}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === 'Enter') confirmar();
          if (e.key === 'Escape') onCancelar();
        }}
        className="h-8 w-32 text-right font-semibold text-base"
        inputMode="decimal"
      />
    </div>
  );
};
