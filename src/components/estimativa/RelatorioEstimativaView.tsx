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

const gerarHTML = (relatorio: RelatorioEstimativa, grupos: AmbienteGroup[]): string => {
  const data = new Date(relatorio.data_analise).toLocaleString('pt-BR');
  const d = relatorio.dados_projeto || {};

  const projetoHero = temDadosProjeto(relatorio)
    ? `<div class="proj-grid">
        ${d.nome_cliente ? `<div><span class="lbl">Cliente</span><span class="val">${d.nome_cliente}</span></div>` : ''}
        ${d.nome_obra ? `<div><span class="lbl">Obra</span><span class="val">${d.nome_obra}</span></div>` : ''}
        ${d.arquiteto ? `<div><span class="lbl">Arquiteto</span><span class="val">${d.arquiteto}</span></div>` : ''}
        ${d.data_projeto ? `<div><span class="lbl">Data</span><span class="val">${d.data_projeto}</span></div>` : ''}
      </div>`
    : '';

  const ambientesHTML = grupos
    .map(
      (g) => `
      <div class="ambiente">
        <div><h3>${g.ambiente}</h3>
          <p class="faixa">${formatCurrency(g.total_min)} — ${formatCurrency(g.total_max)}</p>
        </div>
        <div class="valor-med">${formatCurrency(g.total_med)}</div>
      </div>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><title>Estimativa NEXO</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a1a;background:#fff;}
  .wrap{max-width:880px;margin:0 auto;padding:32px;}
  .hero{background:linear-gradient(135deg,#0a0a0a 0%,#1a1a2e 60%,#16213e 100%);color:#fff;padding:48px 40px;border-radius:14px;margin-bottom:32px;}
  .hero .brand{font-size:42px;letter-spacing:6px;font-weight:800;}
  .hero .tag{color:#9ca3af;font-size:13px;letter-spacing:2px;text-transform:uppercase;margin-top:4px;}
  .hero h2{margin-top:24px;font-size:24px;font-weight:600;color:#e5e7eb;}
  .hero .data{margin-top:8px;font-size:12px;color:#9ca3af;}
  .proj-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:24px;padding-top:24px;border-top:1px solid rgba(255,255,255,.1);}
  .proj-grid>div{display:flex;flex-direction:column;}
  .proj-grid .lbl{font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#9ca3af;}
  .proj-grid .val{font-size:15px;font-weight:600;margin-top:3px;color:#fff;}
  h2.section{font-size:13px;text-transform:uppercase;letter-spacing:2.5px;color:#6b7280;font-weight:700;margin:36px 0 16px;}
  .invest{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
  .tier{padding:24px 20px;border-radius:12px;border:1px solid #e5e7eb;text-align:center;}
  .tier .nome{font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#9ca3af;font-weight:600;}
  .tier .preco{font-size:24px;font-weight:800;margin-top:10px;color:#111;}
  .tier .sub{font-size:11px;color:#9ca3af;margin-top:6px;}
  .tier.recomendado{background:linear-gradient(135deg,#0a0a0a,#1a1a2e);color:#fff;border-color:#0a0a0a;transform:scale(1.03);}
  .tier.recomendado .nome{color:#fbbf24;}
  .tier.recomendado .preco{color:#fff;font-size:28px;}
  .tier.recomendado .sub{color:#9ca3af;}
  .tier.recomendado .badge{display:inline-block;background:#fbbf24;color:#0a0a0a;font-size:9px;padding:3px 8px;border-radius:10px;font-weight:700;letter-spacing:1px;margin-bottom:8px;}
  .ambiente{display:flex;justify-content:space-between;align-items:center;padding:18px 22px;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:10px;}
  .ambiente h3{font-size:16px;font-weight:700;}
  .ambiente .faixa{font-size:12px;color:#9ca3af;margin-top:3px;}
  .ambiente .valor-med{font-size:20px;font-weight:800;color:#0a7d4a;}
  .lista{background:#f9fafb;padding:24px;border-radius:10px;}
  .lista ol,.lista ul{padding-left:22px;}
  .lista li{font-size:13.5px;color:#374151;margin-bottom:10px;line-height:1.5;}
  .lista li::marker{color:#0a7d4a;font-weight:700;}
  .disclaimer{margin-top:28px;padding:18px 22px;background:#fff8e1;border-left:4px solid #f5b400;font-size:12px;color:#5a4500;border-radius:6px;line-height:1.6;}
  .footer{margin-top:36px;padding:28px;background:#0a0a0a;color:#fff;border-radius:12px;text-align:center;}
  .footer .brand{font-size:22px;letter-spacing:4px;font-weight:800;}
  .footer .tagline{font-size:12px;color:#9ca3af;margin-top:6px;letter-spacing:1.5px;}
</style></head><body>
<div class="wrap">
  <div class="hero">
    <div class="brand">NEXO</div>
    <div class="tag">Móveis Planejados</div>
    <h2>Estimativa de Investimento</h2>
    <div class="data">Gerado em ${data}</div>
    ${projetoHero}
  </div>

  <h2 class="section">Investimento Estimado</h2>
  <div class="invest">
    <div class="tier"><div class="nome">Essencial</div><div class="preco">${formatCurrency(relatorio.total_minimo)}</div><div class="sub">Acabamentos padrão</div></div>
    <div class="tier recomendado"><span class="badge">Recomendado</span><div class="nome">Recomendado</div><div class="preco">${formatCurrency(relatorio.total_medio)}</div><div class="sub">Melhor custo-benefício</div></div>
    <div class="tier"><div class="nome">Premium</div><div class="preco">${formatCurrency(relatorio.total_maximo)}</div><div class="sub">Acabamentos premium</div></div>
  </div>

  <h2 class="section">Detalhamento por Ambiente</h2>
  ${ambientesHTML}

  <h2 class="section">O que está incluso</h2>
  <div class="lista"><ul>${INCLUSOS.map((i) => `<li>${i}</li>`).join('')}</ul></div>

  <h2 class="section">Próximos Passos</h2>
  <div class="lista"><ol>${PROXIMOS_PASSOS.map((p) => `<li>${p}</li>`).join('')}</ol></div>

  <div class="disclaimer"><strong>Importante:</strong> Esta é uma estimativa preliminar baseada em análise automatizada do projeto executivo. Os valores finais podem variar conforme acabamentos escolhidos, ferragens, complexidade de instalação e condições da obra. O orçamento definitivo será apresentado após visita técnica e detalhamento no Promob.</div>

  <div class="footer">
    <div class="brand">NEXO</div>
    <div class="tagline">Transformando ambientes em experiências</div>
  </div>
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
        <h3 className="text-lg font-semibold mb-4">Investimento Estimado</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-6 border rounded-lg">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Essencial</p>
            <p className="text-2xl font-bold mt-3">{formatCurrency(relatorio.total_minimo)}</p>
            <p className="text-xs text-muted-foreground mt-2">Acabamentos padrão</p>
          </div>
          <div className="text-center p-6 rounded-lg bg-gradient-to-br from-slate-900 to-slate-800 text-white md:scale-105 shadow-lg">
            <span className="inline-block bg-amber-400 text-slate-900 text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider mb-2">RECOMENDADO</span>
            <p className="text-xs uppercase tracking-widest text-amber-400 font-semibold">Recomendado</p>
            <p className="text-3xl font-bold mt-3">{formatCurrency(relatorio.total_medio)}</p>
            <p className="text-xs text-slate-400 mt-2">Melhor custo-benefício</p>
          </div>
          <div className="text-center p-6 border rounded-lg">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Premium</p>
            <p className="text-2xl font-bold mt-3">{formatCurrency(relatorio.total_maximo)}</p>
            <p className="text-xs text-muted-foreground mt-2">Acabamentos premium</p>
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
