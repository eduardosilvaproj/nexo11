// ============================================
// Kbd — Componente de tecla estilizada
// ============================================

import * as React from 'react';

interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  /** Conteúdo da tecla (ex: "Ctrl", "K", "Enter") */
  children: React.ReactNode;
}

export const Kbd = React.forwardRef<HTMLElement, KbdProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <kbd
        ref={ref as React.Ref<HTMLUnknownElement>}
        className={
          'inline-flex items-center justify-center min-w-[24px] h-5 px-1.5 rounded border border-white/10 bg-white/[0.06] text-[10px] font-mono font-medium text-slate-300 shadow-sm select-none ' +
          (className || '')
        }
        {...props}
      >
        {children}
      </kbd>
    );
  }
);
Kbd.displayName = 'Kbd';
