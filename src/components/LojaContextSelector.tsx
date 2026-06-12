import { useState } from "react";
import { Building2, Check, ChevronsUpDown, Globe2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useLojaContexto, type LojaContextoValor } from "@/contexts/LojaContexto";
import { cn } from "@/lib/utils";

/**
 * Seletor de contexto de loja para o header.
 * Visivel apenas para admin_master e franqueador.
 *
 * Mostra:
 *  - "Visao plataforma" (badge amber) quando contexto = "all"
 *  - Nome da loja quando contexto = uuid especifico
 */
export function LojaContextSelector() {
  const { contexto, lojas, podeSelecionar, isPlataforma, setContexto, loading } = useLojaContexto();
  const [open, setOpen] = useState(false);

  if (!podeSelecionar) return null;

  const contextoLabel: string = isPlataforma
    ? "Visao plataforma"
    : lojas.find((l) => l.id === contexto)?.nome ?? "Loja";

  return (
    <div className="flex items-center gap-2">
      {isPlataforma && (
        <Badge
          variant="secondary"
          className="hidden border-amber-300 bg-amber-100 text-amber-800 sm:inline-flex"
          title="Admin master/franqueador: vendo todas as lojas"
        >
          <Globe2 className="mr-1 h-3 w-3" />
          Visao plataforma
        </Badge>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-9 max-w-[220px] justify-between gap-2 rounded-full border-slate-200/80 bg-white/80 px-3 text-sm shadow-sm hover:bg-white"
            disabled={loading}
          >
            <span className="flex items-center gap-2 truncate">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              ) : isPlataforma ? (
                <Globe2 className="h-4 w-4 text-amber-600" />
              ) : (
                <Building2 className="h-4 w-4 text-sky-600" />
              )}
              <span className="truncate font-medium text-slate-700">{contextoLabel}</span>
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[280px] p-1"
          align="end"
          sideOffset={6}
        >
          <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Contexto de visualizacao
          </div>

          {/* Opcao: Visao plataforma */}
          <ContextoItem
            icon={<Globe2 className="h-4 w-4 text-amber-600" />}
            titulo="Todas as lojas"
            subtitulo="Visao plataforma (admin master)"
            ativo={isPlataforma}
            onSelect={() => {
              setContexto("all");
              setOpen(false);
            }}
          />

          <div className="my-1 h-px bg-slate-100" />
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Loja especifica
          </div>

          <div className="max-h-[260px] overflow-y-auto">
            {lojas.length === 0 && !loading && (
              <div className="px-3 py-2 text-xs text-slate-500">Nenhuma loja cadastrada.</div>
            )}
            {lojas.map((loja) => (
              <ContextoItem
                key={loja.id}
                icon={<Building2 className="h-4 w-4 text-sky-600" />}
                titulo={loja.nome}
                subtitulo={loja.cidade ?? undefined}
                ativo={contexto === loja.id}
                onSelect={() => {
                  setContexto(loja.id as LojaContextoValor);
                  setOpen(false);
                }}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function ContextoItem({
  icon,
  titulo,
  subtitulo,
  ativo,
  onSelect,
}: {
  icon: React.ReactNode;
  titulo: string;
  subtitulo?: string;
  ativo: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
        ativo
          ? "bg-sky-50 text-sky-700"
          : "text-slate-700 hover:bg-slate-50",
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 flex-1 truncate">
        <span className="block truncate font-medium">{titulo}</span>
        {subtitulo && (
          <span className="block truncate text-[11px] font-normal text-slate-500">
            {subtitulo}
          </span>
        )}
      </span>
      {ativo && <Check className="h-4 w-4 shrink-0 text-sky-600" />}
    </button>
  );
}
