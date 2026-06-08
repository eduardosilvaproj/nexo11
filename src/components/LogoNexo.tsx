import { useState } from "react";
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
  const height = SIZE_PX[size];

  return (
    <img 
      src="/nexus-logo.png" 
      alt="NEXUS Planejados" 
      className={className}
      style={{ height, width: "auto", objectFit: "contain" }}
    />
  );
}
