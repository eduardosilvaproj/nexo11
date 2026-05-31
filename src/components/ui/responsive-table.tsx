import * as React from "react";
import { cn } from "@/lib/utils";

interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps any table to be horizontally scrollable on small screens.
 * Adds subtle shadow indicators when content overflows.
 */
export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [showLeftShadow, setShowLeftShadow] = React.useState(false);
  const [showRightShadow, setShowRightShadow] = React.useState(false);

  const checkScroll = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setShowLeftShadow(scrollLeft > 0);
    setShowRightShadow(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const observer = new ResizeObserver(checkScroll);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      observer.disconnect();
    };
  }, [checkScroll]);

  return (
    <div className={cn("relative w-full", className)}>
      {/* Left shadow indicator */}
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 z-10 w-5 bg-gradient-to-r from-white to-transparent transition-opacity duration-200",
          showLeftShadow ? "opacity-100" : "opacity-0"
        )}
        aria-hidden="true"
      />
      {/* Right shadow indicator */}
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 z-10 w-5 bg-gradient-to-l from-white to-transparent transition-opacity duration-200",
          showRightShadow ? "opacity-100" : "opacity-0"
        )}
        aria-hidden="true"
      />
      <div
        ref={scrollRef}
        className="scrollbar-hide w-full overflow-x-auto"
      >
        <div className="min-w-full text-xs md:text-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
