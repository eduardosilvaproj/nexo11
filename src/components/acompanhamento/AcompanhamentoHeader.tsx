import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";

interface AcompanhamentoHeaderProps {
  onReload: () => void;
}

export default function AcompanhamentoHeader({ onReload }: AcompanhamentoHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Acompanhamento da Criação</h1>
        <p className="text-muted-foreground">Painel interno para acompanhar a evolução dos módulos do sistema NEXO.</p>
      </div>
      <Button onClick={onReload} variant="outline" className="gap-2">
        <RefreshCcw className="h-4 w-4" />
        Recarregar
      </Button>
    </div>
  );
}
