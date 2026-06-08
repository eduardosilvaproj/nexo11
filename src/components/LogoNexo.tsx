import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoNexoProps {
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  xColor?: string;
}

const SIZE_PX: Record<NonNullable<LogoNexoProps["size"]>, number> = {
  sm: 16,
  md: 20,
  lg: 28,
  xl: 64,
  "2xl": 120,
};

export function LogoNexo({ size = "md", className = "" }: LogoNexoProps) {
  const [error, setError] = useState(false);
  const height = SIZE_PX[size];

  if (error) {
    return (
      <div 
        className={cn("flex items-center justify-center bg-slate-100 rounded-md", className)}
        style={{ height, width: height * 2.5, maxWidth: "100%" }}
      >
        <div className="flex items-center gap-1.5 text-slate-400">
          <ImageOff size={height * 0.6} />
          <span className="font-bold tracking-tight" style={{ fontSize: height * 0.4 }}>NEXUS</span>
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
