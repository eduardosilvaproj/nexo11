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
  const filter = isHero
    ? "url(#nx-logo-feather) drop-shadow(0 0 0.5px rgba(255,255,255,0.25)) drop-shadow(0 1px 1px rgba(0,0,0,0.16)) drop-shadow(0 8px 24px rgba(0,0,0,0.26)) drop-shadow(0 24px 60px rgba(8,18,32,0.42))"
    : glow === "none"
    ? undefined
    : glow === "premium"
    ? "drop-shadow(0 0 48px rgba(0,170,255,0.55)) drop-shadow(0 0 96px rgba(18,183,106,0.30)) drop-shadow(0 0 16px rgba(255,255,255,0.08))"
    : "drop-shadow(0 0 24px rgba(0,170,255,0.40)) drop-shadow(0 0 48px rgba(18,183,106,0.20))";

  return (
    <>
      {isHero && (
        <svg
          width="0"
          height="0"
          aria-hidden
          style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
        >
          <defs>
            {/* Feather edges: blur alpha lightly, then erode-ish recomposite to soften PNG cut */}
            <filter id="nx-logo-feather" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
              <feGaussianBlur in="SourceAlpha" stdDeviation="0.75" result="blurA" />
              <feComposite in="SourceGraphic" in2="blurA" operator="in" result="softened" />
              <feMerge>
                <feMergeNode in="softened" />
              </feMerge>
            </filter>
          </defs>
        </svg>
      )}
      <img
        src="/nexo-logo.png"
        alt="NEXO"
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
    </>
  );
}


