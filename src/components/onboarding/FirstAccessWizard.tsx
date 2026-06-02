import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  ShoppingCart,
  Ruler,
  Hammer,
  Truck,
  BarChart3,
  Settings,
  Check,
  ArrowRight,
  MessageCircle,
  ClipboardList,
  HelpCircle,
  PieChart,
  Users,
  FileText,
  DollarSign,
  Mail,
  Calendar,
  Camera,
  AlertTriangle,
  Clock,
  MapPin,
  CheckCircle2,
  LayoutDashboard,
  Radar,
  LineChart,
  Receipt,
  UserCog,
  Wallet,
  Package,
} from "lucide-react";

type Role = "vendedor" | "tecnico" | "montador" | "motorista" | "gerente" | "administrativo";

interface RoleCard {
  id: Role;
  emoji: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface FeatureItem {
  name: string;
  icon: React.ReactNode;
}

const ROLES: RoleCard[] = [
  { id: "vendedor", emoji: "🛒", title: "Vendedor", description: "Leads, contratos, comissões", icon: <ShoppingCart className="w-5 h-5" /> },
  { id: "tecnico", emoji: "📐", title: "Técnico", description: "Medições, conferências, projetos", icon: <Ruler className="w-5 h-5" /> },
  { id: "montador", emoji: "🔨", title: "Montador", description: "Agenda, checklist, fotos de obra", icon: <Hammer className="w-5 h-5" /> },
  { id: "motorista", emoji: "🚚", title: "Motorista", description: "Entregas, rotas, confirmações", icon: <Truck className="w-5 h-5" /> },
  { id: "gerente", emoji: "📊", title: "Gerente", description: "Dashboard, equipe, KPIs", icon: <BarChart3 className="w-5 h-5" /> },
  { id: "administrativo", emoji: "⚙️", title: "Administrativo", description: "RH, financeiro, compras", icon: <Settings className="w-5 h-5" /> },
];

const FEATURES_BY_ROLE: Record<Role, FeatureItem[]> = {
  vendedor: [
    { name: "Pipeline de leads", icon: <PieChart className="w-5 h-5" /> },
    { name: "Novo contrato", icon: <FileText className="w-5 h-5" /> },
    { name: "Comissões", icon: <DollarSign className="w-5 h-5" /> },
    { name: "Mensagens", icon: <Mail className="w-5 h-5" /> },
  ],
  tecnico: [
    { name: "Agenda", icon: <Calendar className="w-5 h-5" /> },
    { name: "Medição", icon: <Ruler className="w-5 h-5" /> },
    { name: "Conferência", icon: <CheckCircle2 className="w-5 h-5" /> },
    { name: "Checklist", icon: <ClipboardList className="w-5 h-5" /> },
  ],
  montador: [
    { name: "Agenda do dia", icon: <Calendar className="w-5 h-5" /> },
    { name: "Fotos", icon: <Camera className="w-5 h-5" /> },
    { name: "Ocorrências", icon: <AlertTriangle className="w-5 h-5" /> },
    { name: "Ponto", icon: <Clock className="w-5 h-5" /> },
  ],
  motorista: [
    { name: "Entregas do dia", icon: <Package className="w-5 h-5" /> },
    { name: "Rotas", icon: <MapPin className="w-5 h-5" /> },
    { name: "Confirmação", icon: <CheckCircle2 className="w-5 h-5" /> },
    { name: "Ponto", icon: <Clock className="w-5 h-5" /> },
  ],
  gerente: [
    { name: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: "Radar equipe", icon: <Radar className="w-5 h-5" /> },
    { name: "Analytics", icon: <LineChart className="w-5 h-5" /> },
    { name: "DRE", icon: <Receipt className="w-5 h-5" /> },
  ],
  administrativo: [
    { name: "RH", icon: <UserCog className="w-5 h-5" /> },
    { name: "Financeiro", icon: <Wallet className="w-5 h-5" /> },
    { name: "Compras", icon: <Package className="w-5 h-5" /> },
    { name: "Equipe", icon: <Users className="w-5 h-5" /> },
  ],
};

/* ─── Confetti CSS (injected once) ─── */
const confettiStyles = `
@keyframes nexo-confetti-fall {
  0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
  100% { transform: translateY(420px) rotate(720deg); opacity: 0; }
}
@keyframes nexo-confetti-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-8px); }
  75% { transform: translateX(8px); }
}
.nexo-confetti-piece {
  position: absolute;
  width: 10px;
  height: 10px;
  top: -10px;
  border-radius: 2px;
  animation: nexo-confetti-fall 3s ease-in-out forwards, nexo-confetti-shake 0.5s ease-in-out infinite;
}
@keyframes nexo-glow-pulse {
  0%, 100% { box-shadow: 0 0 20px rgba(30,111,191,0.3), 0 0 60px rgba(30,111,191,0.1); }
  50% { box-shadow: 0 0 40px rgba(30,111,191,0.5), 0 0 80px rgba(30,111,191,0.2); }
}
.nexo-logo-glow {
  animation: nexo-glow-pulse 2s ease-in-out infinite;
}
@keyframes nexo-slide-in-right {
  from { transform: translateX(60px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes nexo-slide-in-left {
  from { transform: translateX(-60px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
.nexo-slide-in {
  animation: nexo-slide-in-right 0.35s ease-out forwards;
}
.nexo-slide-in-back {
  animation: nexo-slide-in-left 0.35s ease-out forwards;
}
`;

function Confetti() {
  const colors = ["#1E6FBF", "#12B76A", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 2}s`,
    color: colors[i % colors.length],
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="nexo-confetti-piece"
          style={{
            left: p.left,
            animationDelay: p.delay,
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i === current ? 24 : 8,
            height: 8,
            backgroundColor: i === current ? "#1E6FBF" : "#E8ECF2",
          }}
        />
      ))}
    </div>
  );
}

/* ─── Main Component ─── */
export function FirstAccessWizard() {
  const { user, perfil } = useAuth();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [animKey, setAnimKey] = useState(0);

  const TOTAL_STEPS = 4;

  useEffect(() => {
    if (!user?.id) return;
    const key = `nexo_onboarding_done_${user.id}`;
    if (!localStorage.getItem(key)) {
      setVisible(true);
    }
  }, [user?.id]);

  // Inject confetti styles once
  useEffect(() => {
    if (!visible) return;
    const id = "nexo-onboarding-styles";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = confettiStyles;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById(id);
      if (el) el.remove();
    };
  }, [visible]);

  const goNext = () => {
    setDirection("forward");
    setAnimKey((k) => k + 1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };

  const finish = () => {
    if (user?.id) {
      localStorage.setItem(`nexo_onboarding_done_${user.id}`, "true");
    }
    setVisible(false);
  };

  if (!visible || !user?.id) return null;

  const userName = perfil?.nome?.split(" ")[0] || "usuário";

  const content = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: "blur(8px)", backgroundColor: "rgba(13,17,23,0.6)" }}
    >
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Step content */}
        <div
          key={animKey}
          className={direction === "forward" ? "nexo-slide-in" : "nexo-slide-in-back"}
        >
          {step === 0 && <StepWelcome userName={userName} onNext={goNext} />}
          {step === 1 && (
            <StepRole
              selectedRole={selectedRole}
              onSelect={setSelectedRole}
              onNext={goNext}
            />
          )}
          {step === 2 && (
            <StepFeatures selectedRole={selectedRole} onNext={goNext} />
          )}
          {step === 3 && <StepDone onFinish={finish} />}
        </div>

        {/* Dots */}
        <div className="pb-6">
          <StepDots current={step} total={TOTAL_STEPS} />
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

/* ─── Step Components ─── */

function StepWelcome({ userName, onNext }: { userName: string; onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center px-8 pt-10 pb-4">
      {/* Logo */}
      <img
        src="/nexo-logo-internal.png"
        alt="NEXO Logo"
        className="w-36 h-auto mb-6"
        style={{
          filter: "drop-shadow(0 4px 12px rgba(26,155,232,0.4)) drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
        }}
      />

      <h1 className="text-2xl font-bold mb-2" style={{ color: "#0D1117" }}>
        Bem-vindo ao NEXO! 🎉
      </h1>
      <p className="text-sm mb-4" style={{ color: "#6B7A90" }}>
        Vamos configurar seu espaço de trabalho em poucos segundos
      </p>
      <p className="text-lg font-medium mb-8" style={{ color: "#0D1117" }}>
        Olá, {userName}!
      </p>

      <button
        onClick={onNext}
        className="w-full py-3 rounded-xl text-white font-semibold text-base transition-all hover:opacity-90 active:scale-[0.98]"
        style={{ backgroundColor: "#1E6FBF" }}
      >
        Começar
      </button>
    </div>
  );
}

function StepRole({
  selectedRole,
  onSelect,
  onNext,
}: {
  selectedRole: Role | null;
  onSelect: (r: Role) => void;
  onNext: () => void;
}) {
  return (
    <div className="px-8 pt-8 pb-4">
      <h2 className="text-xl font-bold text-center mb-1" style={{ color: "#0D1117" }}>
        Qual sua função principal?
      </h2>
      <p className="text-sm text-center mb-6" style={{ color: "#6B7A90" }}>
        Isso personaliza seu painel inicial
      </p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {ROLES.map((role) => {
          const isSelected = selectedRole === role.id;
          return (
            <button
              key={role.id}
              onClick={() => onSelect(role.id)}
              className="relative flex flex-col items-start p-3 rounded-xl border-2 transition-all text-left hover:shadow-md"
              style={{
                borderColor: isSelected ? "#1E6FBF" : "#E8ECF2",
                backgroundColor: isSelected ? "rgba(30,111,191,0.04)" : "#fff",
              }}
            >
              {isSelected && (
                <div
                  className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#1E6FBF" }}
                >
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <span className="text-xl mb-1">{role.emoji}</span>
              <span className="text-sm font-semibold" style={{ color: "#0D1117" }}>
                {role.title}
              </span>
              <span className="text-xs" style={{ color: "#6B7A90" }}>
                {role.description}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={onNext}
        disabled={!selectedRole}
        className="w-full py-3 rounded-xl text-white font-semibold text-base transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ backgroundColor: "#1E6FBF" }}
      >
        Próximo
      </button>
    </div>
  );
}

function StepFeatures({ selectedRole, onNext }: { selectedRole: Role | null; onNext: () => void }) {
  const role = selectedRole || "vendedor";
  const features = FEATURES_BY_ROLE[role];

  return (
    <div className="px-8 pt-8 pb-4">
      <h2 className="text-xl font-bold text-center mb-1" style={{ color: "#0D1117" }}>
        Suas Ferramentas
      </h2>
      <p className="text-sm text-center mb-6" style={{ color: "#6B7A90" }}>
        Estas são suas principais ferramentas. Pode acessar tudo pelo menu lateral.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {features.map((feat) => (
          <div
            key={feat.name}
            className="flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm"
            style={{ borderColor: "#E8ECF2" }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: "rgba(30,111,191,0.08)", color: "#1E6FBF" }}
            >
              {feat.icon}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium block truncate" style={{ color: "#0D1117" }}>
                {feat.name}
              </span>
            </div>
            <ArrowRight className="w-4 h-4 shrink-0" style={{ color: "#6B7A90" }} />
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="w-full py-3 rounded-xl text-white font-semibold text-base transition-all hover:opacity-90 active:scale-[0.98]"
        style={{ backgroundColor: "#1E6FBF" }}
      >
        Próximo
      </button>
    </div>
  );
}

function StepDone({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="relative px-8 pt-10 pb-4">
      <Confetti />

      <div className="flex flex-col items-center text-center relative z-10">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: "rgba(18,183,106,0.1)" }}
        >
          <CheckCircle2 className="w-8 h-8" style={{ color: "#12B76A" }} />
        </div>

        <h2 className="text-2xl font-bold mb-4" style={{ color: "#0D1117" }}>
          Tudo pronto! 🚀
        </h2>

        <div className="w-full text-left space-y-3 mb-8">
          <p className="text-sm font-medium mb-2" style={{ color: "#0D1117" }}>
            Dicas rápidas:
          </p>
          <div className="flex items-start gap-2">
            <span className="text-base leading-none mt-0.5">💬</span>
            <span className="text-sm" style={{ color: "#6B7A90" }}>
              O assistente (canto inferior) tira dúvidas
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-base leading-none mt-0.5">📋</span>
            <span className="text-sm" style={{ color: "#6B7A90" }}>
              Feedback no menu para reportar bugs
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-base leading-none mt-0.5">❓</span>
            <span className="text-sm" style={{ color: "#6B7A90" }}>
              Ajuda no menu para tutoriais
            </span>
          </div>
        </div>

        <button
          onClick={onFinish}
          className="w-full py-3 rounded-xl text-white font-semibold text-base transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ backgroundColor: "#12B76A" }}
        >
          Entrar no Sistema
        </button>
      </div>
    </div>
  );
}
