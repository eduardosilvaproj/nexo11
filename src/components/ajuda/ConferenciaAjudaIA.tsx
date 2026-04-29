import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { useGuiaTecnico } from './useGuiaTecnico';

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

export const ConferenciaAjudaIA = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { perguntarIA, respostaIA, loading, setRespostaIA } = useGuiaTecnico();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Olá! Sou o assistente técnico. Como posso ajudar na conferência deste contrato?' }
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Efeito para adicionar a resposta da IA às mensagens
  useEffect(() => {
    if (respostaIA) {
      setMessages(prev => [...prev, { role: 'assistant', content: respostaIA }]);
      setRespostaIA(null); // Limpa para evitar duplicidade se o hook for reutilizado
    }
  }, [respostaIA, setRespostaIA]);

  // Scroll automático para a última mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    
    await perguntarIA(userMessage);
  };

  if (!isOpen) return null;

  return (
    <Card className="fixed bottom-20 right-6 w-96 h-[500px] shadow-2xl flex flex-col z-50 border-primary/20 animate-in slide-in-from-bottom-5">
      <div className="p-4 border-b bg-primary text-primary-foreground flex justify-between items-center rounded-t-lg">
        <div className="flex items-center gap-2">
          <Sparkles size={18} />
          <span className="font-semibold">Assistente de Conferência</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-primary-foreground hover:bg-primary-foreground/10">
          <X size={18} />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-lg text-sm ${
                m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted shadow-sm'
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted p-3 rounded-lg flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                <span className="text-xs text-muted-foreground italic">Processando resposta...</span>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t flex gap-2 bg-muted/20">
        <Input 
          placeholder="Tirar dúvida técnica..." 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={loading}
          className="bg-background"
        />
        <Button size="icon" onClick={handleSend} disabled={loading || !input.trim()}>
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </Button>
      </div>
    </Card>
  );
};
