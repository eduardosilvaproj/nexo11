import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  const { perfil, roles } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Olá, {perfil?.nome ?? "Bem-vindo"} 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          {perfil?.loja_id
            ? "Visão geral da sua loja."
            : "Você ainda não está vinculado a uma loja. Peça ao admin para te associar."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contratos ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">—</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Margem média</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">—</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Seu papel</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium capitalize">
              {roles.length ? roles.join(", ") : "sem papel atribuído"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
