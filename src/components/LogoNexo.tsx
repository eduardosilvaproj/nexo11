interface LogoNexoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  xColor?: string;
}

const SIZE_PX: Record<NonNullable<LogoNexoProps["size"]>, number> = {
  sm: 18,
  md: 22,
  lg: 32,
};

export function LogoNexo({ size = "md", className = "", xColor }: LogoNexoProps) {
  const fontSize = SIZE_PX[size];

  return (
    <span
      className={className}
      style={{
        fontWeight: 800,
        fontSize,
        letterSpacing: "-0.5px",
        lineHeight: 1,
      }}
    >
      <span style={{ color: "currentColor" }}>NE</span>
      <span
        style={{
          color: xColor || "transparent",
          background: xColor ? "none" : "linear-gradient(135deg, #00AAFF 0%, #1E6FBF 50%, #12B76A 100%)",
          WebkitBackgroundClip: xColor ? "none" : "text",
          WebkitTextFillColor: xColor ? "currentColor" : "transparent",
          backgroundClip: xColor ? "none" : "text",
        }}
      >
        X
      </span>
      <span style={{ color: "currentColor" }}>O</span>
    </span>
  );
}
