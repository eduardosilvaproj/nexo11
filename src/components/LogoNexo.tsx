interface LogoNexoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LogoNexo({ size = "md", className = "" }: LogoNexoProps) {
  const sizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
  };

  return (
    <span className={`font-black tracking-tight ${sizes[size]} ${className}`}>
      <span className="text-white">NE</span>
      <span className="nexo-text-gradient-x">X</span>
      <span className="text-white">O</span>
    </span>
  );
}
