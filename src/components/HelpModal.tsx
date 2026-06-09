// ============================================
// HelpModal — Lista de atalhos de teclado
// ============================================

import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  Keyboard,
  Search,
  Home,
  Briefcase,
  FileText,
  UserRound,
  ClipboardCheck,
  Factory,
  Truck,
  Boxes,
  Car,
  HardHat,
  HeadphonesIcon,
  Wallet,
  LineChart,
  Percent,
  ShoppingCart,
  UserCog,
  Users2,
  Building2,
  BarChart3,
  Gauge,
  Map,
  Activity,
  UploadCloud,
  Sparkles,
  Send,
  Radio,
  Bell,
  MessageCircle,
  Receipt,
  Plug,
  HelpCircle,
  Settings,
} from 'lucide-react';

interface HelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const globalShortcuts = [
  { combo: ['Ctrl', 'K'], description: 'Abrir busca rápida (Command Palette)', icon: Command },
  { combo: ['Esc'], description: 'Fechar modal / limpar busca', icon: Keyboard },
  { combo: ['?', 'Shift'], description: 'Abrir esta ajuda de atalhos', icon: HelpCircle },
];

const navigationShortcuts = [
  { keys: 'G D', description: 'Dashboard', icon: Home },
  { keys: 'G C', description: 'Comercial (Leads)', icon: Briefcase },
  { keys: 'G K', description: 'Contratos', icon: FileText },
  { keys: 'G L', description: 'Clientes', icon: UserRound },
  { keys: 'G T', description: 'Técnico (Medições)', icon: ClipboardCheck },
  { keys: 'G P', description: 'Produção', icon: Factory },
  { keys: 'G G', description: 'Logística', icon: Truck },
  { keys: 'G M', description: 'Montagem', icon: HardHat },
  { keys: 'G A', description: 'Almoxarifado', icon: Boxes },
  { keys: 'G F', description: 'Frota', icon: Car },
  { keys: 'G V', description: 'Pós-venda', icon: HeadphonesIcon },
  { keys: 'G N', description: 'Financeiro', icon: Wallet },
  { keys: 'G R', description: 'DRE', icon: LineChart },
  { keys: 'G S', description: 'Comissões', icon: Percent },
  { keys: 'G O', description: 'Compras', icon: ShoppingCart },
  { keys: 'G E', description: 'Equipe', icon: UserCog },
  { keys: 'G H', description: 'RH', icon: Users2 },
  { keys: 'G I', description: 'Analytics', icon: BarChart3 },
  { keys: 'G U', description: 'Capture (Plantas)', icon: UploadCloud },
  { keys: 'G ?', description: 'Ajuda', icon: HelpCircle },
];

const tips = [
  { icon: Pin, text: 'Passe o mouse sobre qualquer item do menu para fixá-lo nos Favoritos.' },
  { icon: Search, text: 'Use a busca no topo do menu para encontrar páginas rapidamente.' },
  { icon: Command, text: 'O Command Palette funciona como no VS Code / GitHub: digite e Enter.' },
  { icon: Sparkles, text: 'Os atalhos G+X seguem o padrão Gmail. Pressione G, depois a letra.' },
];

export function HelpModal({ open, onOpenChange }: HelpModalProps) {
  // Listener para ? abrir o modal
  useEffect(() => {
    if (open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '?' && e.shiftKey && !isTyping(e.target)) {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden bg-[#0a0e1a] border-white/10 top-[10%] translate-y-0 max-h-[85vh]">
        <DialogHeader className="px-6 py-4 border-b border-white/10">
          <DialogTitle className="text-white flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-sky-400" />
            Atalhos de Teclado
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-sm">
            Navegue pelo Nexus mais rápido com atalhos
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(85vh-100px)] p-6 space-y-6">
          {/* Globais */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <Command className="h-3.5 w-3.5" />
              Globais
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {globalShortcuts.map((s) => (
                <div
                  key={s.description}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:border-white/10 transition-colors"
                >
                  <span className="text-sm text-slate-300">{s.description}</span>
                  <div className="flex items-center gap-1">
                    {s.combo.map((k, i) => (
                      <span key={i} className="flex items-center gap-1">
                        {i > 0 && <span className="text-slate-600 text-xs">+</span>}
                        <kbd className="inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded border border-white/10 bg-white/[0.06] text-[11px] font-medium text-slate-300">
                          {k}
                        </kbd>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Navegação G+X */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <span className="font-mono text-sm">G +</span>
              Navegação rápida
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Pressione <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10 text-[10px]">G</kbd> e depois a letra
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {navigationShortcuts.map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.keys}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/10 transition-all group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {Icon && <Icon className="h-3.5 w-3.5 text-slate-500 group-hover:text-sky-400 flex-shrink-0 transition-colors" />}
                      <span className="text-xs text-slate-300 truncate">{s.description}</span>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {s.keys.split(' ').map((k, i) => (
                        <kbd
                          key={i}
                          className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded border border-white/10 bg-white/[0.06] text-[10px] font-mono font-medium text-slate-300"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Dicas */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              Dicas
            </h3>
            <div className="space-y-2">
              {tips.map((tip, i) => {
                const Icon = tip.icon;
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-br from-sky-500/[0.05] to-transparent border border-sky-500/10"
                  >
                    <Icon className="h-4 w-4 text-sky-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-slate-300">{tip.text}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-[#060d1a] text-[10px] text-slate-500 flex items-center justify-between">
          <span>Nexus Command v1.0</span>
          <span className="flex items-center gap-1">
            Pressione <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/[0.04] text-[9px]">?</kbd> para reabrir
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper
function isTyping(target: EventTarget | null): boolean {
  if (!target) return false;
  const el = target as HTMLElement;
  return (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.isContentEditable ||
    el.tagName === 'SELECT'
  );
}
