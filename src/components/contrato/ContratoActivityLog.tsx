interface ContratoActivityLogProps {
  contratoId: string;
}

export function ContratoActivityLog({ contratoId }: ContratoActivityLogProps) {
  return (
    <aside
      className="rounded-xl bg-white"
      style={{ border: "0.5px solid #E8ECF2", padding: 16 }}
    >
      <h3 style={{ fontSize: 13, fontWeight: 500, color: "#0D1117" }}>
        Atividades
      </h3>
      <p className="mt-2" style={{ fontSize: 12, color: "#6B7A90" }}>
        Histórico de mudanças do contrato aparecerá aqui.
      </p>
    </aside>
  );
}
