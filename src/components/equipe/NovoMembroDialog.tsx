import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { Eye, EyeOff, Loader2, Mail, UserPlus, Link2 } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const FUNCOES_DISPONIVEIS = [
  { value: "vendedor", label: "Vendedor" },
  { value: "projetista", label: "Projetista" },
  { value: "tecnico", label: "Técnico / Medidor" },
  { value: "conferente", label: "Conferente" },
  { value: "montador", label: "Montador" },
  { value: "motorista", label: "Motorista / Entregador" },
  { value: "gerente", label: "Gerente" },
  { value: "financeiro", label: "Financeiro" },
  { value: "comprador", label: "Comprador" },
  { value: "almoxarife", label: "Almoxarife" },
  { value: "logistico", label: "Logístico" },
  { value: "pos_venda", label: "Pós-venda" },
  { value: "admin", label: "Administrador" },
] as const;

export type FuncaoUsuario = typeof FUNCOES_DISPONIVEIS[number]["value"];

const NONE = "__none__";

const schema = z.object({
  nome: z.string().trim().min(1, "Nome obrigatório").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  modo: z.enum(["senha", "convite"]),
  senha: z.string().optional(),
  confirmaSenha: z.string().optional(),
  funcoes: z.array(z.string()).min(1, "Selecione ao menos uma função"),
  funcoes_app_habilitadas: z.array(z.string()),
  equipe_id: z.string().uuid().optional().nullable(),
  papel_comissao_id: z.string().uuid().optional().nullable(),
  comissao_percentual: z.number().min(0).max(100).optional().nullable(),
}).refine(d => {
  if (d.modo === "senha") {
    if (!d.senha || d.senha.length < 6) return false;
    if (d.senha !== d.confirmaSenha) return false;
  }
  return true;
}, {
  message: "Senha obrigatória (mín. 6 chars) e devem coincidir",
  path: ["senha"],
});

