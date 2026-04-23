import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { z } from "zod";
import { CanvasWaves } from "@/components/auth/CanvasWaves";

const emailSchema = z.string().trim().email("E-mail inválido").max(255);
const passwordSchema = z.string().min(6, "Mínimo 6 caracteres").max(72);

export default function AuthPage() {
  const { user, loading, signIn } = useAuth();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#060d1a]">
        <Loader2 className="h-6 w-6 animate-spin text-[#1a7fe8]" />
      </div>
    );
  }

  if (user) {
    const from = (location.state as any)?.from?.pathname || "/";
    return <Navigate to={from} replace />;
  }

  const validate = () => {
    const errs: typeof errors = {};
    const e = emailSchema.safeParse(email);
    if (!e.success) errs.email = e.error.issues[0].message;
    const p = passwordSchema.safeParse(password);
    if (!p.success) errs.password = p.error.issues[0].message;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) toast.error(error);
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) toast.error(error.message);
  };

  const inputClass = (hasError?: string) =>
    `h-12 bg-transparent border-[rgba(26,155,232,0.35)] text-white placeholder:text-gray-500 focus:border-[#1a7fe8] focus:ring-1 focus:ring-[#1a7fe8] transition-all pl-11 rounded-lg ${
      hasError ? "border-red-500 focus:ring-red-500" : ""
    }`;

  return (
    <div className="flex h-screen w-full bg-[#050c18] font-sans overflow-hidden">
      {/* Painel Esquerdo (60%) */}
      <div className="hidden lg:flex lg:w-[60%] h-full relative flex-col items-center justify-center bg-[#050c18] overflow-hidden">
        {/* Radial Gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(26,155,232,0.08)_0%,_transparent_70%)]" />
        
        {/* Logo Centralizada */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center animate-fade-up">
          <img
            src="/nexo-logo.png"
            alt="NEXO Logo"
            className="w-[400px] h-auto object-contain animate-logo-glow"
          />
        </div>

        {/* Ondas Animadas */}
        <div className="absolute bottom-0 left-0 w-full h-[35%] overflow-hidden">
          <CanvasWaves />
        </div>
      </div>

      {/* Painel Direito (40%) */}
      <div className="w-full lg:w-[40%] h-full bg-[#0c1526] flex flex-col justify-center p-[56px_44px] relative border-l border-white/5 animate-fade-up">
        <div className="flex flex-col w-full">
          <div className="mb-10">
            <h1 className="text-[26px] font-bold text-white mb-2 leading-tight">
              Bem-vindo de volta!
            </h1>
            <p className="text-gray-400 text-sm">
              Acesse sua conta para continuar gerenciando sua rede.
            </p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm font-medium">E-mail</Label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-[#1a7fe8] transition-colors" />
                <Input
                  type="email"
                  placeholder="exemplo@nexo.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if(errors.email) setErrors({...errors, email: undefined}); }}
                  className={inputClass(errors.email)}
                />
              </div>
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-gray-300 text-sm font-medium">Senha</Label>
                <button type="button" className="text-xs text-[#1a7fe8] hover:underline transition-all">
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-[#1a7fe8] transition-colors" />
                <Input
                  type={showPwd ? "text" : "password"}
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if(errors.password) setErrors({...errors, password: undefined}); }}
                  className={inputClass(errors.password)}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  {showPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 bg-gradient-to-r from-[#1a7fe8] to-[#22c97a] hover:opacity-90 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 group"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Entrar na conta
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-700/50"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#0c1526] px-4 text-gray-500 font-medium tracking-wider">ou</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            className="w-full h-12 border-gray-700/50 bg-transparent hover:bg-gray-800/30 text-gray-300 rounded-lg flex items-center justify-center gap-3 transition-all"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Entrar com Google
          </Button>
        </div>

        <div className="text-center absolute bottom-8 left-0 w-full">
          <p className="text-gray-500 text-[10px] tracking-wide uppercase">
            © 2024 NEXO. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
