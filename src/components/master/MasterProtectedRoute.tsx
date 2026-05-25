import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { useAuth } from "@/contexts/AuthContext";

export function MasterProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, roles, loading: authLoading } = useAuth();
  const { isAdmin, isSupport, loading } = usePlatformAdmin();
  const hasMasterRole = roles.includes("admin_master") || roles.includes("admin");

  if (authLoading || loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin && !isSupport && !hasMasterRole) return <Navigate to="/sem-permissao" replace />;

  return <>{children}</>;
}
