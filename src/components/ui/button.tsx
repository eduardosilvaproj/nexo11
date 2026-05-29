import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a9be8] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-[#1a7fe8] to-[#22c97a] text-white shadow-lg shadow-sky-900/10 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-sky-900/15 active:translate-y-0",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:-translate-y-0.5 hover:bg-destructive/90 hover:shadow-lg active:translate-y-0",
        outline: "border border-slate-200 bg-white text-[#0D1117] shadow-sm hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-50/70 hover:text-[#1a7fe8] active:translate-y-0",
        secondary: "border border-slate-200 bg-slate-100 text-slate-900 shadow-sm hover:-translate-y-0.5 hover:bg-slate-200 active:translate-y-0",
        ghost: "text-slate-700 hover:bg-sky-50 hover:text-[#1a7fe8]",
        link: "text-[#1a7fe8] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-11 rounded-xl px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
