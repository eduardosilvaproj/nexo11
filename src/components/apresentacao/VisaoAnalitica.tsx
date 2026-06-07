import { Reveal } from "./Reveal";
import { TrendingUp, Activity, PieChart, LineChart } from "lucide-react";

export function VisaoAnalitica() {
  return (
    <section className="relative py-20 sm:py-32 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <div className="text-center mb-12">
            <div className="text-[10px] font-semibold tracking-[0.4em] text-white/40 uppercase mb-4">
              Seção 07 · A Experiência
            </div>
            <h2 className="text-[clamp(1.75rem,5vw,3rem)] font-semibold text-white tracking-tight max-w-3xl mx-auto leading-tight">
              Capacidade analítica, visão gerencial.
            </h2>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div
            className="relative rounded-3xl border border-white/10 bg-white/[0.025] backdrop-blur-xl overflow-hidden"
            style={{ boxShadow: "0 60px 140px -50px rgba(26,155,232,0.45), 0 20px 50px -20px rgba(0,0,0,0.6)" }}
          >
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10 bg-white/[0.02]">
              <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
              <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
              <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
              <span className="ml-3 text-[10px] text-white/40 font-mono">arandu.app / inteligência</span>
            </div>

            <div className="p-6 sm:p-10 grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* KPI cards */}
              {[
                { icon: TrendingUp, label: "Receita Projetada", value: "R$ 4,8M", trend: "+18%" },
                { icon: Activity, label: "Ciclo Operacional", value: "12,4 dias", trend: "-9%" },
                { icon: PieChart, label: "Margem Consolidada", value: "32,1%", trend: "+2,4 p.p." },
              ].map((k) => (
                <div key={k.label} className="rounded-2xl p-5 bg-white/[0.03] border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <k.icon className="w-4 h-4 text-[#2DD4BF]" />
                    <span className="text-[10px] text-[#2DD4BF] font-semibold tracking-wide">{k.trend}</span>
                  </div>
                  <div className="text-2xl font-semibold text-white tracking-tight">{k.value}</div>
                  <div className="text-[11px] text-white/50 mt-1 tracking-wide uppercase">{k.label}</div>
                </div>
              ))}

              {/* Chart placeholder */}
              <div className="md:col-span-3 rounded-2xl p-6 bg-white/[0.03] border border-white/10">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <LineChart className="w-4 h-4 text-white/60" />
                    <span className="text-xs text-white/70 font-medium">Performance consolidada · 12 semanas</span>
                  </div>
                  <span className="text-[10px] text-white/40 font-mono">live</span>
                </div>
                <svg viewBox="0 0 600 160" className="w-full h-32">
                  <defs>
                    <linearGradient id="va-fill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#2DD4BF" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="va-line" x1="0" x2="1" y1="0" y2="0">
                      <stop offset="0%" stopColor="#00AAFF" />
                      <stop offset="100%" stopColor="#2DD4BF" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,120 C60,110 90,90 140,85 C200,80 230,100 290,70 C340,45 380,55 430,40 C480,28 540,35 600,20 L600,160 L0,160 Z"
                    fill="url(#va-fill)"
                  />
                  <path
                    d="M0,120 C60,110 90,90 140,85 C200,80 230,100 290,70 C340,45 380,55 430,40 C480,28 540,35 600,20"
                    fill="none"
                    stroke="url(#va-line)"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
