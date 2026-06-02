import { useState, useEffect, useRef } from "react";

interface ContextualTooltipProps {
  children: React.ReactNode;
  hint: string;
  position?: "top" | "bottom" | "left" | "right";
  showOnce?: boolean;
  id?: string;
}

const STORAGE_KEY = "nexo_hints_dismissed";

function getDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function markDismissed(id: string) {
  const dismissed = getDismissed();
  if (!dismissed.includes(id)) {
    dismissed.push(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed));
  }
}

export function ContextualTooltip({
  children,
  hint,
  position = "top",
  showOnce = false,
  id,
}: ContextualTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showOnce && id) {
      const list = getDismissed();
      if (list.includes(id)) {
        setDismissed(true);
      }
    }
  }, [showOnce, id]);

  const handleDismiss = () => {
    setVisible(false);
    if (showOnce && id) {
      markDismissed(id);
      setDismissed(true);
    }
  };

  const handleDotInteraction = () => {
    setVisible(true);
  };

  if (dismissed) {
    return <>{children}</>;
  }

  const positionClasses: Record<string, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowClasses: Record<string, string> = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-[#0D1117]",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-[#0D1117]",
    left: "left-full top-1/2 -translate-y-1/2 border-l-[#0D1117]",
    right: "right-full top-1/2 -translate-y-1/2 border-r-[#0D1117]",
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      {children}

      {/* Pulsing dot */}
      <span
        className="absolute -top-1 -right-1 z-40 cursor-pointer"
        onMouseEnter={handleDotInteraction}
        onClick={handleDotInteraction}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-[contextual-ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite] rounded-full bg-[#1E6FBF] opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#1E6FBF]" />
        </span>
      </span>

      {/* Tooltip */}
      {visible && (
        <div
          className={`absolute z-40 ${positionClasses[position]} animate-[contextual-fade-in_0.2s_ease-out]`}
          onMouseLeave={() => setVisible(false)}
        >
          <div className="relative rounded-lg bg-[#0D1117] px-3 py-2 text-xs text-white max-w-[200px] shadow-lg">
            <p className="mb-1.5 leading-relaxed">{hint}</p>
            <button
              onClick={handleDismiss}
              className="text-[10px] font-medium text-[#1E6FBF] hover:text-white transition-colors"
            >
              Entendi
            </button>
            {/* Arrow */}
            <span
              className={`absolute w-0 h-0 border-4 border-transparent ${arrowClasses[position]}`}
            />
          </div>
        </div>
      )}

      <style>{`
        @keyframes contextual-ping {
          0% { transform: scale(1); opacity: 0.75; }
          75%, 100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes contextual-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
