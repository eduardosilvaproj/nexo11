import { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useEstimativaPDF } from '@/hooks/useEstimativaPDF';
import type {
  RelatorioEstimativa, ContextoEstimativa, TipoProjeto,
} from '@/types/estimativa';

interface UploadPDFEstimativaProps {
  onRelatorioGerado: (relatorio: RelatorioEstimativa) => void;
}

export const UploadPDFEstimativa = ({ onRelatorioGerado }: UploadPDFEstimativaProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tipoProjeto, setTipoProjeto] = useState<TipoProjeto | ''>('');
  const [orcamentoStr, setOrcamentoStr] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const { analisarPDF, loading, progress, error } = useEstimativaPDF();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
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
    const orcamentoNum = parseFloat(orcamentoStr.replace(/\./g, '').replace(',', '.'));
    const contexto: ContextoEstimativa = {
      tipo_projeto: tipoProjeto || undefined,
      orcamento_cliente: !isNaN(orcamentoNum) && orcamentoNum > 0 ? orcamentoNum : undefined,
      observacoes: observacoes.trim() || undefined,
    };
    const relatorio = await analisarPDF(selectedFile, contexto);
    if (relatorio) onRelatorioGerado(relatorio);
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Contexto do Projeto</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tipo de projeto <span className="text-muted-foreground">(opcional)</span></Label>
            <Select value={tipoProjeto} onValueChange={(v) => setTipoProjeto(v as TipoProjeto)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="residencial">Residencial</SelectItem>
                <SelectItem value="comercial">Comercial</SelectItem>
                <SelectItem value="corporativo">Corporativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Orçamento do cliente <span className="text-muted-foreground">(opcional)</span></Label>
            <Input
              inputMode="decimal"
              placeholder="R$ Valor que o cliente deseja investir"
              value={orcamentoStr}
              onChange={(e) => setOrcamentoStr(e.target.value)}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Observações <span className="text-muted-foreground">(opcional)</span></Label>
            <Textarea
              rows={3}
              placeholder="Ex: cliente quer investir pouco, prédio para locação, projeto de arquiteta renomada..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>
        </div>

        <div className="border-t pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Projeto PDF</h3>
          </div>

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-border'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {!selectedFile ? (
              <>
                <p className="text-sm text-muted-foreground mb-2">
                  Arraste o PDF aqui ou clique para selecionar
                </p>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileInput}
                  className="hidden"
                  id="pdf-upload"
                />
                <label htmlFor="pdf-upload">
                  <Button variant="outline" className="cursor-pointer" asChild>
                    <span>Selecionar PDF</span>
                  </Button>
                </label>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">{selectedFile.name}</span>
                </div>
                <p className="text-sm text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
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
              <p className="text-sm text-center text-muted-foreground">{progress}</p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="text-sm text-destructive">{error}</div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
