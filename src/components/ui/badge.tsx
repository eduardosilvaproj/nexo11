import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold tracking-[0.01em] transition-colors focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-gradient-to-r from-[#1a7fe8] to-[#22c97a] text-white shadow-sm",
        secondary: "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200",
        destructive: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
        outline: "border-slate-200 bg-white/80 text-slate-700",
        success: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
        info: "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
