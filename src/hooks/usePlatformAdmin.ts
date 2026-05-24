import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function usePlatformAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("platform_user_roles" as any)
        .select("role")
        .eq("user_id", user.id);
      setIsAdmin(Array.isArray(data) && data.length > 0);
      setLoading(false);
    })();
  }, [user, authLoading]);

  return { isAdmin, loading: loading || authLoading };
}
