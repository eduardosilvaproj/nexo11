// ============================================
// NEXO CAPTURE — React Components
// ============================================

import React, { useState, useCallback } from 'react';
import { Upload, FileText, Download, Eye, Settings, CheckCircle, XCircle, Loader2 } from 'lucide-react';

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
// CaptureImport — Upload Component
// ============================================

export function CaptureImport() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<string>('json');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [project, setProject] = useState<Project | null>(null);

  // JSON data for structured import
  const [jsonData, setJsonData] = useState<string>('');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  }, []);

  const handleJSONImport = async () => {
    try {
      const data: ImportData = JSON.parse(jsonData);

      setIsProcessing(true);
      setProgress(10);

      // Simular chamada à API
      const response = await fetch('/api/capture/import/json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          projectName: `Projeto ${new Date().toLocaleDateString()}`,
        }),
      });

      setProgress(50);

      if (!response.ok) throw new Error('Erro na importação');

      const result = await response.json();
      setProgress(100);

      setProject({
        id: result.projectId,
        name: result.name,
        status: result.status,
        wallCount: result.stats.wallCount,
        doorCount: result.stats.doorCount,
        windowCount: result.stats.windowCount,
        totalArea: result.stats.totalArea,
        createdAt: result.createdAt,
      });
    } catch (error) {
      console.error('Import error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateSKP = async () => {
    if (!project) return;

    setIsProcessing(true);
    setProgress(0);

    // Simular geração
    for (let i = 0; i <= 100; i += 10) {
      await new Promise((r) => setTimeout(r, 200));
      setProgress(i);
    }

    setProject({ ...project, status: 'completed', skpUrl: '#' });
    setIsProcessing(false);
  };

  return (
    <div className="nexo-capture-import p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
          <Upload className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Importar Planta</h2>
          <p className="text-sm text-slate-500">Converta plantas para SketchUp</p>
        </div>
      </div>

      {/* Import Type Selector */}
      <div className="flex gap-2">
        {(['json', 'dwg', 'pdf'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setImportType(type)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              importType === type
                ? 'bg-blue-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {type.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Import Area */}
      {importType === 'json' ? (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Dados da Planta (JSON)
          </label>
          <textarea
            value={jsonData}
            onChange={(e) => setJsonData(e.target.value)}
            placeholder={`{
  "walls": [
    { "start": [0, 0], "end": [3500, 0] },
    { "start": [3500, 0], "end": [3500, 4000] }
  ],
  "doors": [
    { "wallIndex": 0, "position": 1200, "width": 800 }
  ],
  "windows": [
    { "wallIndex": 1, "position": 1800, "width": 1200, "height": 1000 }
  ]
}`}
            className="w-full h-64 p-4 font-mono text-sm border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={handleJSONImport}
            disabled={!jsonData || isProcessing}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Importar JSON
              </>
            )}
          </button>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-300 hover:border-slate-400'
          }`}
        >
          <input
            type="file"
            accept={importType === 'json' ? '.json' : importType === 'dwg' ? '.dwg,.dxf' : '.pdf'}
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <FileText className="w-12 h-12 mx-auto text-slate-400 mb-4" />
            <p className="text-slate-600 mb-2">
              {file ? file.name : 'Arraste ou clique para selecionar'}
            </p>
            <p className="text-sm text-slate-400">
              {importType === 'dwg' ? 'DWG, DXF' : 'PDF'} até 50MB
            </p>
          </label>
        </div>
      )}

      {/* Progress Bar */}
      {isProcessing && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Processando...</span>
            <span className="text-blue-500 font-medium">{progress}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Project Result */}
      {project && (
        <div className="bg-slate-50 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">{project.name}</h3>
            <StatusBadge status={project.status} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Paredes" value={project.wallCount} />
            <StatCard label="Portas" value={project.doorCount} />
            <StatCard label="Janelas" value={project.windowCount} />
            <StatCard label="Área" value={`${project.totalArea}m²`} />
          </div>

          {project.status === 'completed' && (
            <div className="flex gap-3 pt-4">
              <button className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                Download SKP
              </button>
              <button className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 flex items-center justify-center gap-2">
                <Eye className="w-4 h-4" />
                Preview 3D
              </button>
            </div>
          )}

          {project.status === 'pending' && !isProcessing && (
            <button
              onClick={handleGenerateSKP}
              className="w-full px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 flex items-center justify-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Gerar Arquivo SketchUp
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Status Badge
// ============================================

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

// ============================================
// Stat Card
// ============================================

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-lg p-4 border border-slate-200">
      <p className="text-sm text-slate-500 mb-1">{label}</p>
      <p className="text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

// ============================================
// 3D Preview Component (placeholder)
// ============================================

export function CapturePreview3D({ projectId }: { projectId: string }) {
  return (
    <div className="nexo-capture-preview bg-slate-900 rounded-xl aspect-video flex items-center justify-center">
      <div className="text-center text-white">
        <Eye className="w-12 h-12 mx-auto mb-4 text-slate-500" />
        <p className="text-slate-400">Viewer 3D</p>
        <p className="text-sm text-slate-500">Projeto: {projectId}</p>
      </div>
    </div>
  );
}

// ============================================
// Example JSON Generator
// ============================================

export function generateExampleJSON(): string {
  return JSON.stringify(
    {
      walls: [
        { start: [0, 0], end: [3500, 0], thickness: 150 },
        { start: [3500, 0], end: [3500, 4000], thickness: 150 },
        { start: [3500, 4000], end: [0, 4000], thickness: 150 },
        { start: [0, 4000], end: [0, 0], thickness: 150 },
      ],
      doors: [
        { wallIndex: 0, position: 1200, width: 800, height: 2100, type: 'pivot' },
        { wallIndex: 2, position: 1800, width: 900, height: 2100, type: 'pivot' },
      ],
      windows: [
        { wallIndex: 1, position: 1800, width: 1200, height: 1000, sill: 1100, type: 'correr' },
      ],
    },
    null,
    2
  );
}