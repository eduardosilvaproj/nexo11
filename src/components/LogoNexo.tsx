interface LogoNexoProps {
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  xColor?: string;
}

const SIZE_PX: Record<NonNullable<LogoNexoProps["size"]>, number> = {
  sm: 18,
  md: 22,
  lg: 32,
  xl: 96,
  "2xl": 160,
};

export function LogoNexo({ size = "md", className = "" }: LogoNexoProps) {
  const height = SIZE_PX[size];

  return (
    <img 
      src="/nexus-logo.png" 
      alt="NEXUS" 
      className={className}
      style={{ height, width: "auto", objectFit: "contain" }}
    />
  );
}
