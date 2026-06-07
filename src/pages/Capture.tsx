// ============================================
// NEXO CAPTURE — Página Principal
// ============================================

import { useState } from 'react';
import { Upload, FileText, Download, Eye, Settings, CheckCircle, XCircle, Loader2, UploadCloud, Layers, Box, Ruler } from 'lucide-react';

// ============================================
// Types
// ============================================

interface Project {
  id: string;
  name: string;
  status: 'pending' | 'parsing' | 'validating' | 'generating' | 'completed' | 'failed';
  wallCount: number;
  doorCount: number;
  windowCount: number;
  totalArea: number;
  createdAt: string;
  skpUrl?: string;
}

interface ImportData {
  walls: Array<{
    start: [number, number];
    end: [number, number];
    thickness?: number;
  }>;
  doors?: Array<{
    wallIndex: number;
    position: number;
    width: number;
    height?: number;
  }>;
  windows?: Array<{
    wallIndex: number;
    position: number;
    width: number;
    height: number;
    sill?: number;
  }>;
}

// ============================================
// CapturePage
// ============================================

export default function CapturePage() {
  const [importType, setImportType] = useState<'json' | 'dwg' | 'pdf'>('json');
  const [jsonData, setJsonData] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleJSONImport = async () => {
    try {
      setError(null);
      const data: ImportData = JSON.parse(jsonData);

      setIsProcessing(true);
      setProgress(10);

      // Simular chamada à API
      await new Promise(r => setTimeout(r, 500));
      setProgress(30);

      // Simular parsing
      await new Promise(r => setTimeout(r, 800));
      setProgress(50);

      // Simular validação
      await new Promise(r => setTimeout(r, 400));
      setProgress(70);

      // Simular geração
      await new Promise(r => setTimeout(r, 1000));
      setProgress(100);

      // Resultado
      setProject({
        id: crypto.randomUUID(),
        name: data.walls.length > 0 ? `Projeto ${data.walls.length} paredes` : 'Novo Projeto',
        status: 'completed',
        wallCount: data.walls.length,
        doorCount: data.doors?.length || 0,
        windowCount: data.windows?.length || 0,
        totalArea: calculateArea(data.walls),
        createdAt: new Date().toISOString(),
        skpUrl: '#',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao processar');
    } finally {
      setIsProcessing(false);
    }
  };

  const loadExample = () => {
    setJsonData(JSON.stringify({
      walls: [
        { start: [0, 0], end: [3500, 0], thickness: 150 },
        { start: [3500, 0], end: [3500, 4000], thickness: 150 },
        { start: [3500, 4000], end: [0, 4000], thickness: 150 },
        { start: [0, 4000], end: [0, 0], thickness: 150 },
      ],
      doors: [
        { wallIndex: 0, position: 1200, width: 800, height: 2100 },
      ],
      windows: [
        { wallIndex: 1, position: 1800, width: 1200, height: 1000, sill: 1100 },
      ],
    }, null, 2));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <UploadCloud className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">NEXO Capture</h1>
            <p className="text-slate-500">Importar plantas e gerar arquivos SketchUp</p>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Layers className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Paredes</p>
              <p className="text-lg font-semibold text-slate-900">2700mm altura</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Box className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Espessura</p>
              <p className="text-lg font-semibold text-slate-900">150mm padrão</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Ruler className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Unidade</p>
              <p className="text-lg font-semibold text-slate-900">Milímetros</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Import Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-500" />
              Importar Planta
            </h2>
          </div>

          <div className="p-6 space-y-5">
            {/* Type Selector */}
            <div className="flex gap-2">
              {(['json', 'dwg', 'pdf'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setImportType(type)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    importType === type
                      ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {type.toUpperCase()}
                </button>
              ))}
            </div>

            {/* JSON Input */}
            {importType === 'json' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-700">
                    Dados da Planta (JSON)
                  </label>
                  <button
                    onClick={loadExample}
                    className="text-xs text-blue-500 hover:text-blue-600 font-medium"
                  >
                    Carregar exemplo
                  </button>
                </div>
                <textarea
                  value={jsonData}
                  onChange={(e) => setJsonData(e.target.value)}
                  placeholder={`{
  "walls": [
    { "start": [0, 0], "end": [3500, 0] }
  ],
  "doors": [...],
  "windows": [...]
}`}
                  className="w-full h-56 p-4 font-mono text-sm border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
                <button
                  onClick={handleJSONImport}
                  disabled={!jsonData || isProcessing}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processando... {progress}%
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Importar e Gerar SKP
                    </>
                  )}
                </button>
              </div>
            )}

            {/* DWG/PDF Placeholder */}
            {importType !== 'json' && (
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                <p className="text-slate-600 mb-2">
                  Upload de {importType.toUpperCase()}
                </p>
                <p className="text-sm text-slate-400">
                  Disponível em breve
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Result Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Eye className="w-5 h-5 text-green-500" />
              Resultado
            </h2>
          </div>

          <div className="p-6">
            {project ? (
              <div className="space-y-5">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">{project.name}</h3>
                  <StatusBadge status={project.status} />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs text-slate-500 mb-1">Paredes</p>
                    <p className="text-2xl font-bold text-slate-900">{project.wallCount}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs text-slate-500 mb-1">Portas</p>
                    <p className="text-2xl font-bold text-slate-900">{project.doorCount}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs text-slate-500 mb-1">Janelas</p>
                    <p className="text-2xl font-bold text-slate-900">{project.windowCount}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs text-slate-500 mb-1">Área</p>
                    <p className="text-2xl font-bold text-slate-900">{project.totalArea}m²</p>
                  </div>
                </div>

                {/* Actions */}
                {project.status === 'completed' && (
                  <div className="flex gap-3 pt-2">
                    <button className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-600 flex items-center justify-center gap-2 shadow-lg shadow-green-500/30">
                      <Download className="w-4 h-4" />
                      Download SKP
                    </button>
                    <button className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 flex items-center justify-center gap-2">
                      <Eye className="w-4 h-4" />
                      Preview
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Settings className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">
                  Importe uma planta para ver o resultado
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {isProcessing && (
        <div className="mt-6 bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-600">Processando...</span>
            <span className="text-blue-500 font-medium">{progress}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-8 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
        <p className="text-sm text-blue-800 text-center">
          <strong>Formato SKP:</strong> Paredes, portas e janelas são criados como componentes SketchUp compatíveis com Promob Connect.
          Altura padrão: 2700mm | Espessura: 150mm | Unidade: milímetros
        </p>
      </div>
    </div>
  );
}

// ============================================
// Helpers
// ============================================

function calculateArea(walls: { start: [number, number]; end: [number, number] }[]): number {
  // Simple bounding box calculation
  if (walls.length === 0) return 0;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const w of walls) {
    minX = Math.min(minX, w.start[0], w.end[0]);
    minY = Math.min(minY, w.start[1], w.end[1]);
    maxX = Math.max(maxX, w.start[0], w.end[0]);
    maxY = Math.max(maxY, w.start[1], w.end[1]);
  }
  const width = (maxX - minX) / 1000;
  const height = (maxY - minY) / 1000;
  return Math.round(width * height * 100) / 100;
}

function StatusBadge({ status }: { status: Project['status'] }) {
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    pending: { bg: 'bg-slate-100', text: 'text-slate-600', icon: <Loader2 className="w-3 h-3" /> },
    parsing: { bg: 'bg-blue-100', text: 'text-blue-600', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    validating: { bg: 'bg-blue-100', text: 'text-blue-600', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    generating: { bg: 'bg-amber-100', text: 'text-amber-600', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    completed: { bg: 'bg-green-100', text: 'text-green-600', icon: <CheckCircle className="w-3 h-3" /> },
    failed: { bg: 'bg-red-100', text: 'text-red-600', icon: <XCircle className="w-3 h-3" /> },
  };

  const labels: Record<string, string> = {
    pending: 'Pendente',
    parsing: 'Processando',
    validating: 'Validando',
    generating: 'Gerando',
    completed: 'Concluído',
    failed: 'Erro',
  };

  const { bg, text, icon } = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
      {icon}
      {labels[status]}
    </span>
  );
}