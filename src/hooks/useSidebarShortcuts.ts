// ============================================
// useSidebarShortcuts — Atalhos de teclado
// ============================================

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface Shortcut {
  combo: string;        // "ctrl+k", "g+c", "escape"
  description: string;
  action: () => void;
}

interface FavoritesState {
  [key: string]: boolean; // key = `${groupId}:${url}` -> pinned
}

const FAVORITES_KEY = 'nexus:sidebar:favorites';
const OPEN_GROUPS_KEY = 'nexus:sidebar:openGroups';

/**
 * Hook para gerenciar favoritos editáveis com localStorage
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoritesState>(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Salvar no localStorage quando mudar
  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch {
      // localStorage indisponível
    }
  }, [favorites]);

  const isFavorite = useCallback(
    (groupId: string, url: string) => {
      return !!favorites[`${groupId}:${url}`];
    },
    [favorites]
  );

  const toggleFavorite = useCallback((groupId: string, url: string) => {
    setFavorites((prev) => {
      const key = `${groupId}:${url}`;
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = true;
      }
      return next;
    });
  }, []);

  const clearFavorites = useCallback(() => {
    setFavorites({});
  }, []);

  return { favorites, isFavorite, toggleFavorite, clearFavorites };
}

/**
 * Hook para persistir estado de grupos abertos/fechados
 */
export function useOpenGroups(defaults: Record<string, boolean>) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(OPEN_GROUPS_KEY);
      if (stored) {
        return { ...defaults, ...JSON.parse(stored) };
      }
    } catch {
      // localStorage indisponível
    }
    return defaults;
  });

  useEffect(() => {
    try {
      localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify(openGroups));
    } catch {
      // localStorage indisponível
    }
  }, [openGroups]);

  return [openGroups, setOpenGroups] as const;
}

/**
 * Hook de atalhos de teclado globais
 *
 * Combo notation:
 *   - "ctrl+k", "cmd+k"  → modifier + key
 *   - "g+c"              → sequence (g followed by c)
 *   - "escape"           → single key
 */
export function useKeyboardShortcuts(
  shortcuts: Shortcut[],
  enabled: boolean = true
) {
  const navigate = useNavigate();
  const [pendingPrefix, setPendingPrefix] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar se está digitando em input/textarea
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (isTyping && !(e.ctrlKey || e.metaKey)) return;

      const key = e.key.toLowerCase();
      const isMod = e.ctrlKey || e.metaKey;

      // Construir combo
      let combo = "";
      if (isMod) combo += "ctrl+";
      combo += key;

      // Se tem prefixo pendente (sequence)
      if (pendingPrefix) {
        const fullCombo = `${pendingPrefix}+${key}`;
        // Limpar prefixo
        setPendingPrefix(null);
        if (timeoutId) clearTimeout(timeoutId);

        const match = shortcuts.find((s) => s.combo === fullCombo);
        if (match) {
          e.preventDefault();
          match.action();
          return;
        }
        // Não bateu, ignora
        return;
      }

      // Verificar shortcut exato
      const match = shortcuts.find((s) => s.combo === combo);
      if (match) {
        e.preventDefault();
        match.action();
        return;
      }

      // Verificar se é um prefixo de sequence (ex: "g" espera "g+c")
      const isPrefix = shortcuts.some((s) => s.combo.startsWith(`${key}+`));
      if (isPrefix && !isMod) {
        setPendingPrefix(key);
        // Auto-limpar após 1.2s
        timeoutId = setTimeout(() => {
          setPendingPrefix(null);
        }, 1200);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [shortcuts, enabled, pendingPrefix]);

  return { pendingPrefix };
}

/**
 * Helper: navegar para URL via atalho
 */
export function navigateShortcut(navigate: ReturnType<typeof useNavigate>, url: string) {
  return () => navigate(url);
}
