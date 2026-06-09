import { useState } from "react";
import { cn } from "@/lib/utils";
import { ImageOff } from "lucide-react";

interface LogoNexoProps {
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
}

const SIZE_PX: Record<NonNullable<LogoNexoProps["size"]>, number> = {
  sm: 16,
  md: 20,
  lg: 28,
  xl: 64,
  "2xl": 120,
};

export function LogoNexo({ size = "md", className = "" }: LogoNexoProps) {
  const height = SIZE_PX[size];
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center rounded-lg bg-slate-100/10 border border-slate-200/20", 
          className
        )}
        style={{ height, width: "auto", minWidth: height * 2 }}
      >
        <div className="flex items-center gap-2 px-3 text-slate-400">
          <ImageOff className="h-1/2 w-auto max-h-[24px]" />
          <span className="font-bold tracking-tighter text-[10px] sm:text-xs">NEXUS</span>
        </div>
      </div>
    );
  }

  return (
    <img 
      src="/nexus-logo.png" 
      alt="NEXUS Planejados" 
      className={className}
      style={{ height, width: "auto", objectFit: "contain" }}
      onError={() => setError(true)}
    />
  );
}

