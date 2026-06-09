// ============================================
// CommandPalette — Modal de busca rápida (Ctrl+K)
// ============================================

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Search,
  ArrowRight,
  Hash,
  CornerDownLeft,
  Command as CommandIcon,
} from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  url: string;
  icon?: any;
  group: string;
  shortcut?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandItem[];
  onPinToggle?: (id: string) => void;
  pinnedIds?: string[];
}

export function CommandPalette({
  open,
  onOpenChange,
  items,
  onPinToggle,
  pinnedIds = [],
}: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Resetar ao abrir
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  // Filtrar itens
  const filtered = useMemo(() => {
    if (!query.trim()) {
      // Quando vazio, mostrar pinned primeiro + recentes
      const pinned = items.filter((i) => pinnedIds.includes(i.id));
      const rest = items.filter((i) => !pinnedIds.includes(i.id)).slice(0, 20);
      return [...pinned, ...rest];
    }
    const s = query.toLowerCase();
    return items
      .filter(
        (item) =>
          item.title.toLowerCase().includes(s) ||
          (item.description?.toLowerCase().includes(s) ?? false) ||
          item.group.toLowerCase().includes(s)
      )
      .slice(0, 30);
  }, [query, items, pinnedIds]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(filtered.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = filtered[selectedIndex];
        if (item) {
          navigate(item.url);
          onOpenChange(false);
        }
      } else if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, filtered, selectedIndex, navigate, onOpenChange]);

  // Resetar seleção quando query muda
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Agrupar por grupo
  const grouped = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    filtered.forEach((item) => {
      if (!map.has(item.group)) map.set(item.group, []);
      map.get(item.group)!.push(item);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const handleSelect = useCallback(
    (item: CommandItem) => {
      navigate(item.url);
      onOpenChange(false);
    },
    [navigate, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden bg-[#0a0e1a] border-white/10 top-[15%] translate-y-0">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <Search className="h-4 w-4 text-slate-500 flex-shrink-0" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar página, ação ou atalho..."
            className="border-0 bg-transparent text-sm text-white placeholder:text-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto p-0"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
            <kbd className="bg-transparent border-0 p-0 text-[10px]">esc</kbd>
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[420px] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Search className="h-8 w-8 mx-auto text-slate-600 mb-3" />
              <p className="text-sm text-slate-500">
                Nenhum resultado para <span className="text-white">"{query}"</span>
              </p>
            </div>
          ) : (
            grouped.map(([group, items]) => (
              <div key={group} className="mb-1">
                <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Hash className="h-3 w-3" />
                  {group}
                </div>
                {items.map((item) => {
                  const globalIndex = filtered.indexOf(item);
                  const isSelected = globalIndex === selectedIndex;
                  const isPinned = pinnedIds.includes(item.id);
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isSelected
                          ? 'bg-white/[0.06] text-white'
                          : 'text-slate-300 hover:bg-white/[0.04]'
                      }`}
                    >
                      {Icon ? (
                        <div className={`h-7 w-7 rounded-md flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-sky-500/20 text-sky-300' : 'bg-white/[0.04] text-slate-400'
                        }`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                      ) : (
                        <div className="h-7 w-7" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        {item.description && (
                          <p className="text-xs text-slate-500 truncate">{item.description}</p>
                        )}
                      </div>
                      {isPinned && (
                        <span className="text-amber-400 text-[10px] font-semibold uppercase">Pin</span>
                      )}
                      {item.shortcut && (
                        <kbd className="hidden md:inline-flex items-center gap-0.5 rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                          {item.shortcut}
                        </kbd>
                      )}
                      {isSelected && (
                        <CornerDownLeft className="h-3.5 w-3.5 text-slate-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/10 bg-[#060d1a] text-[10px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-white/10 bg-white/[0.04] px-1 py-0.5 text-[9px]">↑</kbd>
              <kbd className="rounded border border-white/10 bg-white/[0.04] px-1 py-0.5 text-[9px]">↓</kbd>
              navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-white/10 bg-white/[0.04] px-1 py-0.5 text-[9px]">↵</kbd>
              abrir
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-white/10 bg-white/[0.04] px-1 py-0.5 text-[9px]">esc</kbd>
              fechar
            </span>
          </div>
          <div className="flex items-center gap-1">
            <CommandIcon className="h-3 w-3" />
            <span>Nexus Command</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
