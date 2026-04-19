import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LogoNexo } from "@/components/LogoNexo";
import { toast } from "sonner";

export default function PortalEntrada() {
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = codigo.trim();
    if (clean.length !== 6) {
      toast.error("Digite um código de 6 dígitos");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("portal_validar_codigo" as any, {
        _codigo: clean,
      });
      if (error) throw error;
      const r = data as { ok: boolean; token?: string; erro?: string };
      if (!r?.ok || !r.token) {
        toast.error(r?.erro ?? "Código inválido");
        return;
      }
      navigate(`/portal/${r.token}`);
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao validar código");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#F5F7FA" }}
    >
      <div
        className="w-full flex justify-center py-8"
        style={{ backgroundColor: "#0D1117" }}
      >
        <LogoNexo size="lg" />
      </div>

      <main className="flex-1 flex items-center justify-center px-6">
        <div
          className="bg-white rounded-xl shadow-sm p-8 w-full"
          style={{ maxWidth: 400, border: "0.5px solid #E8ECF2" }}
        >
          <h1
            className="text-center"
            style={{ fontSize: 20, fontWeight: 500, color: "#0D1117" }}
          >
            Portal do Cliente
          </h1>
          <p
            className="text-center mt-2"
            style={{ fontSize: 14, color: "#6B7A90" }}
          >
            Digite o código de 6 dígitos enviado pela loja
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={codigo}
              onChange={(e) =>
                setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="000000"
              className="w-full text-center rounded-md outline-none focus:ring-2"
              style={{
                fontSize: 28,
                letterSpacing: 8,
                fontWeight: 500,
                padding: "16px 12px",
                border: "1px solid #E8ECF2",
                backgroundColor: "#F5F7FA",
                color: "#0D1117",
              }}
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || codigo.length !== 6}
              className="w-full rounded-md transition-opacity disabled:opacity-50"
              style={{
                backgroundColor: "#1E6FBF",
                color: "#fff",
                fontSize: 14,
                fontWeight: 500,
                padding: "12px 20px",
              }}
            >
              {loading ? "Validando…" : "Entrar"}
            </button>
          </form>
        </div>
      </main>

      <footer
        className="text-center py-6"
        style={{ fontSize: 12, color: "#B0BAC9" }}
      >
        NEXO · Gestão de Planejados
      </footer>
    </div>
  );
}
