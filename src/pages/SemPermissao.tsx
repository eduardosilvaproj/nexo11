import { ShieldAlert, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function SemPermissao() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <div className="mb-6 rounded-full bg-red-100 p-6 text-red-600">
        <ShieldAlert size={48} />
      </div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Acesso Restrito</h1>
      <p className="mb-8 max-w-md text-slate-600">
        Você não tem permissão para acessar esta área. Se você acredita que isso é um erro, entre em contato com o administrador da sua loja.
      </p>
      <div className="flex gap-4">
        <Button asChild variant="outline">
          <Link to="/" className="flex items-center gap-2">
            <Home size={18} />
            Voltar ao Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
