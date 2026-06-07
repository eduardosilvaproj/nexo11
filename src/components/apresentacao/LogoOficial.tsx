type Size = "sm" | "md" | "lg" | "xl" | "2xl" | "hero";

const SIZE_PX: Record<Exclude<Size, "hero">, number> = {
  sm: 28,
  md: 40,
  lg: 96,
  xl: 160,
  "2xl": 240,
};

interface LogoOficialProps {
  size?: Size;
  className?: string;
  glow?: "none" | "soft" | "premium";
  eager?: boolean;
}

export function LogoOficial({
  size = "md",
  className = "",
  glow = "soft",
  eager = false,
}: LogoOficialProps) {
  const isHero = size === "hero";
  const px = isHero ? undefined : SIZE_PX[size as Exclude<Size, "hero">];

  // Premium multi-layer drop-shadow for hero — subtle depth without hard edges
  const heroFilter = [
    "drop-shadow(0 0 0.6px rgba(255,255,255,0.35))",
    "drop-shadow(0 1px 1px rgba(0,0,0,0.18))",
    "drop-shadow(0 8px 24px rgba(0,0,0,0.28))",
    "drop-shadow(0 24px 60px rgba(8,18,32,0.45))",
  ].join(" ");

  const filter = isHero
    ? heroFilter
    : glow === "none"
    ? undefined
    : glow === "premium"
    ? "drop-shadow(0 0 48px rgba(0,170,255,0.55)) drop-shadow(0 0 96px rgba(45,212,191,0.30)) drop-shadow(0 0 16px rgba(255,255,255,0.08))"
    : "drop-shadow(0 0 24px rgba(0,170,255,0.40)) drop-shadow(0 0 48px rgba(45,212,191,0.20))";

  return (
    <img
      src="/nexus-logo.svg"
      alt="NEXUS PLANEJADOS"
      width={px}
      height={px}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
      className={`select-none ${className}`}
      style={{
        width: isHero ? "clamp(220px, 60vw, 580px)" : px,
        height: "auto",
        filter,
        willChange: isHero ? "transform, filter" : undefined,
      }}
    />
  );
}
