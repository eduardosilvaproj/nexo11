import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";

interface AcompanhamentoHeaderProps {
  onReload: () => void;
}

export default function AcompanhamentoHeader({ onReload }: AcompanhamentoHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Acompanhamento da Criação</h1>
        <p className="text-sm text-slate-500 mt-1">
          Painel interno para acompanhar a evolução dos módulos do sistema NEXO.
        </p>
      </div>
      <Button onClick={onReload} variant="outline" className="gap-2">
        <RefreshCcw className="h-4 w-4" />
        Recarregar
      </Button>
    </div>
  );
}
