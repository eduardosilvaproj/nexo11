// ============================================
// PageShortcuts — Atalhos contextuais por página
// Mostra atalhos específicos de cada página
// ============================================

import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Kbd } from '@/components/ui/kbd';
import { Sparkles } from 'lucide-react';

interface PageShortcut {
  keys: string[];
  description: string;
}

interface PageShortcutsConfig {
  /** Match com path: /comercial, /contratos, etc. Suporta wildcard no final: '/contratos/*' */
  match: string;
  shortcuts: PageShortcut[];
}

const configs: PageShortcutsConfig[] = [
  {
    match: '/',
    shortcuts: [
      { keys: ['G', 'C'], description: 'Ir para Comercial' },
      { keys: ['G', 'K'], description: 'Ir para Contratos' },
      { keys: ['Ctrl', 'K'], description: 'Buscar qualquer página' },
    ],
  },
  {
    match: '/comercial',
    shortcuts: [
      { keys: ['N'], description: 'Nova lead' },
      { keys: ['F'], description: 'Filtrar' },
      { keys: ['/'], description: 'Buscar lead' },
      { keys: ['Esc'], description: 'Fechar modal/filtros' },
    ],
  },
  {
    match: '/contratos',
    shortcuts: [
      { keys: ['N'], description: 'Novo contrato' },
      { keys: ['F'], description: 'Filtrar lista' },
      { keys: ['E'], description: 'Editar contrato selecionado' },
      { keys: ['P'], description: 'Imprimir/PDF' },
    ],
  },
  {
    match: '/financeiro',
    shortcuts: [
      { keys: ['N'], description: 'Novo lançamento' },
      { keys: ['F'], description: 'Filtrar período' },
      { keys: ['1-9'], description: 'Trocar de aba' },
    ],
  },
  {
    match: '/capture',
    shortcuts: [
      { keys: ['Ctrl', 'O'], description: 'Abrir arquivo' },
      { keys: ['Ctrl', 'S'], description: 'Salvar projeto' },
      { keys: ['G'], description: 'Gerar SKP' },
      { keys: ['P'], description: 'Toggle preview 3D' },
    ],
  },
  {
    match: '/analytics',
    shortcuts: [
      { keys: ['T'], description: 'Trocar período' },
      { keys: ['D'], description: 'Toggle dark/light' },
      { keys: ['F'], description: 'Tela cheia' },
      { keys: ['Esc'], description: 'Sair fullscreen' },
    ],
  },
  {
    match: '/clientes',
    shortcuts: [
      { keys: ['N'], description: 'Novo cliente' },
      { keys: ['/'], description: 'Buscar cliente' },
      { keys: ['Enter'], description: 'Abrir cliente selecionado' },
    ],
  },
];

export function PageShortcuts() {
  const location = useLocation();
  const [activeConfig, setActiveConfig] = useState<PageShortcutsConfig | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const match = configs.find((c) => {
      if (c.match.endsWith('*')) {
        return location.pathname.startsWith(c.match.slice(0, -1));
      }
      return location.pathname === c.match || location.pathname.startsWith(c.match + '/');
    });

    setActiveConfig(match || null);
    setIsVisible(!!match);
  }, [location.pathname]);

  // Auto-hide após 6s
  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(() => setIsVisible(false), 8000);
    return () => clearTimeout(timer);
  }, [isVisible, location.pathname]);

  if (!activeConfig || !isVisible) {
    return null;
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-50 max-w-sm pointer-events-auto"
      onClick={() => setIsVisible(false)}
    >
      <div className="bg-[#0a0e1a]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-4 animate-in slide-in-from-bottom-4 fade-in duration-300">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-3.5 w-3.5 text-sky-400" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Atalhos desta página
          </h4>
        </div>
        <div className="space-y-1.5">
          {activeConfig.shortcuts.map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <span className="text-slate-400">{s.description}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k, ki) => (
                  <span key={ki} className="flex items-center">
                    {ki > 0 && <span className="text-slate-600 mx-0.5">+</span>}
                    <Kbd>{k}</Kbd>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-500 mt-3 pt-2 border-t border-white/5">
          Pressione <Kbd>?</Kbd> para ver todos os atalhos
        </p>
      </div>
    </div>
  );
}
