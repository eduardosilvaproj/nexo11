import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";

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

interface HintTarget {
  id: string;
  hint: string;
  rect: DOMRect;
}

function HintDot({
  target,
  onDismiss,
}: {
  target: HintTarget;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const dotRef = useRef<HTMLDivElement>(null);

  const handleInteraction = () => {
    setVisible(true);
  };

  const handleDismiss = () => {
    setVisible(false);
    markDismissed(target.id);
    onDismiss(target.id);
  };

  return (
    <div
      ref={dotRef}
      style={{
        position: "absolute",
        top: target.rect.top + window.scrollY - 4,
        left: target.rect.right + window.scrollX - 4,
        zIndex: 40,
      }}
    >
      {/* Pulsing dot */}
      <span
        className="relative flex h-2 w-2 cursor-pointer"
        onMouseEnter={handleInteraction}
        onClick={handleInteraction}
      >
        <span className="absolute inline-flex h-full w-full animate-[hint-ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite] rounded-full bg-[#1E6FBF] opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#1E6FBF]" />
      </span>

      {/* Tooltip */}
      {visible && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 animate-[hint-fade-in_0.2s_ease-out]"
          onMouseLeave={() => setVisible(false)}
        >
          <div className="relative rounded-lg bg-[#0D1117] px-3 py-2 text-xs text-white max-w-[200px] shadow-lg whitespace-normal">
            <p className="mb-1.5 leading-relaxed">{target.hint}</p>
            <button
              onClick={handleDismiss}
              className="text-[10px] font-medium text-[#1E6FBF] hover:text-white transition-colors"
            >
              Entendi
            </button>
            {/* Arrow */}
            <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-4 border-transparent border-t-[#0D1117]" />
          </div>
        </div>
      )}
    </div>
  );
}

export function HintsOverlay() {
  const [targets, setTargets] = useState<HintTarget[]>([]);
  const [dismissed, setDismissed] = useState<string[]>(getDismissed());
  const location = useLocation();
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scanForHints = useCallback(() => {
    const elements = document.querySelectorAll<HTMLElement>("[data-hint]");
    const currentDismissed = getDismissed();
    const found: HintTarget[] = [];

    elements.forEach((el) => {
      const hint = el.getAttribute("data-hint");
      const id =
        el.getAttribute("data-hint-id") ||
        `hint_${hint?.slice(0, 30).replace(/\s/g, "_")}`;

      if (hint && !currentDismissed.includes(id)) {
        const rect = el.getBoundingClientRect();
        found.push({ id, hint, rect });
      }
    });

    setTargets(found);
  }, []);

  const throttledScan = useCallback(() => {
    if (throttleRef.current) return;
    throttleRef.current = setTimeout(() => {
      scanForHints();
      throttleRef.current = null;
    }, 150);
  }, [scanForHints]);

  // Scan on mount and route change
  useEffect(() => {
    // Small delay to let the page render
    const timer = setTimeout(scanForHints, 300);
    return () => clearTimeout(timer);
  }, [location.pathname, scanForHints]);

  // Reposition on scroll/resize
  useEffect(() => {
    window.addEventListener("scroll", throttledScan, true);
    window.addEventListener("resize", throttledScan);
    return () => {
      window.removeEventListener("scroll", throttledScan, true);
      window.removeEventListener("resize", throttledScan);
      if (throttleRef.current) clearTimeout(throttleRef.current);
    };
  }, [throttledScan]);

  const handleDismiss = (id: string) => {
    setDismissed((prev) => [...prev, id]);
    setTargets((prev) => prev.filter((t) => t.id !== id));
  };

  if (targets.length === 0) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes hint-ping {
          0% { transform: scale(1); opacity: 0.75; }
          75%, 100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes hint-fade-in {
          from { opacity: 0; transform: translate(-50%, 4px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
      {targets.map((target) => (
        <HintDot key={target.id} target={target} onDismiss={handleDismiss} />
      ))}
    </>,
    document.body
  );
}
