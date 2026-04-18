import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plug, RefreshCw, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

type IntegracaoConfig = {
  empresa?: string;
  usuario?: string;
  senha?: string;
  auto_sync?: boolean;
};

type IntegracaoRow = {
  id: string;
  loja_id: string;
  tipo: string;
  config: IntegracaoConfig;
  ativo: boolean;
  ultima_sincronizacao: string | null;
};

const credSchema = z.object({
  empresa: z.string().trim().min(1, "Empresa obrigatória").max(120),
  usuario: z.string().trim().min(1, "Usuário obrigatório").max(120),
  senha: z.string().max(200),
});

function formatDate(iso: string | null) {
  if (!iso) return "Nunca";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function Integracoes() {
  const { perfil } = useAuth();
  const lojaId = perfil?.loja_id ?? null;
  const qc = useQueryClient();

  const [empresa, setEmpresa] = useState("");
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [autoSync, setAutoSync] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const { data: integracao } = useQuery({
    queryKey: ["integracao-promob", lojaId],
    enabled: !!lojaId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("integracoes")
        .select("id, loja_id, tipo, config, ativo, ultima_sincronizacao")
        .eq("loja_id", lojaId)
        .eq("tipo", "promob")
        .maybeSingle();
      if (error) throw error;
      return (data as IntegracaoRow | null) ?? null;
    },
  });

  useEffect(() => {
    if (integracao) {
      setEmpresa(integracao.config?.empresa ?? "");
      setUsuario(integracao.config?.usuario ?? "");
      setSenha(""); // nunca exibir senha salva
      setAutoSync(integracao.config?.auto_sync ?? false);
    }
  }, [integracao]);

  const senhaSalva = !!integracao?.config?.senha;
  const conectado = !!(
    integracao?.config?.empresa &&
    integracao?.config?.usuario &&
    integracao?.config?.senha
  );

  const salvar = async () => {
    if (!lojaId) {
      toast.error("Loja não identificada");
      return;
    }
    const parsed = credSchema.safeParse({ empresa, usuario, senha });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Dados inválidos");
      return;
    }
    // Se senha em branco e não há senha salva, exigir
    if (!parsed.data.senha && !senhaSalva) {
      toast.error("Senha obrigatória");
      return;
    }
    setSaving(true);
    try {
      const config: IntegracaoConfig = {
        empresa: parsed.data.empresa,
        usuario: parsed.data.usuario,
        // mantém senha anterior se usuário deixou em branco
        senha: parsed.data.senha || integracao?.config?.senha || "",
        auto_sync: autoSync,
      };
      const { error } = await (supabase as any)
        .from("integracoes")
        .upsert(
          { loja_id: lojaId, tipo: "promob", config, ativo: true },
          { onConflict: "loja_id,tipo" },
        );
      if (error) throw error;
      toast.success("Credenciais salvas");
      setSenha(""); // limpa campo após salvar
      qc.invalidateQueries({ queryKey: ["integracao-promob", lojaId] });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const toggleAutoSync = async (value: boolean) => {
    setAutoSync(value);
    if (!lojaId || !integracao) return;
    const config: IntegracaoConfig = { ...(integracao.config ?? {}), auto_sync: value };
    const { error } = await (supabase as any)
      .from("integracoes")
      .update({ config })
      .eq("id", integracao.id);
    if (error) {
      toast.error("Erro ao atualizar preferência");
      setAutoSync(!value);
    } else {
      qc.invalidateQueries({ queryKey: ["integracao-promob", lojaId] });
    }
  };

  const sincronizar = async () => {
    if (!lojaId) return;
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-promob", {
        body: { loja_id: lojaId },
      });
      if (error) throw error;
      const payload = data as { ok?: boolean; atualizados?: number; erro?: string };
      if (payload?.ok) {
        toast.success(
          `${payload.atualizados ?? 0} contratos atualizados com previsão do Promob ✓`,
        );
        qc.invalidateQueries({ queryKey: ["integracao-promob", lojaId] });
      } else if (payload?.erro?.toLowerCase().includes("login")) {
        toast.error("Login falhou — verifique usuário e senha");
      } else {
        toast.warning("Não foi possível ler o portal — tente novamente");
      }
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (msg.toLowerCase().includes("login") || msg.includes("401")) {
        toast.error("Login falhou — verifique usuário e senha");
      } else {
        toast.warning("Não foi possível ler o portal — tente novamente");
      }
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Integrações</h1>
        <p className="text-sm text-muted-foreground">
          Conecte serviços externos para automatizar sincronizações.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-primary/10 p-2">
              <Plug className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base">Promob</CardTitle>
          </div>
          {conectado ? (
            <Badge className="bg-[#D1FAE5] text-[#05873C] hover:bg-[#D1FAE5]">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Conectado
            </Badge>
          ) : (
            <Badge variant="outline">Não conectado</Badge>
          )}
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="empresa">Empresa *</Label>
              <Input
                id="empresa"
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                placeholder="Nome da empresa no portal Promob"
                autoComplete="off"
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="usuario">Nome de usuário *</Label>
              <Input
                id="usuario"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Seu usuário do portal Promob"
                autoComplete="off"
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="senha">Senha *</Label>
              <Input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Sua senha"
                autoComplete="new-password"
                maxLength={200}
              />
              {senhaSalva && (
                <p className="text-xs text-muted-foreground">
                  Senha já configurada — deixe em branco para manter
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={salvar} disabled={saving} variant="outline">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar credenciais
            </Button>

            <Button
              onClick={sincronizar}
              disabled={!conectado || syncing}
              className="bg-[#1E6FBF] text-white hover:bg-[#1858a0]"
            >
              {syncing
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <RefreshCw className="mr-2 h-4 w-4" />}
              Sincronizar agora
            </Button>
          </div>

          {conectado && (
            <p className="text-xs text-muted-foreground">
              Última sincronização:{" "}
              <span className="font-medium">
                {formatDate(integracao?.ultima_sincronizacao ?? null)}
              </span>
            </p>
          )}

          <div className="flex items-start justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="auto-sync" className="text-sm">
                Sincronização automática diária
              </Label>
              {autoSync && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Sincroniza todos os dias às 08:00
                </p>
              )}
            </div>
            <Switch
              id="auto-sync"
              checked={autoSync}
              onCheckedChange={toggleAutoSync}
              disabled={!conectado}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
