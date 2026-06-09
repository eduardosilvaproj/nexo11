// ============================================
// PageTour — Tour guiado contextual por página
// Mostra spotlight + tooltip para features da página
// ============================================

import { useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Sparkles, RotateCcw } from 'lucide-react';

interface TourStep {
  /** Seletor CSS do elemento alvo */
  target: string;
  /** Título do passo */
  title: string;
  /** Descrição do passo */
  description: string;
  /** Posição preferida do tooltip */
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  /** Ação opcional após este passo */
  onNext?: () => void;
}

interface PageTourConfig {
  /** ID único do tour (chave no localStorage) */
  id: string;
  /** Passos do tour */
  steps: TourStep[];
  /** Versão do tour (mude para forçar re-show) */
  version?: number;
}

interface PageTourProps {
  configs: PageTourConfig[];
}

const STORAGE_KEY = 'nexus:tour:completed';

export function PageTour({ configs }: PageTourProps) {
  const location = useLocation();
  const [activeTour, setActiveTour] = useState<PageTourConfig | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Carregar tours completados
  const getCompletedTours = useCallback((): string[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  const markTourCompleted = useCallback((tourId: string) => {
    try {
      const completed = getCompletedTours();
      if (!completed.includes(tourId)) {
        completed.push(tourId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
      }
    } catch {
      // localStorage indisponível
    }
  }, [getCompletedTours]);

  const resetTours = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  // Expor helper global para reset (dev console / atalho)
  useEffect(() => {
    (window as any).resetTours = resetTours;
    return () => {
      delete (window as any).resetTours;
    };
  }, [resetTours]);

  // Atalho Ctrl+Shift+R para resetar tours
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        resetTours();
        window.location.reload();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [resetTours]);

  // Verificar se há tour para a rota atual
  useEffect(() => {
    const completed = getCompletedTours();
    const match = configs.find((c) => location.pathname.startsWith(`/${c.id.split(':')[0]}`));

    if (!match) {
      setActiveTour(null);
      return;
    }

    // Verificar versão e completed
    const tourKey = match.id;
    if (completed.includes(tourKey)) {
      setActiveTour(null);
      return;
    }

    setActiveTour(match);
    setCurrentStep(0);
  }, [location.pathname, configs, getCompletedTours]);

  // Atualizar posição do target ao scroll/resize
  useEffect(() => {
    if (!activeTour) return;

    const updateRect = () => {
      const step = activeTour.steps[currentStep];
      if (!step) return;

      const el = document.querySelector(step.target) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        // Pequeno delay para scroll terminar
        setTimeout(() => {
          setTargetRect(el.getBoundingClientRect());
        }, 200);
      } else {
        setTargetRect(null);
      }
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [activeTour, currentStep]);

  // Calcular posição do tooltip
  const getTooltipPosition = (): React.CSSProperties => {
    if (!targetRect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const step = activeTour!.steps[currentStep];
    const placement = step.placement ?? 'auto';
    const tooltipWidth = 360;
    const tooltipHeight = 200;
    const gap = 16;

    let top = 0;
    let left = 0;

    // Tentar placement preferido, fallback para auto
    const candidates: Array<typeof placement> =
      placement === 'auto'
        ? ['bottom', 'top', 'right', 'left']
        : [placement, 'bottom', 'top', 'right', 'left'];

    for (const pos of candidates) {
      switch (pos) {
        case 'bottom':
          top = targetRect.bottom + gap;
          left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
          break;
        case 'top':
          top = targetRect.top - tooltipHeight - gap;
          left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
          break;
        case 'right':
          top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
          left = targetRect.right + gap;
          break;
        case 'left':
          top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
          left = targetRect.left - tooltipWidth - gap;
          break;
      }

      // Checar se está dentro da viewport
      if (
        top >= 0 &&
        left >= 0 &&
        top + tooltipHeight <= window.innerHeight &&
        left + tooltipWidth <= window.innerWidth
      ) {
        break;
      }
    }

    // Clamp dentro da viewport
    top = Math.max(8, Math.min(top, window.innerHeight - tooltipHeight - 8));
    left = Math.max(8, Math.min(left, window.innerWidth - tooltipWidth - 8));

    return { top, left };
  };

  const handleNext = () => {
    if (!activeTour) return;
    if (currentStep < activeTour.steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      markTourCompleted(activeTour.id);
      setActiveTour(null);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  const handleSkip = () => {
    if (activeTour) {
      markTourCompleted(activeTour.id);
      setActiveTour(null);
    }
  };

  if (!activeTour || !targetRect) {
    return null;
  }

  const step = activeTour.steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === activeTour.steps.length - 1;

  return (
    <>
      {/* Backdrop com spotlight */}
      <div className="fixed inset-0 z-[100] pointer-events-none">
        <div className="absolute inset-0 bg-black/65 transition-opacity" />
        {/* Spotlight "buraco" via box-shadow invertido */}
        <div
          className="absolute transition-all duration-300 ease-out"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)',
            borderRadius: 12,
          }}
        />
        {/* Borda brilhante do spotlight */}
        <div
          className="absolute pointer-events-none ring-2 ring-sky-400 ring-offset-0 transition-all duration-300 ease-out rounded-xl"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            boxShadow: '0 0 24px rgba(56, 189, 248, 0.4)',
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
      </div>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-[101] w-[360px] max-w-[calc(100vw-32px)] rounded-2xl bg-[#0a0e1a] border border-white/10 shadow-2xl p-5 pointer-events-auto"
        style={getTooltipPosition()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-sky-500/30">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Tour {currentStep + 1} de {activeTour.steps.length}
            </span>
          </div>
          <button
            onClick={handleSkip}
            className="text-slate-500 hover:text-white transition-colors p-1 -mt-1 -mr-1"
            aria-label="Pular tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <h3 className="text-base font-semibold text-white mb-1.5">{step.title}</h3>
        <p className="text-sm text-slate-400 leading-relaxed">{step.description}</p>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mt-4 mb-4">
          {activeTour.steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all ${
                i < currentStep
                  ? 'bg-sky-500'
                  : i === currentStep
                  ? 'bg-sky-400'
                  : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-slate-400 hover:text-white text-xs"
          >
            Pular
          </Button>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                className="border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.06]"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Voltar
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleNext}
              className="bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white shadow-lg shadow-sky-500/30"
            >
              {isLast ? 'Concluir' : 'Próximo'}
              {!isLast && <ChevronRight className="h-3.5 w-3.5 ml-1" />}
            </Button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 24px rgba(56, 189, 248, 0.4); }
          50% { box-shadow: 0 0 36px rgba(56, 189, 248, 0.6); }
        }
      `}</style>
    </>
  );
}
