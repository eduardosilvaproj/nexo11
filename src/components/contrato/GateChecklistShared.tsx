import { useState } from "react";
import { CheckCircle2, Circle, ChevronDown, ChevronRight, Lock, ArrowRight, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export const Block: React.FC<{
  title: string; doneCount: number; totalCount: number; defaultOpen?: boolean; children: React.ReactNode;
}> = ({ title, doneCount, totalCount, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  const allDone = doneCount === totalCount && totalCount > 0;
  return (
    <div className="rounded-lg border border-[#E8ECF2]">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F7F9FC]">
        <div className="flex items-center gap-2">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span className="text-[13px] font-semibold text-[#0D1117]">{title}</span>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: allDone ? "#ECFDF3" : "#F7F9FC", color: allDone ? "#05873C" : "#6B7A90" }}>
          {doneCount}/{totalCount}
        </span>
      </button>
      {open && <div className="px-4 pb-4 pt-1 flex flex-col gap-2">{children}</div>}
    </div>
  );
};

export const Item: React.FC<{ done: boolean; label: string; action?: React.ReactNode }> = ({ done, label, action }) => (
  <div className="flex items-center justify-between py-2 gap-3 border-t border-[#F2F5F9] first:border-t-0">
    <div className="flex items-center gap-2 min-w-0">
      {done ? <CheckCircle2 size={16} className="text-[#05873C]" /> : <Circle size={16} className="text-[#C0C8D6]" />}
      <span className="text-[13px]" style={{ color: done ? "#0D1117" : "#6B7A90" }}>{label}</span>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export const ProgressHeader: React.FC<{ title: string; subtitle: string; done: number; total: number }> = ({ title, subtitle, done, total }) => {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="rounded-xl border border-[#E8ECF2] bg-white p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h2 className="text-base font-semibold text-[#0D1117]">{title}</h2>
          <p className="text-sm text-[#6B7A90]">{subtitle}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold text-[#0D1117]">{done}/{total}</div>
          <div className="text-xs text-[#6B7A90]">{pct}% concluído</div>
        </div>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
};

export const AvancarButton: React.FC<{ enabled: boolean; label: string; onClick: () => void }> = ({ enabled, label, onClick }) => (
  <Button onClick={onClick} disabled={!enabled} size="lg"
    className={enabled ? "bg-[#1E6FBF] hover:bg-[#1759A0] text-white" : ""}>
    {enabled ? <>{label} <ArrowRight size={16} className="ml-2" /></> : <><Lock size={16} className="mr-2" /> {label}</>}
  </Button>
);

export const Alerta: React.FC<{ children: React.ReactNode; tone?: "warn" | "error" | "info" }> = ({ children, tone = "warn" }) => {
  const styles = tone === "error"
    ? "bg-red-50 border-red-200 text-red-900"
    : tone === "info"
    ? "bg-blue-50 border-blue-200 text-blue-900"
    : "bg-amber-50 border-amber-200 text-amber-900";
  return (
    <div className={`rounded-lg border p-3 flex gap-2 text-sm ${styles}`}>
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
};

export const formatBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
