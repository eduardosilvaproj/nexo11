import React, { useState } from 'react';
import { Bot, Send, X, MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';

export const ConferenciaAjudaIA = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Olá! Sou o assistente técnico. Como posso ajudar na conferência deste contrato?' }
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    
    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    
    // Simulação de resposta da IA
    setTimeout(() => {
      setMessages([...newMessages, { 
        role: 'assistant', 
        content: 'Entendi sua dúvida sobre ' + input + '. Para resolver divergências de custo, verifique se todos os itens do projeto original foram mantidos no XML de conferência.' 
      }]);
    }, 1000);
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
                m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                {m.content}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t flex gap-2">
        <Input 
          placeholder="Tirar dúvida técnica..." 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <Button size="icon" onClick={handleSend}>
          <Send size={18} />
        </Button>
      </div>
    </Card>
  );
};
