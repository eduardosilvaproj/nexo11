import React, { useMemo, useState } from 'react';
import { HelpCircle, Search, BookOpen, MessageSquare, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConferenciaAjudaIA } from './ConferenciaAjudaIA';
import { GUIA_TECNICO_CONTENT } from './guiaContent';

export const BotaoAjudaTecnica = ({ inline }: { inline?: boolean }) => {
  const [busca, setBusca] = useState('');
  const [iaOpen, setIaOpen] = useState(false);

  // Busca simples por trechos do guia técnico
  const trechos = useMemo(() => {
    if (!busca.trim()) {
      return GUIA_TECNICO_CONTENT.slice(0, 3000);
    }
    const termo = busca.toLowerCase();
    const linhas = GUIA_TECNICO_CONTENT.split('\n');
    const matches = linhas
      .map((linha, i) => ({ linha, i }))
      .filter(({ linha }) => linha.toLowerCase().includes(termo))
      .slice(0, 30);

    if (matches.length === 0) return 'Nenhum resultado encontrado para sua busca.';

    return matches
      .map(({ linha, i }) => {
        const contexto = linhas.slice(Math.max(0, i - 1), i + 2).join('\n');
        return contexto;
      })
      .join('\n\n---\n\n');
  }, [busca]);

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'gap-2 border-primary/30 hover:bg-primary/5',
              !inline && 'fixed bottom-24 right-6 z-50 rounded-full h-12 w-12 p-0 shadow-lg sm:w-auto sm:px-4'
            )}
          >
            <HelpCircle size={16} className="text-primary" />
            <span className={cn('hidden sm:inline', !inline && 'inline')}>Ajuda Técnica</span>
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-2">
              <BookOpen className="text-primary" />
              Guia de Conferência
            </SheetTitle>
            <SheetDescription>
              Busque trechos do guia técnico ou pergunte ao Assistente IA.
            </SheetDescription>
          </SheetHeader>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              className="pl-10"
              placeholder="Buscar no guia..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <ScrollArea className="h-[calc(100vh-280px)] pr-4">
            <div className="bg-muted/50 p-3 rounded-lg">
              <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                <Info size={14} className="text-primary" />
                {busca ? `Resultados para "${busca}"` : 'Trecho inicial do guia'}
              </h4>
              <pre className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap font-sans">
                {trechos}
              </pre>
            </div>
          </ScrollArea>

          <div className="absolute bottom-6 left-6 right-6">
            <Button className="w-full gap-2 py-6 text-base" onClick={() => setIaOpen(true)}>
              <MessageSquare size={18} />
              Falar com Assistente IA
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <ConferenciaAjudaIA isOpen={iaOpen} onClose={() => setIaOpen(false)} />
    </>
  );
};
