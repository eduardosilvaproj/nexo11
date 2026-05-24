import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Bell, Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { useNotificacoes } from "@/hooks/use-notificacoes";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export function NotificationsBell() {
  const { user } = useAuth();
  const { notificacoes, naoLidas, marcarComoLida, marcarTodasComoLidas } = useNotificacoes();
  const qc = useQueryClient();

  // Realtime: nova notificação -> invalida lista + toast
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`user:${user.id}-notifs`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notificacoes",
          // Filter depends on the RLS but we can try to filter by user or profile here too for efficiency
        },
        (payload) => {
          // Verify if it belongs to this user or their profiles
          const n = payload.new as any;
          if (n.usuario_id === user.id || !n.usuario_id) {
            toast(n.mensagem, {
              description: n.titulo,
              action: n.link ? {
                label: "Ver",
                onClick: () => window.location.href = n.link
              } : undefined
            });
            qc.invalidateQueries({ queryKey: ["notificacoes"] });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-slate-500 hover:text-blue-600 transition-colors"
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" />
          {naoLidas > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white shadow-sm animate-in zoom-in"
              style={{ backgroundColor: "#E5484D" }}
            >
              {naoLidas > 9 ? "9+" : naoLidas}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 shadow-xl border-slate-200">
        <div className="flex items-center justify-between border-b px-4 py-3 bg-slate-50/50">
          <span className="text-sm font-semibold text-slate-900">Notificações</span>
          {naoLidas > 0 && (
            <button
              onClick={() => marcarTodasComoLidas.mutate()}
              className="text-[11px] font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
            >
              Limpar todas
            </button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto overscroll-contain">
          {notificacoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                <Inbox size={24} />
              </div>
              <p className="mt-2 text-xs text-slate-500">Nenhuma notificação por aqui.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notificacoes.slice(0, 10).map((n) => (
                <Link
                  key={n.id}
                  to={n.link ?? "/notificacoes"}
                  onClick={() => !n.lida && marcarComoLida.mutate(n.id)}
                  className={cn(
                    "block px-4 py-3 transition-colors hover:bg-slate-50",
                    !n.lida ? "bg-blue-50/40" : "bg-white"
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[11px] font-bold text-blue-600 uppercase tracking-tight">
                      {n.titulo || n.modulo}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(n.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 line-clamp-2 leading-snug">{n.mensagem}</p>
                  <div className="mt-2 flex items-center justify-between">
                     <span className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded font-bold uppercase",
                        n.prioridade === 'critica' ? "bg-red-100 text-red-700" :
                        n.prioridade === 'alta' ? "bg-orange-100 text-orange-700" :
                        "bg-blue-100 text-blue-700"
                      )}>
                        {n.prioridade}
                      </span>
                      {!n.lida && <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="border-t p-2 text-center bg-slate-50/50">
          <Link to="/notificacoes" className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
            Ver todas as notificações
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
