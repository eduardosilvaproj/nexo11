import { Check, Lock } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type ContratoStatus = Database["public"]["Enums"]["contrato_status"];

const STEPS: { key: ContratoStatus; label: string }[] = [
  { key: "comercial", label: "Comercial" },
  { key: "medicao", label: "Medição" },
  { key: "conferencia", label: "Conferência" },
  { key: "implantacao", label: "Implantação" },
  { key: "producao", label: "Produção" },
  { key: "entrada", label: "Entrada" },
  { key: "montagem", label: "Montagem" },
  { key: "pos_venda", label: "Pós-venda" },
  { key: "finalizado", label: "Finalizado" },
];

// Mapeia status legados/equivalentes para a etapa visível no stepper
const STATUS_TO_STEP: Partial<Record<ContratoStatus, ContratoStatus>> = {
  tecnico: "medicao",
  logistica: "entrada",
};

interface ContratoStepperProps {
  current: ContratoStatus;
  blocked?: boolean;
}

export function ContratoStepper({ current, blocked = false }: ContratoStepperProps) {
  const effective = STATUS_TO_STEP[current] ?? current;
  const currentIndex = STEPS.findIndex((s) => s.key === effective);

  return (
    <>
      <style>{`
        @keyframes nexo-step-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(30,111,191,0.35); }
          50% { box-shadow: 0 0 0 6px rgba(30,111,191,0.15); }
        }
        .nexo-step-pulse { animation: nexo-step-pulse 2s infinite; }
      `}</style>
      <div
        style={{ padding: "16px 24px", borderBottom: "0.5px solid #E8ECF2" }}
        className="bg-white overflow-x-auto no-scrollbar"
      >
        <div className="flex items-start min-w-[880px] md:min-w-0">
          {STEPS.map((step, idx) => {
            const isDone = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            const isBlocked = isCurrent && blocked;
            const isLast = idx === STEPS.length - 1;

            let circleBg = "#E8ECF2";
            let circleColor = "#B0BAC9";
            let labelColor = "#6B7A90";
            let circleClass = "";

            if (isBlocked) {
              circleBg = "#E53935";
              circleColor = "#FFFFFF";
            } else if (isCurrent) {
              circleBg = "#1E6FBF";
              circleColor = "#FFFFFF";
              labelColor = "#0D1117";
              circleClass = "nexo-step-pulse";
            } else if (isDone) {
              circleBg = "#12B76A";
              circleColor = "#FFFFFF";
              labelColor = "#05873C";
            }

            return (
              <div key={step.key} className="flex flex-1 flex-col items-center">
                <div className="flex w-full items-center">
                  <div
                    className="flex-1"
                    style={
                      idx === 0
                        ? { borderTop: "2px solid transparent" }
                        : idx <= currentIndex
                          ? { borderTop: "2px solid #12B76A" }
                          : { borderTop: "2px solid #E8ECF2" }
                    }
                  />
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${circleClass}`}
                    style={{ backgroundColor: circleBg, color: circleColor }}
                  >
                    {isBlocked ? (
                      <Lock className="h-3.5 w-3.5" />
                    ) : isDone ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 600 }}>{idx + 1}</span>
                    )}
                  </div>
                  <div
                    className="flex-1"
                    style={
                      isLast
                        ? { borderTop: "2px solid transparent" }
                        : idx < currentIndex
                          ? { borderTop: "2px solid #12B76A" }
                          : isCurrent && !isBlocked
                            ? { borderTop: "2px dashed #B0BAC9" }
                            : { borderTop: "2px solid #E8ECF2" }
                    }
                  />
                </div>
                <span
                  className="mt-1.5 text-center"
                  style={{ fontSize: 10.5, color: labelColor, lineHeight: 1.2, fontWeight: isCurrent ? 600 : 400 }}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
