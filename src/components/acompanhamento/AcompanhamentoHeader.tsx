import { Button } from "@/components/ui/button";
import { RefreshCcw, Sparkles } from "lucide-react";

interface AcompanhamentoHeaderProps {
  onReload: () => void;
}

export default function AcompanhamentoHeader({ onReload }: AcompanhamentoHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-sky-100 blur-3xl" />
      <div className="relative flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-sky-700">
            <Sparkles className="h-3.5 w-3.5" /> Evolução NEXUS
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">Acompanhamento da Criação</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">Painel interno para acompanhar a evolução dos módulos do sistema NEXO.</p>
          </div>
        </div>
        <Button onClick={onReload} variant="outline" className="gap-2 rounded-2xl border-slate-200 bg-white shadow-sm hover:bg-slate-50">
          <RefreshCcw className="h-4 w-4" />
          Recarregar
        </Button>
      </div>
    </div>
  );
}
