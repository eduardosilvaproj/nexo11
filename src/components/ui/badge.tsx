import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200/80",
        destructive: "border-rose-100 bg-rose-50 text-rose-700",
        outline: "text-slate-700 border-slate-200 bg-white",
        success: "border-emerald-100 bg-emerald-50 text-emerald-700",
        info: "border-sky-100 bg-sky-50 text-sky-700",
        warning: "border-amber-100 bg-amber-50 text-amber-700",
        muted: "border-slate-200 bg-slate-50 text-slate-600",
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
