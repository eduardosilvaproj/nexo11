interface Props {
  title: string;
  description?: string;
}

export default function Placeholder({ title, description }: Props) {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">
        {description ?? "Módulo em construção. Em breve nesta fatia do MVP."}
      </p>
    </div>
  );
}
