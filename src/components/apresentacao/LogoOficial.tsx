type Size = "sm" | "md" | "lg" | "xl" | "2xl";

const SIZE_PX: Record<Size, number> = {
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
  const px = SIZE_PX[size];
  const filter =
    glow === "none"
      ? undefined
      : glow === "premium"
      ? "drop-shadow(0 0 48px rgba(0,170,255,0.55)) drop-shadow(0 0 96px rgba(18,183,106,0.30)) drop-shadow(0 0 16px rgba(255,255,255,0.08))"
      : "drop-shadow(0 0 24px rgba(0,170,255,0.40)) drop-shadow(0 0 48px rgba(18,183,106,0.20))";

  return (
    <img
      src="/nexo-logo.png"
      alt="NEXO"
      width={px}
      height={px}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
      className={`select-none ${className}`}
      style={{ width: px, height: "auto", filter }}
    />
  );
}
