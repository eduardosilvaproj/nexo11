import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle2, Package, User, Building2, PenTool, Calendar } from 'lucide-react';
import type { RelatorioEstimativa, MovelIdentificado } from '@/types/estimativa';

interface RelatorioEstimativaViewProps {
  relatorio: RelatorioEstimativa;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface AmbienteGroup {
  ambiente: string;
  moveis: MovelIdentificado[];
  qtd_pecas: number;
  total_min: number;
  total_max: number;
  total_med: number;
}

const agruparPorAmbiente = (relatorio: RelatorioEstimativa): AmbienteGroup[] => {
  const map = new Map<string, AmbienteGroup>();
  relatorio.moveis.forEach((m) => {
    const key = m.ambiente || 'Outros';
    if (!map.has(key)) {
      map.set(key, { ambiente: key, moveis: [], qtd_pecas: 0, total_min: 0, total_max: 0, total_med: 0 });
    }
    const g = map.get(key)!;
    g.moveis.push(m);
    g.qtd_pecas += m.quantidade || 1;
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

const gerarHTML = (relatorio: RelatorioEstimativa, grupos: AmbienteGroup[]): string => {
  const data = new Date(relatorio.data_analise).toLocaleString('pt-BR');
  const d = relatorio.dados_projeto || {};
  const totalPecas = grupos.reduce((s, g) => s + g.qtd_pecas, 0);

  const projetoHTML = temDadosProjeto(relatorio)
    ? `<section><h2>Dados do Projeto</h2>
        <div class="projeto">
          ${d.nome_cliente ? `<div><span class="lbl">Cliente</span><span class="val">${d.nome_cliente}</span></div>` : ''}
          ${d.nome_obra ? `<div><span class="lbl">Obra</span><span class="val">${d.nome_obra}</span></div>` : ''}
          ${d.arquiteto ? `<div><span class="lbl">Arquiteto</span><span class="val">${d.arquiteto}</span></div>` : ''}
          ${d.data_projeto ? `<div><span class="lbl">Data do Projeto</span><span class="val">${d.data_projeto}</span></div>` : ''}
        </div>
       </section>`
    : '';

  const ambientesHTML = grupos
    .map(
      (g) => `
      <div class="ambiente">
        <div class="ambiente-head">
          <div>
            <h3>${g.ambiente}</h3>
            <p class="pecas">${g.qtd_pecas} ${g.qtd_pecas === 1 ? 'peça' : 'peças'}</p>
          </div>
          <div class="valores">
            <div class="valor-med">${formatCurrency(g.total_med)}</div>
            <div class="faixa">${formatCurrency(g.total_min)} — ${formatCurrency(g.total_max)}</div>
          </div>
        </div>
      </div>`
    )
    .join('');

  const obsHTML = relatorio.observacoes_gerais.length
    ? `<section><h2>Especificações Técnicas</h2><ul>${relatorio.observacoes_gerais
        .map((o) => `<li>${o}</li>`)
        .join('')}</ul></section>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><title>Estimativa NEXO</title>
<style>
  *{box-sizing:border-box;}
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a1a;max-width:840px;margin:0 auto;padding:40px;background:#fff;}
  header{background:linear-gradient(135deg,#0a0a0a,#2a2a2a);color:#fff;padding:28px 32px;border-radius:10px;margin-bottom:28px;}
  header h1{margin:0;font-size:34px;letter-spacing:4px;font-weight:800;}
  header p{margin:6px 0 0;color:#bbb;font-size:13px;}
  header .badge{display:inline-block;margin-top:10px;padding:4px 10px;background:rgba(255,255,255,.1);border-radius:4px;font-size:11px;letter-spacing:1px;}
  h2{font-size:16px;margin:28px 0 12px;text-transform:uppercase;letter-spacing:1.5px;color:#555;font-weight:700;}
  .projeto{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;}
  .projeto>div{padding:12px 14px;background:#f7f7f7;border-radius:6px;display:flex;flex-direction:column;}
  .projeto .lbl{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888;}
  .projeto .val{font-size:15px;font-weight:600;margin-top:2px;color:#111;}
  .resumo-fin{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:12px 0;}
  .resumo-fin .card{padding:18px;border-radius:8px;text-align:center;}
  .resumo-fin .min{background:#f0f4f8;color:#334155;}
  .resumo-fin .med{background:linear-gradient(135deg,#1e3a5f,#0a7d4a);color:#fff;}
  .resumo-fin .max{background:#fff3e8;color:#7a3e15;}
  .resumo-fin .label{font-size:11px;text-transform:uppercase;letter-spacing:1.5px;opacity:.8;}
  .resumo-fin .val{font-size:22px;font-weight:800;margin-top:6px;}
  .ambiente{border:1px solid #e5e5e5;border-radius:8px;padding:16px 18px;margin-bottom:10px;background:#fff;}
  .ambiente-head{display:flex;justify-content:space-between;align-items:center;gap:12px;}
  .ambiente-head h3{margin:0;font-size:16px;font-weight:700;}
  .ambiente-head .pecas{margin:2px 0 0;color:#888;font-size:12px;}
  .ambiente-head .valores{text-align:right;}
  .ambiente-head .valor-med{font-weight:800;color:#0a7d4a;font-size:18px;}
  .ambiente-head .faixa{font-size:11px;color:#999;margin-top:2px;}
  ul{padding-left:20px;font-size:13px;color:#444;}
  .disclaimer{margin-top:30px;padding:16px;background:#fff8e1;border-left:4px solid #f5b400;font-size:12px;color:#5a4500;border-radius:4px;}
  .footer{margin-top:24px;text-align:center;font-size:11px;color:#999;}
</style></head><body>
<header>
  <h1>NEXO</h1>
  <p>Relatório de Estimativa Preliminar — ${data}</p>
  <span class="badge">${totalPecas} peças · ${grupos.length} ambientes</span>
</header>
${projetoHTML}
<section><h2>Resumo Financeiro</h2>
  <div class="resumo-fin">
    <div class="card min"><div class="label">Mínima</div><div class="val">${formatCurrency(relatorio.total_minimo)}</div></div>
    <div class="card med"><div class="label">Média</div><div class="val">${formatCurrency(relatorio.total_medio)}</div></div>
    <div class="card max"><div class="label">Máxima</div><div class="val">${formatCurrency(relatorio.total_maximo)}</div></div>
  </div>
</section>
<section><h2>Ambientes</h2>${ambientesHTML}</section>
${obsHTML}
<div class="disclaimer"><strong>Importante:</strong> Estimativa preliminar baseada em análise automatizada do projeto. O orçamento final deve ser elaborado no Promob após medição técnica presencial.</div>
<div class="footer">NEXO · Estimativa gerada automaticamente</div>
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
        <h3 className="text-lg font-semibold mb-4">Resumo Financeiro</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Mínima</p>
            <p className="text-2xl font-bold">{formatCurrency(relatorio.total_minimo)}</p>
          </div>
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Média</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(relatorio.total_medio)}</p>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Máxima</p>
            <p className="text-2xl font-bold">{formatCurrency(relatorio.total_maximo)}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Ambientes ({grupos.length})</h3>
        </div>
        <div className="space-y-3">
          {grupos.map((g) => (
            <div key={g.ambiente} className="p-4 border rounded-lg flex items-center justify-between">
              <div>
                <p className="font-semibold text-base">{g.ambiente}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {g.qtd_pecas} {g.qtd_pecas === 1 ? 'peça' : 'peças'}
                </p>
              </div>
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

      {relatorio.observacoes_gerais.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Especificações Técnicas</h3>
          <ul className="space-y-2">
            {relatorio.observacoes_gerais.map((obs, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <span>{obs}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-4 bg-amber-50 border-amber-200">
        <p className="text-sm text-amber-800">
          <strong>Importante:</strong> Estimativa preliminar. Orçamento final deve ser feito no Promob após medição técnica.
        </p>
      </Card>
    </div>
  );
};
