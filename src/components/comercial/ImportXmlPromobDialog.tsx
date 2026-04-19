import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Upload, FileCode2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function ImportXmlPromobDialog({ open, onOpenChange }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (!/\.xml$/i.test(f.name)) return;
    setFile(f);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Importar XML Promob</DialogTitle>
          <DialogDescription>
            Selecione o arquivo XML exportado do Promob para gerar um orçamento.
          </DialogDescription>
        </DialogHeader>

        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0] ?? null);
          }}
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed py-10 transition-colors"
          style={{
            borderColor: dragOver ? "#1E6FBF" : "#E8ECF2",
            background: dragOver ? "#F0F7FF" : "#FAFBFC",
          }}
        >
          <input
            type="file"
            accept=".xml"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <>
              <FileCode2 className="h-8 w-8" style={{ color: "#1E6FBF" }} />
              <p className="mt-2 text-sm font-medium" style={{ color: "#0D1117" }}>
                {file.name}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: "#6B7A90" }}>
                {(file.size / 1024).toFixed(1)} KB · clique para trocar
              </p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8" style={{ color: "#6B7A90" }} />
              <p className="mt-2 text-sm" style={{ color: "#0D1117" }}>
                Arraste o XML aqui ou clique para selecionar
              </p>
              <p className="mt-0.5 text-xs" style={{ color: "#6B7A90" }}>
                Apenas arquivos .xml exportados do Promob
              </p>
            </>
          )}
        </label>

        <p className="text-xs" style={{ color: "#B0BAC9" }}>
          O parser e a criação do orçamento serão implementados na próxima etapa.
        </p>
      </DialogContent>
    </Dialog>
  );
}
