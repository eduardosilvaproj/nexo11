import { Check, Lock } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type ContratoStatus = Database["public"]["Enums"]["contrato_status"];

const STEPS: { key: ContratoStatus; label: string }[] = [
  { key: "comercial", label: "Comercial" },
  { key: "tecnico", label: "Técnico" },
  { key: "producao", label: "Produção" },
  { key: "logistica", label: "Logística" },
  { key: "montagem", label: "Montagem" },
  { key: "pos_venda", label: "Pós-venda" },
  { key: "finalizado", label: "Finalizado" },
];

interface ContratoStepperProps {
  current: ContratoStatus;
  blocked?: boolean;
}

export function ContratoStepper({ current, blocked = false }: ContratoStepperProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

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
        className="bg-white"
        style={{ padding: "16px 32px", borderBottom: "0.5px solid #E8ECF2" }}
        className="bg-white overflow-x-auto no-scrollbar"
      >
        <div className="flex items-start min-w-[700px] md:min-w-0">
          {STEPS.map((step, idx) => {
            const isDone = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            const isBlocked = isCurrent && blocked;
            const isFuture = idx > currentIndex;
            const isLast = idx === STEPS.length - 1;

            let circleBg = "#E8ECF2";
            let circleColor = "#B0BAC9";
            let labelColor = "#6B7A90";
            let circleClass = "";
            let connectorStyle: React.CSSProperties = {
              borderTop: "2px solid #E8ECF2",
            };

            if (isBlocked) {
              circleBg = "#E53935";
              circleColor = "#FFFFFF";
            } else if (isCurrent) {
              circleBg = "#1E6FBF";
              circleColor = "#FFFFFF";
              labelColor = "#0D1117";
              circleClass = "nexo-step-pulse";
              connectorStyle = { borderTop: "2px dashed #B0BAC9" };
            } else if (isDone) {
              circleBg = "#12B76A";
              circleColor = "#FFFFFF";
              labelColor = "#05873C";
              connectorStyle = { borderTop: "2px solid #12B76A" };
            }

            return (
              <div key={step.key} className="flex flex-1 flex-col items-center">
                <div className="flex w-full items-center">
                  {/* connector left (invisible for first) */}
                  <div
                    className="flex-1"
                    style={
                      idx === 0
                        ? { borderTop: "2px solid transparent" }
                        : isDone || (isCurrent && !isBlocked)
                          ? idx <= currentIndex
                            ? { borderTop: "2px solid #12B76A" }
                            : connectorStyle
                          : { borderTop: "2px solid #E8ECF2" }
                    }
                  />
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${circleClass}`}
                    style={{ backgroundColor: circleBg, color: circleColor }}
                  >
                    {isBlocked ? (
                      <Lock className="h-4 w-4" />
                    ) : isDone ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <span className="text-xs font-medium">{idx + 1}</span>
                    )}
                  </div>
                  {/* connector right */}
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
                  className="mt-2"
                  style={{ fontSize: 11, color: labelColor }}
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
