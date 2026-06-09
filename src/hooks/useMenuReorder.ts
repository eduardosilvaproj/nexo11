// ============================================
// useMenuReorder — Drag and drop para reordenar menu
// Persiste ordem no localStorage
// ============================================

import { useState, useEffect, useCallback } from 'react';

const ORDER_KEY = 'nexus:menu:order';

export function useMenuReorder(defaultOrder: string[]) {
  const [order, setOrder] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(ORDER_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Garante que todas as chaves novas estão presentes
        const missing = defaultOrder.filter((k) => !parsed.includes(k));
        return [...parsed, ...missing];
      }
    } catch {
      // ignore
    }
    return defaultOrder;
  });

  useEffect(() => {
    try {
      localStorage.setItem(ORDER_KEY, JSON.stringify(order));
    } catch {
      // localStorage indisponível
    }
  }, [order]);

  const reorder = useCallback((oldIndex: number, newIndex: number) => {
    setOrder((prev) => {
      const next = [...prev];
      const [removed] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, removed);
      return next;
    });
  }, []);

  const resetOrder = useCallback(() => {
    setOrder(defaultOrder);
  }, [defaultOrder]);

  return { order, reorder, resetOrder };
}
