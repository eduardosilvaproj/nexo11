import * as React from "react";
import { cn } from "@/lib/utils";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Smooth page transition wrapper.
 * Applies a fade-in + slight slide-up animation on mount.
 * Respects prefers-reduced-motion.
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <div
      className={cn(
        "animate-page-transition",
        className
      )}
    >
      {children}
    </div>
  );
}
