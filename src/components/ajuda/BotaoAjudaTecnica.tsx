import React, { useState } from 'react';
import { HelpCircle, Search, BookOpen, MessageSquare, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetDescription 
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useGuiaTecnico } from './useGuiaTecnico';
import { ConferenciaAjudaIA } from './ConferenciaAjudaIA';

export const BotaoAjudaTecnica = () => {
  const { busca, setBusca, resultados } = useGuiaTecnico();
  const [iaOpen, setIaOpen] = useState(false);

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 border-primary/30 hover:bg-primary/5">
            <HelpCircle size={16} className="text-primary" />
            <span className="hidden sm:inline">Ajuda Técnica</span>
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-2">
              <BookOpen className="text-primary" />
              Guia de Conferência
            </SheetTitle>
            <SheetDescription>
              Encontre respostas para dúvidas comuns sobre o processo de conferência técnica.
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

          <ScrollArea className="h-[calc(100vh-250px)] pr-4">
            <Accordion type="single" collapsible className="w-full">
              {resultados.map((categoria) => (
                <AccordionItem key={categoria.id} value={categoria.id}>
                  <AccordionTrigger className="text-left font-semibold">
                    {categoria.titulo}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground mb-4">{categoria.descricao}</p>
                    <div className="space-y-4">
                      {categoria.topicos.map((topico, idx) => (
                        <div key={idx} className="bg-muted/50 p-3 rounded-lg">
                          <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                            <Info size={14} className="text-primary" />
                            {topico.pergunta}
                          </h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {topico.resposta}
                          </p>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollArea>

          <div className="absolute bottom-6 left-6 right-6">
            <Button 
              className="w-full gap-2 py-6 text-base" 
              onClick={() => setIaOpen(true)}
            >
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
