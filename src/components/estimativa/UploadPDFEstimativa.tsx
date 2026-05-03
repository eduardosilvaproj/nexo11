import { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useEstimativaPDF } from '@/hooks/useEstimativaPDF';
import type { RelatorioEstimativa } from '@/types/estimativa';

interface UploadPDFEstimativaProps {
  onRelatorioGerado: (relatorio: RelatorioEstimativa) => void;
}

export const UploadPDFEstimativa = ({ onRelatorioGerado }: UploadPDFEstimativaProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { analisarPDF, loading, progress, error } = useEstimativaPDF();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]?.type === 'application/pdf') {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
  }, []);

  const handleAnalisar = async () => {
    if (!selectedFile) return;
    const relatorio = await analisarPDF(selectedFile);
    if (relatorio) onRelatorioGerado(relatorio);
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Análise de Projeto PDF</h3>
        </div>

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors \${
            dragActive ? 'border-primary bg-primary/5' : 'border-gray-300'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          {!selectedFile ? (
            <>
              <p className="text-sm text-gray-600 mb-2">Arraste o PDF aqui ou clique para selecionar</p>
              <input type="file" accept="application/pdf" onChange={handleFileInput} className="hidden" id="pdf-upload" />
              <label htmlFor="pdf-upload">
                <Button variant="outline" className="cursor-pointer" asChild>
                  <span>Selecionar PDF</span>
                </Button>
              </label>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">{selectedFile.name}</span>
              </div>
              <p className="text-sm text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={handleAnalisar} disabled={loading}>
                  {loading ? 'Analisando...' : 'Analisar Projeto'}
                </Button>
                <Button variant="outline" onClick={() => setSelectedFile(null)} disabled={loading}>
                  Remover
                </Button>
              </div>
            </div>
          )}
        </div>

        {loading && (
          <div className="space-y-2">
            <Progress value={33} className="w-full" />
            <p className="text-sm text-center text-gray-600">{progress}</p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Identifica apenas móveis planejados</p>
          <p>• Estimativa baseada em dimensões</p>
          <p>• Validação com guia técnico</p>
          <p>• Orçamento final no Promob</p>
        </div>
      </div>
    </Card>
  );
};
