import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User, Eye, EyeOff, ArrowLeft, CheckCircle2 } from "lucide-react";
import { z } from "zod";
// Removed local import as we're using /nexo-logo.png from public folder

const emailSchema = z.string().trim().email("E-mail inválido").max(255);
const passwordSchema = z.string().min(6, "Mínimo 6 caracteres").max(72);
const nomeSchema = z.string().trim().min(2, "Nome muito curto").max(100);

type View = "auth" | "forgot";

export default function AuthPage() {
  const { user, loading, signIn, signUp } = useAuth();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState<View>("auth");
  const [showPwd, setShowPwd] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; nome?: string }>({});

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0D1117]">
        <Loader2 className="h-6 w-6 animate-spin text-[#00AAFF]" />
      </div>
    );
  }

  if (user) {
    const from = (location.state as any)?.from?.pathname || "/";
    return <Navigate to={from} replace />;
  }

  const validate = (mode: "signin" | "signup") => {
    const errs: typeof errors = {};
    const e = emailSchema.safeParse(email);
    if (!e.success) errs.email = e.error.issues[0].message;
    const p = passwordSchema.safeParse(password);
    if (!p.success) errs.password = p.error.issues[0].message;
    if (mode === "signup") {
      const n = nomeSchema.safeParse(nome);
      if (!n.success) errs.nome = n.error.issues[0].message;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate("signin")) return;
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) toast.error(error);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate("signup")) return;
    setSubmitting(true);
    const { error } = await signUp(email, password, nome);
    setSubmitting(false);
    if (error) toast.error(error);
    else toast.success("Conta criada! Você já pode entrar.");
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setErrors({ email: parsed.error.issues[0].message });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (error) toast.error(error.message);
    else {
      toast.success("E-mail de recuperação enviado!");
      setView("auth");
    }
  };

  const fieldClass = (hasError?: string) =>
    `pl-10 h-11 bg-[#1A2332] border-[#2A3F5F] text-white placeholder:text-[#6B7A90] focus-visible:ring-[#00AAFF] focus-visible:border-[#00AAFF] transition-colors ${
      hasError ? "border-[#E53935] focus-visible:ring-[#E53935]" : ""
    }`;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0D1117]">
      {/* Ambient gradient glow */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-[#00AAFF] opacity-10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-[#12B76A] opacity-10 blur-[120px]" />

      <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center">
            <img
              src="/nexo-logo.png"
              alt="NEXO"
              className="h-24 w-auto object-contain drop-shadow-[0_0_30px_rgba(0,170,255,0.25)]"
            />
            <p className="mt-3 text-center text-xs uppercase tracking-[0.2em] text-[#6B7A90]">
              Gestão que conecta · Resultado que multiplica
            </p>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-[#2A3F5F]/60 bg-[#1A2332]/70 p-8 shadow-2xl backdrop-blur-xl">
            {view === "forgot" ? (
              <form onSubmit={handleForgot} className="space-y-5 animate-in fade-in duration-300">
                <div>
                  <button
                    type="button"
                    onClick={() => setView("auth")}
                    className="mb-4 inline-flex items-center gap-1 text-xs text-[#6B7A90] transition-colors hover:text-[#00AAFF]"
                  >
                    <ArrowLeft className="h-3 w-3" /> Voltar
                  </button>
                  <h2 className="text-xl font-semibold text-white">Recuperar senha</h2>
                  <p className="mt-1 text-sm text-[#6B7A90]">
                    Enviaremos um link para você redefinir sua senha.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email-fp" className="text-xs text-[#B0BAC9]">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7A90]" />
                    <Input
                      id="email-fp"
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setErrors({}); }}
                      className={fieldClass(errors.email)}
                      placeholder="seu@email.com"
                    />
                  </div>
                  {errors.email && <p className="text-xs text-[#E53935]">{errors.email}</p>}
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-11 w-full bg-gradient-to-r from-[#00AAFF] via-[#1E6FBF] to-[#12B76A] font-semibold text-white shadow-lg shadow-[#00AAFF]/20 transition-all hover:shadow-[#00AAFF]/40 hover:brightness-110"
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar link de recuperação
                </Button>
              </form>
            ) : (
              <Tabs defaultValue="signin" onValueChange={() => setErrors({})}>
                <TabsList className="grid w-full grid-cols-2 bg-[#0D1117] p-1">
                  <TabsTrigger
                    value="signin"
                    className="data-[state=active]:bg-[#1A2332] data-[state=active]:text-white data-[state=active]:shadow-sm text-[#6B7A90]"
                  >
                    Entrar
                  </TabsTrigger>
                  <TabsTrigger
                    value="signup"
                    className="data-[state=active]:bg-[#1A2332] data-[state=active]:text-white data-[state=active]:shadow-sm text-[#6B7A90]"
                  >
                    Criar conta
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="animate-in fade-in duration-300">
                  <form onSubmit={handleSignIn} className="space-y-4 pt-5">
                    <div className="space-y-1.5">
                      <Label htmlFor="email-in" className="text-xs text-[#B0BAC9]">E-mail</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7A90]" />
                        <Input
                          id="email-in"
                          type="email"
                          value={email}
                          onChange={(e) => { setEmail(e.target.value); setErrors({}); }}
                          className={fieldClass(errors.email)}
                          placeholder="seu@email.com"
                        />
                        {email && !errors.email && emailSchema.safeParse(email).success && (
                          <CheckCircle2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#12B76A]" />
                        )}
                      </div>
                      {errors.email && <p className="text-xs text-[#E53935]">{errors.email}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="pass-in" className="text-xs text-[#B0BAC9]">Senha</Label>
                        <button
                          type="button"
                          onClick={() => { setView("forgot"); setErrors({}); }}
                          className="text-xs text-[#00AAFF] transition-colors hover:text-[#1E6FBF]"
                        >
                          Esqueci minha senha
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7A90]" />
                        <Input
                          id="pass-in"
                          type={showPwd ? "text" : "password"}
                          value={password}
                          onChange={(e) => { setPassword(e.target.value); setErrors({}); }}
                          className={`${fieldClass(errors.password)} pr-10`}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPwd((s) => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7A90] transition-colors hover:text-[#B0BAC9]"
                        >
                          {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.password && <p className="text-xs text-[#E53935]">{errors.password}</p>}
                    </div>

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="h-11 w-full bg-gradient-to-r from-[#00AAFF] via-[#1E6FBF] to-[#12B76A] font-semibold text-white shadow-lg shadow-[#00AAFF]/20 transition-all hover:shadow-[#00AAFF]/40 hover:brightness-110"
                    >
                      {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Entrar
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="animate-in fade-in duration-300">
                  <form onSubmit={handleSignUp} className="space-y-4 pt-5">
                    <div className="space-y-1.5">
                      <Label htmlFor="nome-up" className="text-xs text-[#B0BAC9]">Nome</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7A90]" />
                        <Input
                          id="nome-up"
                          value={nome}
                          onChange={(e) => { setNome(e.target.value); setErrors({}); }}
                          className={fieldClass(errors.nome)}
                          placeholder="Seu nome completo"
                        />
                      </div>
                      {errors.nome && <p className="text-xs text-[#E53935]">{errors.nome}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="email-up" className="text-xs text-[#B0BAC9]">E-mail</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7A90]" />
                        <Input
                          id="email-up"
                          type="email"
                          value={email}
                          onChange={(e) => { setEmail(e.target.value); setErrors({}); }}
                          className={fieldClass(errors.email)}
                          placeholder="seu@email.com"
                        />
                      </div>
                      {errors.email && <p className="text-xs text-[#E53935]">{errors.email}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="pass-up" className="text-xs text-[#B0BAC9]">Senha</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7A90]" />
                        <Input
                          id="pass-up"
                          type={showPwd ? "text" : "password"}
                          value={password}
                          onChange={(e) => { setPassword(e.target.value); setErrors({}); }}
                          className={`${fieldClass(errors.password)} pr-10`}
                          placeholder="Mínimo 6 caracteres"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPwd((s) => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7A90] transition-colors hover:text-[#B0BAC9]"
                        >
                          {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.password && <p className="text-xs text-[#E53935]">{errors.password}</p>}
                    </div>

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="h-11 w-full bg-gradient-to-r from-[#00AAFF] via-[#1E6FBF] to-[#12B76A] font-semibold text-white shadow-lg shadow-[#00AAFF]/20 transition-all hover:shadow-[#00AAFF]/40 hover:brightness-110"
                    >
                      {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Criar conta
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-[#6B7A90]">
            © {new Date().getFullYear()} NEXO · ERP para redes de móveis planejados
          </p>
        </div>
      </div>
    </div>
  );
}
