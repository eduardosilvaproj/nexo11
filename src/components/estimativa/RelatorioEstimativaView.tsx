import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle2, Package } from 'lucide-react';
import type { RelatorioEstimativa, MovelIdentificado } from '@/types/estimativa';

interface RelatorioEstimativaViewProps {
  relatorio: RelatorioEstimativa;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const pluralTipo = (tipo: string, qtd: number) => {
  const labels: Record<string, [string, string]> = {
    aereo: ['aéreo', 'aéreos'],
    base: ['base', 'bases'],
    torre: ['torre', 'torres'],
    painel: ['painel', 'painéis'],
    nicho: ['nicho', 'nichos'],
    gaveta: ['gaveteiro', 'gaveteiros'],
    prateleira: ['prateleira', 'prateleiras'],
    guarda_roupa: ['guarda-roupa', 'guarda-roupas'],
    bancada: ['bancada', 'bancadas'],
    rack: ['rack', 'racks'],
    divisoria: ['divisória', 'divisórias'],
    outro: ['peça', 'peças'],
  };
  const [s, p] = labels[tipo] || labels.outro;
  return qtd === 1 ? s : p;
};

interface AmbienteGroup {
  ambiente: string;
  moveis: MovelIdentificado[];
  total_min: number;
  total_max: number;
  total_med: number;
}

const agruparPorAmbiente = (relatorio: RelatorioEstimativa): AmbienteGroup[] => {
  const map = new Map<string, AmbienteGroup>();
  relatorio.moveis.forEach((m) => {
    const key = m.ambiente || 'Outros';
    if (!map.has(key)) {
      map.set(key, { ambiente: key, moveis: [], total_min: 0, total_max: 0, total_med: 0 });
    }
    const g = map.get(key)!;
    g.moveis.push(m);
    const e = relatorio.estimativas.find((x) => x.movel_id === m.id);
    if (e) {
      g.total_min += e.preco_minimo;
      g.total_max += e.preco_maximo;
      g.total_med += e.preco_medio;
    }
  });
  return Array.from(map.values());
};

const resumoAmbiente = (moveis: MovelIdentificado[]): string => {
  const contagem: Record<string, number> = {};
  moveis.forEach((m) => {
    contagem[m.tipo] = (contagem[m.tipo] || 0) + (m.quantidade || 1);
  });
  return Object.entries(contagem)
    .map(([tipo, qtd]) => `${qtd} ${pluralTipo(tipo, qtd)}`)
    .join(', ');
};

const gerarHTML = (relatorio: RelatorioEstimativa, grupos: AmbienteGroup[]): string => {
  const data = new Date(relatorio.data_analise).toLocaleString('pt-BR');
  const ambientesHTML = grupos
    .map(
      (g) => `
      <div class="ambiente">
        <div class="ambiente-head">
          <h3>${g.ambiente}</h3>
          <span class="valor">${formatCurrency(g.total_med)}</span>
        </div>
        <p class="resumo">${resumoAmbiente(g.moveis)}</p>
        <p class="faixa">Faixa: ${formatCurrency(g.total_min)} — ${formatCurrency(g.total_max)}</p>
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
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a1a;max-width:800px;margin:0 auto;padding:40px;}
  header{border-bottom:3px solid #0a0a0a;padding-bottom:20px;margin-bottom:30px;}
  header h1{margin:0;font-size:32px;letter-spacing:2px;}
  header p{margin:4px 0 0;color:#666;font-size:13px;}
  h2{font-size:18px;margin:30px 0 12px;border-bottom:1px solid #ddd;padding-bottom:6px;}
  .resumo-fin{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:16px 0;}
  .resumo-fin div{padding:14px;border:1px solid #e5e5e5;border-radius:6px;text-align:center;}
  .resumo-fin .label{font-size:12px;color:#666;}
  .resumo-fin .val{font-size:20px;font-weight:700;margin-top:4px;}
  .ambiente{border:1px solid #e5e5e5;border-radius:6px;padding:14px;margin-bottom:10px;}
  .ambiente-head{display:flex;justify-content:space-between;align-items:center;}
  .ambiente-head h3{margin:0;font-size:16px;}
  .ambiente-head .valor{font-weight:700;color:#0a7d4a;}
  .resumo{margin:6px 0 4px;color:#333;font-size:14px;}
  .faixa{margin:0;color:#888;font-size:12px;}
  ul{padding-left:20px;font-size:14px;}
  .disclaimer{margin-top:30px;padding:14px;background:#fff8e1;border-left:4px solid #f5b400;font-size:13px;color:#5a4500;}
</style></head><body>
<header><h1>NEXO</h1><p>Relatório de Estimativa — ${data}</p></header>
<section><h2>Resumo Financeiro</h2>
  <div class="resumo-fin">
    <div><div class="label">Mínima</div><div class="val">${formatCurrency(relatorio.total_minimo)}</div></div>
    <div><div class="label">Média</div><div class="val">${formatCurrency(relatorio.total_medio)}</div></div>
    <div><div class="label">Máxima</div><div class="val">${formatCurrency(relatorio.total_maximo)}</div></div>
  </div>
</section>
<section><h2>Detalhamento por Ambiente</h2>${ambientesHTML}</section>
${obsHTML}
<div class="disclaimer"><strong>Importante:</strong> Estimativa preliminar baseada em análise automatizada do projeto. O orçamento final deve ser elaborado no Promob após medição técnica presencial.</div>
</body></html>`;
};

export const RelatorioEstimativaView = ({ relatorio }: RelatorioEstimativaViewProps) => {
  const grupos = agruparPorAmbiente(relatorio);

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
