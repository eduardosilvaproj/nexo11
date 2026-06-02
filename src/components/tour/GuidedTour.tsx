import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export interface TourStep {
  target: string;
  title: string;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
}

export interface GuidedTourProps {
  steps: TourStep[];
  tourId: string;
  autoStart?: boolean;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function GuidedTour({ steps, tourId, autoStart = false }: GuidedTourProps) {
  const { user } = useAuth();
  const [active, setActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [completed, setCompleted] = useState(false);
  const observerRef = useRef<ResizeObserver | null>(null);

  // Check if tour was already completed
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("tour_progresso")
        .select("completo")
        .eq("user_id", user.id)
        .eq("tour_id", tourId)
        .single();

      if (data?.completo) {
        setCompleted(true);
      } else if (autoStart) {
        setActive(true);
      }
    })();
  }, [user, tourId, autoStart]);

  // Listen for external start event
  useEffect(() => {
    const handler = () => {
      if (!completed) {
        setCurrentStep(0);
        setActive(true);
      }
    };
    window.addEventListener("start-guided-tour", handler);
    return () => window.removeEventListener("start-guided-tour", handler);
  }, [completed]);

  // Update target rect when step changes
  const updateRect = useCallback(() => {
    if (!active || !steps[currentStep]) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(steps[currentStep].target);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
      });
      // Scroll element into view
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      setTargetRect(null);
    }
  }, [active, currentStep, steps]);

  useEffect(() => {
    updateRect();
    // Set up resize observer for layout changes
    if (active && steps[currentStep]) {
      const el = document.querySelector(steps[currentStep].target);
      if (el) {
        observerRef.current = new ResizeObserver(updateRect);
        observerRef.current.observe(el);
      }
    }
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect);
      observerRef.current?.disconnect();
    };
  }, [active, currentStep, updateRect, steps]);

  const saveProgress = async (stepIndex: number, completo: boolean) => {
    if (!user) return;
    const { data: existing } = await (supabase as any)
      .from("tour_progresso")
      .select("id")
      .eq("user_id", user.id)
      .eq("tour_id", tourId)
      .single();

    if (existing) {
      await (supabase as any)
        .from("tour_progresso")
        .update({ step_atual: stepIndex, completo, atualizado_em: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await (supabase as any)
        .from("tour_progresso")
        .insert({
          user_id: user.id,
          tour_id: tourId,
          step_atual: stepIndex,
          completo,
        });
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      // Complete
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  const handleSkip = () => {
    saveProgress(currentStep, false);
    setActive(false);
  };

  const handleComplete = () => {
    saveProgress(steps.length - 1, true);
    setCompleted(true);
    setActive(false);
  };

  if (!active || steps.length === 0) return null;

  const step = steps[currentStep];
  const pos = step.position || "bottom";
  const padding = 8;

  // Tooltip positioning
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) {
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)", position: "absolute" };
    }

    const base: React.CSSProperties = { position: "absolute" };
    const tooltipWidth = 320;

    switch (pos) {
      case "top":
        base.top = targetRect.top - padding - 8;
        base.left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        base.transform = "translateY(-100%)";
        break;
      case "bottom":
        base.top = targetRect.top + targetRect.height + padding + 8;
        base.left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        break;
      case "left":
        base.top = targetRect.top + targetRect.height / 2;
        base.left = targetRect.left - padding - 8;
        base.transform = "translate(-100%, -50%)";
        break;
      case "right":
        base.top = targetRect.top + targetRect.height / 2;
        base.left = targetRect.left + targetRect.width + padding + 8;
        base.transform = "translateY(-50%)";
        break;
    }

    return base;
  };

  const overlay = (
    <div className="fixed inset-0 z-[9999]" style={{ pointerEvents: "none" }}>
      {/* Semi-transparent overlay with spotlight cutout */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: "auto" }}
        onClick={handleSkip}
      >
        <defs>
          <mask id={`tour-mask-${tourId}`}>
            <rect width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - padding}
                y={targetRect.top - padding}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.5)"
          mask={`url(#tour-mask-${tourId})`}
        />
      </svg>

      {/* Spotlight border */}
      {targetRect && (
        <div
          className="absolute rounded-lg border-2 transition-all duration-300 ease-in-out"
          style={{
            top: targetRect.top - padding,
            left: targetRect.left - padding,
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
            borderColor: "#1E6FBF",
            pointerEvents: "none",
            boxShadow: "0 0 0 4px rgba(30,111,191,0.2)",
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="bg-white rounded-xl shadow-2xl p-4 w-[320px] transition-all duration-300 ease-in-out"
        style={{ ...getTooltipStyle(), pointerEvents: "auto", zIndex: 10000 }}
      >
        {/* Close */}
        <button
          className="absolute top-2 right-2 p-1 rounded hover:bg-gray-100"
          onClick={handleSkip}
        >
          <X className="w-3.5 h-3.5" style={{ color: "#6B7A90" }} />
        </button>

        <h4 className="font-semibold text-sm pr-6" style={{ color: "#0D1117" }}>
          {step.title}
        </h4>
        <p className="text-xs mt-2 leading-relaxed" style={{ color: "#6B7A90" }}>
          {step.content}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs" style={{ color: "#6B7A90" }}>
            {currentStep + 1} / {steps.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 px-2"
              onClick={handleSkip}
            >
              Pular
            </Button>
            {currentStep > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 px-2 gap-1"
                onClick={handlePrev}
              >
                <ChevronLeft className="w-3 h-3" /> Anterior
              </Button>
            )}
            <Button
              size="sm"
              className="text-xs h-7 px-3 text-white gap-1"
              style={{ backgroundColor: "#1E6FBF" }}
              onClick={handleNext}
            >
              {currentStep === steps.length - 1 ? "Concluir" : "Próximo"}
              {currentStep < steps.length - 1 && <ChevronRight className="w-3 h-3" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
