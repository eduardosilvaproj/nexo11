import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { RelatorioEstimativa } from '@/types/estimativa';

interface Props {
  relatorio: RelatorioEstimativa;
}

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

const SUGESTOES = [
  'Qual ambiente está mais caro?',
  'Sugestões para reduzir o custo?',
  'O que posso oferecer como upgrade?',
];

export function ChatEstimativa({ relatorio }: Props) {
  const [mensagens, setMensagens] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens, loading]);

  const enviar = async (texto: string) => {
    const msg = texto.trim();
    if (!msg || loading) return;
    const novoHistorico = [...mensagens, { role: 'user' as const, content: msg }];
    setMensagens(novoHistorico);
    setInput('');
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('chat-estimativa', {
        body: { mensagem: msg, contexto: relatorio, historico: mensagens },
      });
      if (error) throw error;
      const resposta = data?.resposta || data?.error || 'Não consegui responder.';
      setMensagens([...novoHistorico, { role: 'assistant', content: resposta }]);
    } catch (e) {
      setMensagens([
        ...novoHistorico,
        { role: 'assistant', content: 'Erro ao consultar a IA. Tente novamente.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Pergunte sobre o projeto</h3>
      </div>

      {mensagens.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {SUGESTOES.map((s) => (
            <button
              key={s}
              onClick={() => enviar(s)}
              className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {mensagens.length > 0 && (
        <div className="max-h-80 overflow-y-auto space-y-3 mb-3 pr-1">
          {mensagens.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`rounded-2xl px-3.5 py-2 text-sm max-w-[85%] whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-3.5 py-2 text-sm bg-muted text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> pensando...
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(input);
        }}
        className="flex gap-2"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunte algo sobre este projeto..."
          disabled={loading}
        />
        <Button type="submit" size="icon" disabled={loading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </Card>
  );
}
