import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type AppRole = Database["public"]["Enums"]["app_role"];

interface Props {
  children: React.ReactNode;
  roles?: AppRole[]; // se vazio, basta estar autenticado
  redirectTo?: string; // se setado, redireciona em vez de mostrar "acesso negado"
  redirectMessage?: string;
}

export function ProtectedRoute({ children, roles, redirectTo, redirectMessage }: Props) {
  const { user, roles: userRoles, loading } = useAuth();
  const location = useLocation();

  const denied =
    !loading && user && roles && roles.length > 0 && !roles.some((r) => userRoles.includes(r));

  useEffect(() => {
    if (denied && redirectTo) {
      toast.error(redirectMessage ?? "Acesso restrito");
    }
  }, [denied, redirectTo, redirectMessage]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (denied) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-12 text-center">
        <h2 className="text-xl font-semibold">Acesso negado</h2>
        <p className="text-sm text-muted-foreground">
          Seu papel atual não tem permissão para acessar esta área.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

