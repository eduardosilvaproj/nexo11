import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAutomacoes } from "@/hooks/useAutomacoes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Bot, 
  History, 
  Plus, 
  Settings2, 
  Play, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  Trash2,
  MoreVertical
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Automacoes() {
  const { perfil } = useAuth();
  const lojaId = perfil?.loja_id;
  const { regras, execucoes, isLoading, alternarAtivo, excluirRegra } = useAutomacoes(lojaId);
  const [activeTab, setActiveTab] = useState("regras");

  if (!lojaId) return null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            Automações & Régua de Relacionamento
          </h1>
          <p className="text-sm text-muted-foreground">
            Automatize tarefas, comunicações e notificações com base em eventos do sistema.
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Regra
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="regras" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Regras de Automação
          </TabsTrigger>
          <TabsTrigger value="execucoes" className="gap-2">
            <History className="h-4 w-4" />
            Histórico de Execuções
          </TabsTrigger>
        </TabsList>

        <TabsContent value="regras" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {regras.map((regra) => (
              <Card key={regra.id} className={!regra.ativo ? "opacity-70" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <Badge variant={regra.ativo ? "default" : "secondary"}>
                      {regra.ativo ? "Ativa" : "Inativa"}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={regra.ativo} 
                        onCheckedChange={(checked) => alternarAtivo.mutate({ id: regra.id, ativo: checked })}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {}}>Editar</DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => {
                              if(confirm("Deseja realmente excluir esta regra?")) {
                                excluirRegra.mutate(regra.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <CardTitle className="text-lg mt-2">{regra.nome}</CardTitle>
                  <CardDescription>{regra.descricao || "Sem descrição"}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Play className="h-4 w-4 text-primary" />
                      <span className="font-medium">Gatilho:</span>
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{regra.gatilho}</code>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <Settings2 className="h-4 w-4 text-primary mt-0.5" />
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">Ações ({regra.acoes?.length || 0}):</span>
                        <div className="flex flex-wrap gap-1">
                          {(regra.acoes as any[])?.map((acao, i) => (
                            <Badge key={i} variant="outline" className="text-[10px]">
                              {acao.tipo}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    {regra.delay_minutos > 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Atraso de {regra.delay_minutos} min
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {regras.length === 0 && !isLoading && (
              <Card className="col-span-full border-dashed">
                <CardContent className="py-10 flex flex-col items-center justify-center text-center">
                  <div className="bg-muted p-4 rounded-full mb-4">
                    <Bot className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium">Nenhuma regra configurada</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mt-1">
                    Comece automatizando seu pós-venda ou régua de NPS clicando no botão "Nova Regra".
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="execucoes" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Execuções</CardTitle>
              <CardDescription>
                Acompanhe o que o motor de automações processou recentemente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Regra / Gatilho</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {execucoes.map((exec) => (
                    <TableRow key={exec.id}>
                      <TableCell className="text-xs">
                        {format(new Date(exec.created_at!), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            {(exec.automacao_regras as any)?.nome || "Regra excluída"}
                          </span>
                          <span className="text-[10px] text-muted-foreground uppercase">{exec.gatilho}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {exec.entidade_tipo}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {exec.status === "executada" && (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none flex w-fit items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Executada
                          </Badge>
                        )}
                        {exec.status === "falhou" && (
                          <Badge variant="destructive" className="flex w-fit items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> Falhou
                          </Badge>
                        )}
                        {exec.status === "pendente" && (
                          <Badge variant="secondary" className="flex w-fit items-center gap-1">
                            <Clock className="h-3 w-3" /> Pendente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">Detalhes</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {execucoes.length === 0 && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        Nenhuma execução registrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
