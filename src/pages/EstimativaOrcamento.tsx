import { useState } from 'react';
import { UploadPDFEstimativa } from '@/components/estimativa/UploadPDFEstimativa';
import { RelatorioEstimativaView } from '@/components/estimativa/RelatorioEstimativaView';
import type { RelatorioEstimativa } from '@/types/estimativa';

export default function EstimativaOrcamento() {
  const [relatorio, setRelatorio] = useState<RelatorioEstimativa | null>(null);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Estimativa de Orçamento</h1>
        <p className="text-gray-600">
          Análise inteligente de projetos PDF para estimativa rápida de preços
        </p>
      </div>

      {!relatorio ? (
        <UploadPDFEstimativa onRelatorioGerado={setRelatorio} />
      ) : (
        <div className="space-y-4">
          <button
            onClick={() => setRelatorio(null)}
            className="text-sm text-primary hover:underline"
          >
            ← Nova análise
          </button>
          <RelatorioEstimativaView relatorio={relatorio} />
        </div>
      )}
    </div>
  );
}
