import { useState } from "react";
import { useNotificacoes, Notificacao } from "@/hooks/use-notificacoes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  ExternalLink,
  Check,
  Filter,
  Inbox
} from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function Notificacoes() {
  const { 
    notificacoes, 
    isLoading, 
    marcarComoLida, 
    marcarTodasComoLidas, 
    marcarComoResolvida 
  } = useNotificacoes();
  
  const [filtroModulo, setFiltroModulo] = useState<string>("todos");

  const modulos = ["todos", ...new Set(notificacoes.map(n => n.modulo))];

  const filtrar = (lista: Notificacao[]) => {
    return lista.filter(n => {
      if (filtroModulo !== "todos" && n.modulo !== filtroModulo) return false;
      return true;
    });
  };

  const RenderNotif = ({ n }: { n: Notificacao }) => (
    <div 
      key={n.id}
      className={cn(
        "group relative flex gap-4 p-4 transition-all border-b last:border-0",
        !n.lida ? "bg-blue-50/50" : "bg-white",
        n.resolvida && "opacity-60"
      )}
    >
      <div className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-sm",
        n.prioridade === 'critica' ? "bg-red-50 border-red-100 text-red-600" :
        n.prioridade === 'alta' ? "bg-orange-50 border-orange-100 text-orange-600" :
        "bg-blue-50 border-blue-100 text-blue-600"
      )}>
        {n.prioridade === 'critica' ? <AlertTriangle size={18} /> : 
         n.prioridade === 'alta' ? <AlertTriangle size={18} /> : 
         <Info size={18} />}
      </div>
      
      <div className="flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-900">{n.titulo}</h4>
            <Badge variant="outline" className="text-[10px] uppercase h-5">
              {n.modulo}
            </Badge>
            {!n.lida && (
              <span className="flex h-2 w-2 rounded-full bg-blue-600" />
            )}
          </div>
          <span className="text-[11px] text-slate-500 whitespace-nowrap">
            {new Date(n.created_at).toLocaleString('pt-BR')}
          </span>
        </div>
        
        <p className="text-sm text-slate-600 leading-relaxed">
          {n.mensagem}
        </p>
        
        <div className="flex items-center gap-3 pt-2">
          {n.link && (
            <Button variant="ghost" size="sm" className="h-8 text-xs text-blue-600 hover:text-blue-700 p-0" asChild>
              <Link to={n.link}>
                <ExternalLink size={14} className="mr-1.5" />
                Ver detalhes
              </Link>
            </Button>
          )}
          
          {!n.lida && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-xs text-slate-500 hover:text-slate-700 p-0"
              onClick={() => marcarComoLida.mutate(n.id)}
            >
              <Check size={14} className="mr-1.5" />
              Marcar como lida
            </Button>
          )}

          {!n.resolvida && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-xs text-green-600 hover:text-green-700 p-0 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => marcarComoResolvida.mutate(n.id)}
            >
              <CheckCircle2 size={14} className="mr-1.5" />
              Resolver
            </Button>
          )}
          
          {n.resolvida && (
            <Badge variant="success" className="h-5 text-[10px] ml-auto">
              <Check size={10} className="mr-1" /> Resolvida
            </Badge>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Central de Notificações</h1>
          <p className="text-sm text-slate-500">Gerencie seus avisos e alertas do sistema.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => marcarTodasComoLidas.mutate()}
            disabled={notificacoes.filter(n => !n.lida).length === 0}
          >
            Marcar todas como lidas
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 pb-2 overflow-x-auto no-scrollbar">
        <Filter size={14} className="text-slate-400 shrink-0" />
        {modulos.map(m => (
          <Button
            key={m}
            variant={filtroModulo === m ? "default" : "outline"}
            size="sm"
            className="capitalize h-8 text-xs whitespace-nowrap"
            onClick={() => setFiltroModulo(m)}
          >
            {m}
          </Button>
        ))}
      </div>

      <Tabs defaultValue="todas" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-md">
          <TabsTrigger value="todas">Todas</TabsTrigger>
          <TabsTrigger value="nao-lidas">Não lidas</TabsTrigger>
          <TabsTrigger value="criticas">Críticas</TabsTrigger>
          <TabsTrigger value="resolvidas">Resolvidas</TabsTrigger>
        </TabsList>

        {isLoading ? (
          <div className="mt-6 space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardContent className="p-4 flex gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <TabsContent value="todas" className="mt-6">
              <Card>
                <CardContent className="p-0">
                  {filtrar(notificacoes).length === 0 ? (
                    <EmptyState />
                  ) : (
                    filtrar(notificacoes).map(n => <RenderNotif key={n.id} n={n} />)
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="nao-lidas" className="mt-6">
              <Card>
                <CardContent className="p-0">
                  {filtrar(notificacoes.filter(n => !n.lida)).length === 0 ? (
                    <EmptyState />
                  ) : (
                    filtrar(notificacoes.filter(n => !n.lida)).map(n => <RenderNotif key={n.id} n={n} />)
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="criticas" className="mt-6">
              <Card>
                <CardContent className="p-0">
                  {filtrar(notificacoes.filter(n => n.prioridade === 'critica')).length === 0 ? (
                    <EmptyState />
                  ) : (
                    filtrar(notificacoes.filter(n => n.prioridade === 'critica')).map(n => <RenderNotif key={n.id} n={n} />)
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="resolvidas" className="mt-6">
              <Card>
                <CardContent className="p-0">
                  {filtrar(notificacoes.filter(n => n.resolvida)).length === 0 ? (
                    <EmptyState />
                  ) : (
                    filtrar(notificacoes.filter(n => n.resolvida)).map(n => <RenderNotif key={n.id} n={n} />)
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-300">
        <Inbox size={32} />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-900">Nenhuma notificação</h3>
      <p className="mt-1 text-sm text-slate-500">Tudo limpo por aqui! Você não tem notificações neste filtro.</p>
    </div>
  );
}
