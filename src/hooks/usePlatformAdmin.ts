import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PlatformRole = 'platform_admin' | 'platform_support';

export function usePlatformAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<PlatformRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const { data, error } = await supabase
          .from("platform_user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Erro ao carregar role de plataforma:", error);
          setRole(null);
        } else {
          setRole(data?.role as PlatformRole || null);
        }
      } catch (e) {
        console.error("Erro inesperado usePlatformAdmin:", e);
        setRole(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, authLoading]);

  const isAdmin = role === 'platform_admin';
  const isSupport = role === 'platform_support' || role === 'platform_admin';

  return { 
    role, 
    isAdmin, 
    isSupport,
    loading: loading || authLoading 
  };
}
