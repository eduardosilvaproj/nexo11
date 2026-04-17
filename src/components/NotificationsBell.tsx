import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

interface Notif {
  id: string;
  mensagem: string;
  link: string | null;
  lida_em: string | null;
  created_at: string;
}

export function NotificationsBell() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: notifs = [] } = useQuery({
    queryKey: ["notificacoes", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Notif[]> => {
      const { data, error } = await supabase
        .from("notificacoes")
        .select("id, mensagem, link, lida_em, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const naoLidas = notifs.filter((n) => !n.lida_em).length;

  // Realtime: nova notificação -> invalida lista + toast
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`user:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notificacoes",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as Notif;
          toast(n.mensagem);
          qc.invalidateQueries({ queryKey: ["notificacoes", user.id] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);

  const marcarLida = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notificacoes")
        .update({ lida_em: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notificacoes", user?.id] }),
  });

  const marcarTodas = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notificacoes")
        .update({ lida_em: new Date().toISOString() })
        .is("lida_em", null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notificacoes", user?.id] }),
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-[#6B7A90] hover:text-[#1E6FBF]"
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" />
          {naoLidas > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white"
              style={{ backgroundColor: "#E5484D" }}
            >
              {naoLidas > 9 ? "9+" : naoLidas}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">Notificações</span>
          {naoLidas > 0 && (
            <button
              onClick={() => marcarTodas.mutate()}
              className="text-xs text-[#1E6FBF] hover:underline"
            >
              Marcar todas como lidas
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifs.length === 0 && (
            <div className="p-6 text-center text-sm text-[#6B7A90]">
              Nenhuma notificação
            </div>
          )}
          {notifs.map((n) => (
            <Link
              key={n.id}
              to={n.link ?? "#"}
              onClick={() => !n.lida_em && marcarLida.mutate(n.id)}
              className="block border-b px-3 py-2.5 last:border-0 hover:bg-[#F5F7FA]"
              style={{ backgroundColor: !n.lida_em ? "#EFF6FF" : undefined }}
            >
              <p className="text-sm text-[#0D1117]">{n.mensagem}</p>
              <p className="mt-0.5 text-[11px] text-[#6B7A90]">
                {new Date(n.created_at).toLocaleString("pt-BR")}
              </p>
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
