interface LogoNexoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_PX: Record<NonNullable<LogoNexoProps["size"]>, number> = {
  sm: 18,
  md: 22,
  lg: 32,
};

export function LogoNexo({ size = "md", className = "" }: LogoNexoProps) {
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
      <span style={{ color: "#FFFFFF" }}>NE</span>
      <span
        style={{
          background:
            "linear-gradient(135deg, #00AAFF 0%, #1E6FBF 50%, #12B76A 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        X
      </span>
      <span style={{ color: "#FFFFFF" }}>O</span>
    </span>
  );
}
