import { useState } from "react";

export type ContratoTabKey =
  | "comercial"
  | "tecnico"
  | "producao"
  | "logistica"
  | "montagem"
  | "ambientes"
  | "pos_venda"
  | "dre";

const TABS: { key: ContratoTabKey; label: string }[] = [
  { key: "comercial", label: "Comercial" },
  { key: "tecnico", label: "Técnico" },
  { key: "producao", label: "Produção" },
  { key: "logistica", label: "Logística" },
  { key: "montagem", label: "Montagem" },
  { key: "ambientes", label: "Ambientes" },
  { key: "pos_venda", label: "Pós-venda" },
  { key: "dre", label: "DRE" },
];

interface ContratoTabsProps {
  active: ContratoTabKey;
  onChange: (key: ContratoTabKey) => void;
  pendencias?: Partial<Record<ContratoTabKey, boolean>>;
}

export function ContratoTabs({ active, onChange, pendencias = {} }: ContratoTabsProps) {
  return (
    <div
      className="bg-white"
      style={{ padding: "0 32px", borderBottom: "0.5px solid #E8ECF2" }}
    >
      <div className="flex items-center gap-6">
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          const hasPendencia = pendencias[tab.key];
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className="relative py-3 transition-colors"
              style={{
                fontSize: 13,
                fontWeight: isActive ? 500 : 400,
                color: isActive ? "#1E6FBF" : "#6B7A90",
                borderBottom: isActive ? "2px solid #1E6FBF" : "2px solid transparent",
                marginBottom: "-0.5px",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = "#0D1117";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = "#6B7A90";
              }}
            >
              <span className="relative inline-block">
                {tab.label}
                {hasPendencia && (
                  <span
                    className="absolute"
                    style={{
                      top: -2,
                      right: -8,
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      backgroundColor: "#E53935",
                    }}
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function useContratoTabs(initial: ContratoTabKey = "comercial") {
  const [active, setActive] = useState<ContratoTabKey>(initial);
  return { active, setActive };
}
