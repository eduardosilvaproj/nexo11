import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Animated card placeholder for loading states.
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/80 bg-white/95 p-6 shadow-sm",
        className
      )}
    >
      <div className="space-y-4">
        <Skeleton className="h-4 w-3/4 bg-gradient-to-r from-slate-100 to-slate-200" />
        <Skeleton className="h-3 w-1/2 bg-gradient-to-r from-slate-100 to-slate-200" />
        <div className="space-y-2 pt-2">
          <Skeleton className="h-3 w-full bg-gradient-to-r from-slate-100 to-slate-200" />
          <Skeleton className="h-3 w-5/6 bg-gradient-to-r from-slate-100 to-slate-200" />
        </div>
      </div>
    </div>
  );
}

/**
 * Table skeleton with configurable row count.
 */
export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/95 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <Skeleton className="h-3 w-24 bg-gradient-to-r from-slate-100 to-slate-200" />
        <Skeleton className="h-3 w-32 bg-gradient-to-r from-slate-100 to-slate-200" />
        <Skeleton className="hidden h-3 w-20 bg-gradient-to-r from-slate-100 to-slate-200 sm:block" />
        <Skeleton className="hidden h-3 w-28 bg-gradient-to-r from-slate-100 to-slate-200 md:block" />
        <Skeleton className="hidden h-3 w-16 bg-gradient-to-r from-slate-100 to-slate-200 lg:block" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center gap-4 px-4 py-3",
            i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
          )}
        >
          <Skeleton className="h-3 w-24 bg-gradient-to-r from-slate-100 to-slate-200" />
          <Skeleton className="h-3 w-32 bg-gradient-to-r from-slate-100 to-slate-200" />
          <Skeleton className="hidden h-3 w-20 bg-gradient-to-r from-slate-100 to-slate-200 sm:block" />
          <Skeleton className="hidden h-3 w-28 bg-gradient-to-r from-slate-100 to-slate-200 md:block" />
          <Skeleton className="hidden h-3 w-16 bg-gradient-to-r from-slate-100 to-slate-200 lg:block" />
        </div>
      ))}
    </div>
  );
}

/**
 * KPI cards skeleton with configurable count.
 */
export function SkeletonKPI({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200/80 bg-white/95 p-4 shadow-sm md:p-5"
        >
          <div className="space-y-3">
            <Skeleton className="h-3 w-20 bg-gradient-to-r from-slate-100 to-slate-200" />
            <Skeleton className="h-7 w-24 bg-gradient-to-r from-slate-100 to-slate-200" />
            <Skeleton className="h-2 w-16 bg-gradient-to-r from-slate-100 to-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}
