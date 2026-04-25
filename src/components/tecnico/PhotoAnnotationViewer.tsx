import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Save, Plus } from "lucide-react";
import { toast } from "sonner";

interface Annotation {
  x: number;
  y: number;
  text: string;
}

interface PhotoWithAnnotations {
  url: string;
  annotations: Annotation[];
}

interface PhotoAnnotationViewerProps {
  photo: PhotoWithAnnotations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (annotations: Annotation[]) => void;
}

export function PhotoAnnotationViewer({ photo, open, onOpenChange, onSave }: PhotoAnnotationViewerProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (open) {
      setAnnotations(photo.annotations || []);
      setEditingIndex(null);
    }
  }, [open, photo.annotations]);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newAnnotation: Annotation = { x, y, text: "" };
    setAnnotations([...annotations, newAnnotation]);
    setEditingIndex(annotations.length);
  };

  const updateAnnotationText = (index: number, text: string) => {
    const newAnnotations = [...annotations];
    newAnnotations[index].text = text;
    setAnnotations(newAnnotations);
  };

  const removeAnnotation = (index: number) => {
    setAnnotations(annotations.filter((_, i) => i !== index));
    setEditingIndex(null);
  };

  const handleSave = () => {
    onSave(annotations);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-bottom bg-white shrink-0">
          <DialogTitle>Anotar Medidas</DialogTitle>
        </DialogHeader>
        
        <div className="relative flex-1 bg-neutral-100 overflow-auto flex items-center justify-center p-4">
          <div 
            className="relative cursor-crosshair inline-block shadow-lg"
            onClick={handleImageClick}
          >
            <img 
              ref={imgRef}
              src={photo.url} 
              alt="Ambiente" 
              className="max-w-full max-h-[70vh] block select-none"
              draggable={false}
            />
            {annotations.map((ann, idx) => (
              <div
                key={idx}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                style={{ left: `${ann.x}%`, top: `${ann.y}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingIndex(idx);
                }}
              >
                <div 
                  className={`w-4 h-4 rounded-full border-2 border-white shadow-sm transition-transform hover:scale-125 ${
                    editingIndex === idx ? 'bg-yellow-400' : 'bg-pink-500'
                  }`}
                />
                {ann.text && editingIndex !== idx && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                    {ann.text}
                  </div>
                )}
                
                {editingIndex === idx && (
                  <div 
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white p-2 rounded-lg shadow-xl border flex items-center gap-2 z-20"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Input
                      autoFocus
                      placeholder="Medida (ex: 2.70m)"
                      value={ann.text}
                      onChange={(e) => updateAnnotationText(idx, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setEditingIndex(null);
                      }}
                      className="h-8 w-32 text-xs"
                    />
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-7 w-7 text-red-500 hover:text-red-700"
                      onClick={() => removeAnnotation(idx)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-white border-top flex justify-between items-center shrink-0">
          <p className="text-xs text-muted-foreground italic">
            Clique na foto para adicionar uma medida
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-pink-600 hover:bg-pink-700">
              <Save className="mr-2 h-4 w-4" />
              Salvar Anotações
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
