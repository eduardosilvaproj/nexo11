import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  X, Save, Download, ChevronLeft, ChevronRight, 
  MapPin, ArrowRight, Ruler, Circle, Square, Type, Eraser,
  Undo2, Redo2, Loader2, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Annotation {
  id: string;
  type: 'point' | 'arrow' | 'line' | 'circle' | 'rect' | 'text';
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  text: string;
  color: string;
}

interface PhotoWithAnnotations {
  url: string;
  annotations: Annotation[];
}

interface PhotoAnnotationViewerProps {
  photo: PhotoWithAnnotations;
  allPhotos?: PhotoWithAnnotations[];
  onPhotoChange?: (photo: PhotoWithAnnotations) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (annotations: Annotation[]) => void;
}

type Tool = 'point' | 'arrow' | 'line' | 'circle' | 'rect' | 'text' | 'eraser' | 'none';

export function PhotoAnnotationViewer({ 
  photo, 
  allPhotos = [], 
  onPhotoChange,
  open, 
  onOpenChange, 
  onSave 
}: PhotoAnnotationViewerProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [history, setHistory] = useState<Annotation[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTool, setActiveTool] = useState<Tool>('none');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drawingStart, setDrawingStart] = useState<{ x: number, y: number } | null>(null);
  const [tempDrawing, setTempDrawing] = useState<{ x2: number, y2: number } | null>(null);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentIndex = allPhotos.findIndex(p => p.url === photo.url);

  useEffect(() => {
    if (open) {
      const initialAnns = photo.annotations || [];
      setAnnotations(initialAnns);
      setHistory([initialAnns]);
      setHistoryIndex(0);
      setEditingId(null);
      setDrawingStart(null);
      setTempDrawing(null);
    }
  }, [open, photo.url, photo.annotations]);

  const saveToHistory = (newAnns: Annotation[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newAnns);
    if (newHistory.length > 20) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    
    // Autosave trigger
    triggerAutosave(newAnns);
  };

  const triggerAutosave = async (anns: Annotation[]) => {
    setIsSaving(true);
    try {
      await onSave(anns);
    } catch (error) {
      console.error("Autosave failed", error);
    } finally {
      // Small delay to show "Salvo" indicator
      setTimeout(() => setIsSaving(false), 800);
    }
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prevAnns = history[historyIndex - 1];
      setAnnotations(prevAnns);
      setHistoryIndex(historyIndex - 1);
      triggerAutosave(prevAnns);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextAnns = history[historyIndex + 1];
      setAnnotations(nextAnns);
      setHistoryIndex(historyIndex + 1);
      triggerAutosave(nextAnns);
    }
  };

  const getCoords = (e: React.MouseEvent | MouseEvent) => {
    if (!imgRef.current) return { x: 0, y: 0 };
    const rect = imgRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool === 'eraser' || activeTool === 'none') {
      // Se clicar no fundo em modo seleção, deseleciona o elemento atual
      if (activeTool === 'none' && editingId) {
        setEditingId(null);
      }
      return;
    }
    const coords = getCoords(e);
    
    if (['arrow', 'line', 'circle', 'rect'].includes(activeTool)) {
      setDrawingStart(coords);
      setTempDrawing({ x2: coords.x, y2: coords.y });
    } else if (activeTool === 'point' || activeTool === 'text') {
      const id = Math.random().toString(36).substr(2, 9);
      const newAnn: Annotation = {
        id,
        type: activeTool,
        x: coords.x,
        y: coords.y,
        text: "",
        color: activeTool === 'point' ? '#e11d48' : '#eab308'
      };
      const newAnns = [...annotations, newAnn];
      setAnnotations(newAnns);
      saveToHistory(newAnns);
      setEditingId(id);
      setActiveTool('none');
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (drawingStart) {
      const coords = getCoords(e);
      setTempDrawing({ x2: coords.x, y2: coords.y });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (drawingStart && tempDrawing) {
      const coords = getCoords(e);
      const id = Math.random().toString(36).substr(2, 9);
      const newAnn: Annotation = {
        id,
        type: activeTool as any,
        x: drawingStart.x,
        y: drawingStart.y,
        x2: coords.x,
        y2: coords.y,
        text: "",
        color: ['arrow', 'line'].includes(activeTool) ? '#e11d48' : '#eab308'
      };
      const newAnns = [...annotations, newAnn];
      setAnnotations(newAnns);
      saveToHistory(newAnns);
      setEditingId(id);
      setDrawingStart(null);
      setTempDrawing(null);
      setActiveTool('none');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle global shortcuts if user is typing in the annotation input
      if (document.activeElement instanceof HTMLInputElement) return;

      if (e.key === 'Delete' && editingId) {
        const newAnns = annotations.filter(a => a.id !== editingId);
        setAnnotations(newAnns);
        saveToHistory(newAnns);
        setEditingId(null);
      }
      if (e.key === 'Escape') {
        setEditingId(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingId, annotations, history, historyIndex]);

  const handleAnnotationClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (activeTool === 'eraser') {
      const newAnns = annotations.filter(a => a.id !== id);
      setAnnotations(newAnns);
      saveToHistory(newAnns);
    } else {
      setEditingId(id);
    }
  };

  const handleDownload = async (withAnnotations: boolean) => {
    if (!withAnnotations) {
      window.open(photo.url, '_blank');
      return;
    }

    // Simple canvas rendering for download
    const canvas = document.createElement('canvas');
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = photo.url;
    
    await new Promise(resolve => img.onload = resolve);
    
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, 0, 0);
    
    annotations.forEach(ann => {
      const x = (ann.x / 100) * canvas.width;
      const y = (ann.y / 100) * canvas.height;
      const x2 = ann.x2 ? (ann.x2 / 100) * canvas.width : 0;
      const y2 = ann.y2 ? (ann.y2 / 100) * canvas.height : 0;

      ctx.strokeStyle = ann.color;
      ctx.fillStyle = ann.color;
      ctx.lineWidth = canvas.width / 200;
      ctx.font = `${canvas.width / 50}px Arial`;

      if (ann.type === 'point') {
        ctx.beginPath();
        ctx.arc(x, y, canvas.width / 150, 0, Math.PI * 2);
        ctx.fill();
      } else if (ann.type === 'line' || ann.type === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        if (ann.type === 'arrow') {
            const angle = Math.atan2(y2 - y, x2 - x);
            ctx.beginPath();
            ctx.moveTo(x2, y2);
            ctx.lineTo(x2 - 20 * Math.cos(angle - Math.PI / 6), y2 - 20 * Math.sin(angle - Math.PI / 6));
            ctx.lineTo(x2 - 20 * Math.cos(angle + Math.PI / 6), y2 - 20 * Math.sin(angle + Math.PI / 6));
            ctx.closePath();
            ctx.fill();
        }
      } else if (ann.type === 'circle') {
        const r = Math.sqrt(Math.pow(x2 - x, 2) + Math.pow(y2 - y, 2));
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (ann.type === 'rect') {
        ctx.strokeRect(x, y, x2 - x, y2 - y);
      }

      if (ann.text) {
        ctx.fillStyle = "black";
        const textWidth = ctx.measureText(ann.text).width;
        ctx.fillRect(x, y - (canvas.width / 40), textWidth + 10, canvas.width / 40);
        ctx.fillStyle = "white";
        ctx.fillText(ann.text, x + 5, y - 5);
      }
    });

    const link = document.createElement('a');
    link.download = `medicao-anotada-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const navigatePhoto = (dir: 'prev' | 'next') => {
    if (!onPhotoChange || !allPhotos.length) return;
    const nextIdx = dir === 'next' 
      ? (currentIndex + 1) % allPhotos.length 
      : (currentIndex - 1 + allPhotos.length) % allPhotos.length;
    onPhotoChange(allPhotos[nextIdx]);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      // Only allow closing if val is false, and it's not triggered by Enter/Esc in the input
      if (!val) {
        onOpenChange(false);
      }
    }}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] flex flex-col p-0 overflow-hidden bg-neutral-900 border-none">
        <DialogHeader className="p-4 bg-neutral-900 border-b border-neutral-800 shrink-0 flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <DialogTitle className="text-white text-lg">Anotar Medidas</DialogTitle>
              <div className="flex items-center gap-2 mt-0.5">
                {isSaving ? (
                  <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Salvando...
                  </span>
                ) : (
                  <span className="text-[10px] text-green-500 flex items-center gap-1">
                    Salvo ✓
                  </span>
                )}
              </div>
            </div>
            {allPhotos.length > 0 && (
              <span className="text-neutral-400 text-sm">
                {currentIndex + 1} de {allPhotos.length} fotos
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-neutral-800">
                  <Download className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2 bg-neutral-800 border-neutral-700 text-white">
                <div className="flex flex-col gap-1">
                  <Button variant="ghost" className="justify-start text-xs h-8 text-white hover:bg-neutral-700" onClick={() => handleDownload(false)}>
                    Baixar original
                  </Button>
                  <Button variant="ghost" className="justify-start text-xs h-8 text-white hover:bg-neutral-700" onClick={() => handleDownload(true)}>
                    Baixar com anotações
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-white hover:bg-neutral-800">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
          {allPhotos.length > 1 && (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute left-4 z-20 text-white bg-black/50 hover:bg-black/80 rounded-full w-12 h-12"
                onClick={() => navigatePhoto('prev')}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-4 z-20 text-white bg-black/50 hover:bg-black/80 rounded-full w-12 h-12"
                onClick={() => navigatePhoto('next')}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            </>
          )}

          <div 
            ref={containerRef}
            className={`relative inline-block max-w-full max-h-full ${activeTool === 'none' ? 'cursor-default' : 'cursor-crosshair'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <img 
              ref={imgRef}
              src={photo.url} 
              alt="Ambiente" 
              className="max-w-full max-h-[75vh] block select-none object-contain"
              draggable={false}
            />
            
            <svg 
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {annotations.map((ann) => {
                const isSelected = editingId === ann.id;
                const strokeWidth = 0.5;
                
                return (
                  <g key={ann.id} className="pointer-events-auto cursor-pointer" onClick={(e) => handleAnnotationClick(e, ann.id)}>
                    {ann.type === 'point' && (
                      <circle cx={ann.x} cy={ann.y} r="1" fill={ann.color} stroke="white" strokeWidth="0.2" />
                    )}
                    {(ann.type === 'line' || ann.type === 'arrow') && ann.x2 !== undefined && (
                      <>
                        <line x1={ann.x} y1={ann.y} x2={ann.x2} y2={ann.y2} stroke={ann.color} strokeWidth={strokeWidth} />
                        {ann.type === 'arrow' && (
                          <marker id={`arrowhead-${ann.id}`} markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill={ann.color} />
                          </marker>
                        )}
                      </>
                    )}
                    {ann.type === 'circle' && ann.x2 !== undefined && (
                      <circle 
                        cx={ann.x} 
                        cy={ann.y} 
                        r={Math.sqrt(Math.pow(ann.x2 - ann.x, 2) + Math.pow(ann.y2 - ann.y, 2))} 
                        fill="none" 
                        stroke={ann.color} 
                        strokeWidth={strokeWidth} 
                      />
                    )}
                    {ann.type === 'rect' && ann.x2 !== undefined && (
                      <rect 
                        x={Math.min(ann.x, ann.x2)} 
                        y={Math.min(ann.y, ann.y2)} 
                        width={Math.abs(ann.x2 - ann.x)} 
                        height={Math.abs(ann.y2 - ann.y)} 
                        fill="none" 
                        stroke={ann.color} 
                        strokeWidth={strokeWidth} 
                      />
                    )}
                  </g>
                );
              })}

              {/* Temp drawing while dragging */}
              {drawingStart && tempDrawing && (
                <g>
                  {(activeTool === 'line' || activeTool === 'arrow') && (
                    <line x1={drawingStart.x} y1={drawingStart.y} x2={tempDrawing.x2} y2={tempDrawing.y2} stroke="#e11d48" strokeWidth="0.5" strokeDasharray="1,1" />
                  )}
                  {activeTool === 'circle' && (
                    <circle cx={drawingStart.x} cy={drawingStart.y} r={Math.sqrt(Math.pow(tempDrawing.x2 - drawingStart.x, 2) + Math.pow(tempDrawing.y2 - drawingStart.y, 2))} fill="none" stroke="#eab308" strokeWidth="0.5" strokeDasharray="1,1" />
                  )}
                  {activeTool === 'rect' && (
                    <rect x={Math.min(drawingStart.x, tempDrawing.x2)} y={Math.min(drawingStart.y, tempDrawing.y2)} width={Math.abs(tempDrawing.x2 - drawingStart.x)} height={Math.abs(tempDrawing.y2 - drawingStart.y)} fill="none" stroke="#eab308" strokeWidth="0.5" strokeDasharray="1,1" />
                  )}
                </g>
              )}
            </svg>

            {/* Labels overlay */}
            {annotations.map((ann) => (
              <div
                key={ann.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{ left: `${ann.x}%`, top: `${ann.y}%` }}
              >
                {ann.text && (
                  <div className="bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap mb-8">
                    {ann.text}
                  </div>
                )}
                
                {editingId === ann.id && (
                  <div 
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white p-2 rounded-lg shadow-xl border flex items-center gap-2 z-30 pointer-events-auto"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.nativeEvent.stopImmediatePropagation();
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Input
                      autoFocus
                      placeholder={ann.type === 'text' ? "Anotação" : "Medida (ex: 2.70m)"}
                      value={ann.text}
                      onChange={(e) => {
                        const newAnns = [...annotations];
                        const a = newAnns.find(x => x.id === ann.id);
                        if (a) a.text = e.target.value;
                        setAnnotations(newAnns);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                          saveToHistory(annotations);
                          setEditingId(null);
                          setActiveTool('none');
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditingId(null);
                          setActiveTool('none');
                        }
                      }}
                      className="h-8 w-32 text-xs"
                    />
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-7 w-7 text-red-500 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newAnns = annotations.filter(a => a.id !== ann.id);
                        setAnnotations(newAnns);
                        saveToHistory(newAnns);
                        setEditingId(null);
                      }}
                    >
                      <Eraser className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-neutral-900 border-t border-neutral-800 shrink-0 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 p-1 bg-neutral-800 rounded-lg">
            <Button
              variant="ghost"
              size="sm"
              disabled={historyIndex <= 0}
              onClick={undo}
              className="text-neutral-400 hover:text-white h-9 px-3"
              title="Desfazer (Ctrl+Z)"
            >
              <Undo2 className="h-4 w-4 mr-2" />
              <span className="text-xs">Desfazer</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={historyIndex >= history.length - 1}
              onClick={redo}
              className="text-neutral-400 hover:text-white h-9 px-3"
              title="Refazer (Ctrl+Y)"
            >
              <Redo2 className="h-4 w-4 mr-2" />
              <span className="text-xs">Refazer</span>
            </Button>
            <div className="w-[1px] h-4 bg-neutral-700 mx-1" />
            {[
              { id: 'point', icon: MapPin, label: 'Ponto' },
              { id: 'arrow', icon: ArrowRight, label: 'Seta' },
              { id: 'line', icon: Ruler, label: 'Linha' },
              { id: 'circle', icon: Circle, label: 'Círculo' },
              { id: 'rect', icon: Square, label: 'Retângulo' },
              { id: 'text', icon: Type, label: 'Texto' },
              { id: 'eraser', icon: Eraser, label: 'Borracha' },
            ].map((tool) => (
              <Button
                key={tool.id}
                variant={activeTool === tool.id ? 'secondary' : 'ghost'}
                size="sm"
                className={`flex items-center gap-2 h-9 px-3 ${activeTool === tool.id ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'}`}
                onClick={() => setActiveTool(tool.id as Tool)}
              >
                <tool.icon className="h-4 w-4" />
                <span className="text-xs">{tool.label}</span>
              </Button>
            ))}
          </div>

          <div className="w-full flex justify-between items-center">
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-medium">
              {activeTool === 'eraser' ? 'Clique em um elemento para apagar' : 'Clique ou arraste na foto para anotar'}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="border-neutral-700 text-neutral-400 hover:bg-neutral-800 px-8">
                Fechar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}