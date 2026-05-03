import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, AlertTriangle, CheckCircle2, Package } from 'lucide-react';
import type { RelatorioEstimativa } from '@/types/estimativa';

interface RelatorioEstimativaViewProps {
  relatorio: RelatorioEstimativa;
}

export const RelatorioEstimativaView = ({ relatorio }: RelatorioEstimativaViewProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Relatório de Estimativa</h2>
            <p className="text-sm text-gray-600">
              Análise realizada em {new Date(relatorio.data_analise).toLocaleString('pt-BR')}
            </p>
          </div>
          <Button className="gap-2">
            <Download className="h-4 w-4" />
            Baixar PDF
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Resumo Financeiro</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Estimativa Mínima</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(relatorio.total_minimo)}</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Estimativa Média</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(relatorio.total_medio)}</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Estimativa Máxima</p>
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(relatorio.total_maximo)}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Móveis Identificados ({relatorio.moveis.length})</h3>
        </div>
        <div className="space-y-3">
          {relatorio.moveis.map((movel) => {
            const estimativa = relatorio.estimativas.find(e => e.movel_id === movel.id);
            const hasAlertas = movel.alertas && movel.alertas.length > 0;
            return (
              <div key={movel.id} className={`p-4 border rounded-lg ${hasAlertas ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{movel.ambiente}</span>
                      <span className="text-xs px-2 py-1 bg-gray-100 rounded">{movel.tipo}</span>
                      {movel.quantidade > 1 && (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">{movel.quantidade}x</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{movel.descricao}</p>
                    {movel.largura && movel.altura && (
                      <p className="text-xs text-gray-500 mt-1">
                        Dimensões: {movel.largura}cm (L) × {movel.altura}cm (A)
                        {movel.profundidade && ` × ${movel.profundidade}cm (P)`}
                      </p>
                    )}
                  </div>
                  {estimativa && (
                    <div className="text-right ml-4">
                      <p className="text-sm text-gray-600">Estimativa</p>
                      <p className="font-semibold text-green-600">{formatCurrency(estimativa.preco_medio)}</p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(estimativa.preco_minimo)} - {formatCurrency(estimativa.preco_maximo)}
                      </p>
                    </div>
                  )}
                </div>
                {hasAlertas && (
                  <div className="mt-3 pt-3 border-t border-yellow-200">
                    {movel.alertas!.map((alerta, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm text-yellow-800">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span>{alerta}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {relatorio.observacoes_gerais.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Observações Gerais</h3>
          <ul className="space-y-2">
            {relatorio.observacoes_gerais.map((obs, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
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