export function NovoMembroDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [modo, setModo] = useState<"senha" | "convite">("convite");
  const [senha, setSenha] = useState("");
  const [confirmaSenha, setConfirmaSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [funcoes, setFuncoes] = useState<FuncaoUsuario[]>(["vendedor"]);
  const [funcoesApp, setFuncoesApp] = useState<FuncaoUsuario[]>([]);
  const [equipeId, setEquipeId] = useState<string>("");
  const [papelId, setPapelId] = useState<string>(NONE);
  const [comissaoPct, setComissaoPct] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const { data: equipes } = useQuery({
    queryKey: ["equipes-ativas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipes")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  const { data: papeis } = useQuery({
    queryKey: ["papeis-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("papeis_comissao")
        .select("id, nome, percentual_padrao")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  useEffect(() => {
    if (papelId === NONE) return;
    const p = papeis?.find((x) => x.id === papelId);
    if (p) setComissaoPct(String(Number(p.percentual_padrao ?? 0)));
  }, [papelId, papeis]);

  function reset() {
    setNome(""); setEmail(""); setModo("convite");
    setSenha(""); setConfirmaSenha("");
    setFuncoes(["vendedor"]); setFuncoesApp([]);
    setEquipeId(""); setPapelId(NONE); setComissaoPct("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pctNum = comissaoPct.trim() === "" ? null : Number(comissaoPct.replace(",", "."));

    // Extrair role principal (primeira) e funções extras
    const rolePrincipal = funcoes[0] as FuncaoUsuario;
    const funcoesExtras = funcoes.slice(1).map(f => f as FuncaoUsuario);

    const parsed = schema.safeParse({
      nome, email, modo, senha, confirmaSenha,
      funcoes, funcoes_app_habilitadas: funcoesApp,
      equipe_id: funcoes.includes("montador") && equipeId ? equipeId : null,
      papel_comissao_id: papelId === NONE ? null : papelId,
      comissao_percentual: pctNum,
    });
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      toast.error(first ?? "Verifique os campos");
      return;
    }
    setSubmitting(true);
    try {
      const { error, data } = await supabase.functions.invoke("equipe-create-member", {
        body: {
          nome: parsed.data.nome,
          email: parsed.data.email,
          modo: parsed.data.modo,
          senha: modo === "senha" ? parsed.data.senha : undefined,
          role: rolePrincipal,
          funcoes: funcoesExtras,
          funcoes_app_habilitadas: funcoesApp.length > 0 ? funcoesApp : [],
          equipe_id: parsed.data.equipe_id,
          papel_comissao_id: parsed.data.papel_comissao_id,
          comissao_percentual: parsed.data.comissao_percentual,
        },
      });
      if (error) throw error;
      const msg = (data as any)?.mensagem ?? "Usuário criado com sucesso!";
      toast.success(msg);
      qc.invalidateQueries({ queryKey: ["equipe-membros"] });
      reset();
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao criar usuário";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!submitting) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle style={{ fontSize: 16, fontWeight: 600, color: "#0D1117" }}>
            Novo membro
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Nome e Email */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nome" style={{ fontSize: 12, color: "#0D1117" }}>Nome completo *</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={120} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" style={{ fontSize: 12, color: "#0D1117" }}>E-mail *</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} />
            <p style={{ fontSize: 11, color: "#6B7A90" }}>Usado para login e para enviar o convite</p>
          </div>

          {/* Modo de criação */}
          <div className="flex flex-col gap-1.5">
            <Label style={{ fontSize: 12, color: "#0D1117" }}>Como criar o acesso?</Label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setModo("convite")}
                className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                  modo === "convite"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                <Mail className="h-4 w-4" />
                <span>Enviar convite por e-mail</span>
                <span className="ml-auto text-[10px] opacity-70">Recomendado</span>
              </button>
              <button
                type="button"
                onClick={() => setModo("senha")}
                className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                  modo === "senha"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                <UserPlus className="h-4 w-4" />
                <span>Criar com senha direta</span>
              </button>
            </div>
          </div>

          {/* Senha — só aparece se modo === senha */}
          {modo === "senha" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="senha" style={{ fontSize: 12, color: "#0D1117" }}>Senha *</Label>
                <div className="relative">
                  <Input
                    id="senha"
                    type={showSenha ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                    minLength={6}
                    maxLength={72}
                    className="pr-9"
                    placeholder="Mín. 6 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenha(!showSenha)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirmaSenha" style={{ fontSize: 12, color: "#0D1117" }}>Confirmar senha *</Label>
                <Input
                  id="confirmaSenha"
                  type={showSenha ? "text" : "password"}
                  value={confirmaSenha}
                  onChange={(e) => setConfirmaSenha(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Repita a senha"
                />
              </div>
            </div>
          )}

          {/* Info convite */}
          {modo === "convite" && (
            <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 p-3">
              <Link2 className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700">
                O membro receberá um link por e-mail para definir sua própria senha.
                Use esta opção para que cada um defina sua senha com segurança.
              </p>
            </div>
          )}

          {/* Funções */}
          <div className="flex flex-col gap-2.5">
            <Label style={{ fontSize: 12, color: "#0D1117" }}>Funções no sistema *</Label>
            <p className="text-[11px] text-muted-foreground">A primeira função é a principal. Funções extras são adicionadas ao perfil.</p>
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-neutral-200 p-3">
              {FUNCOES_DISPONIVEIS.map((f, idx) => (
                <div key={f.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`funcao-${f.value}`}
                    checked={funcoes.includes(f.value)}
                    onCheckedChange={(checked) => {
                      if (checked) setFuncoes([...funcoes, f.value]);
                      else setFuncoes(funcoes.filter(x => x !== f.value));
                    }}
                  />
                  <Label htmlFor={`funcao-${f.value}`} className="text-xs font-normal cursor-pointer">
                    {f.label}
                    {idx === 0 && <span className="ml-1 text-[10px] text-muted-foreground">(principal)</span>}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* App Mobile */}
          <div className="flex flex-col gap-2.5">
            <Label style={{ fontSize: 12, color: "#0D1117" }}>Módulos no App Mobile</Label>
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-neutral-200 p-3 bg-neutral-50/50">
              {FUNCOES_DISPONIVEIS.filter(f =>
                ["tecnico", "montador", "motorista", "gerente", "vendedor"].includes(f.value)
              ).map((f) => (
                <div key={`app-${f.value}`} className="flex items-center gap-2">
                  <Checkbox
                    id={`app-${f.value}`}
                    checked={funcoesApp.includes(f.value)}
                    onCheckedChange={(checked) => {
                      if (checked) setFuncoesApp([...funcoesApp, f.value]);
                      else setFuncoesApp(funcoesApp.filter(x => x !== f.value));
                    }}
                  />
                  <Label htmlFor={`app-${f.value}`} className="text-xs font-normal cursor-pointer">
                    {f.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Comissão */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label style={{ fontSize: 12, color: "#0D1117" }}>Papel de comissão</Label>
              <Select value={papelId} onValueChange={setPapelId}>
                <SelectTrigger><SelectValue placeholder="Sem comissão" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sem comissão</SelectItem>
                  {papeis?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label style={{ fontSize: 12, color: "#0D1117" }}>% Comissão</Label>
              <Input
                type="number"
                step="0.1"
                min={0}
                max={100}
                placeholder="0,0"
                value={comissaoPct}
                onChange={(e) => setComissaoPct(e.target.value)}
                disabled={papelId === NONE}
              />
            </div>
          </div>

          {/* Equipe — só aparece se montador */}
          {funcoes.includes("montador") && (
            <div className="flex flex-col gap-1.5">
              <Label style={{ fontSize: 12, color: "#0D1117" }}>Equipe de montagem</Label>
              <Select value={equipeId} onValueChange={setEquipeId}>
                <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                <SelectContent>
                  {equipes?.map((eq) => (
                    <SelectItem key={eq.id} value={eq.id}>{eq.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button
              type="submit"
              disabled={submitting}
              style={{ backgroundColor: "#1E6FBF", fontSize: 13, height: 36 }}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando…
                </span>
              ) : modo === "convite" ? (
                <span className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Enviar convite
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Criar membro
                </span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}