import { useState } from "react";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowRight } from "lucide-react";

const ORIGENS = ["Instagram", "Indicação", "Loja física", "Site", "Google", "Outro"];

const schema = z.object({
  nome: z.string().trim().min(2, "Nome obrigatório").max(120),
  telefone: z.string().trim().min(8, "Telefone obrigatório").max(40),
  email: z.string().trim().email("E-mail inválido").max(120).optional().or(z.literal("")),
  origem: z.string().trim().min(1, "Origem obrigatória").max(40),
  vendedor_id: z.string().uuid("Vendedor obrigatório"),
  valor_estimado: z
    .union([z.number().nonnegative(), z.nan()])
    .optional(),
  observacoes: z.string().trim().max(1000).optional(),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const labelStyle: React.CSSProperties = { fontSize: 12, color: "#6B7A90", fontWeight: 500 };

function fieldStyle(invalid: boolean): React.CSSProperties {
  return {
    width: "100%",
    fontSize: 13,
    color: "#0D1117",
    background: "#FFFFFF",
    border: `1px solid ${invalid ? "#E53935" : "#E8ECF2"}`,
    borderRadius: 8,
    padding: "8px 10px",
    outline: "none",
  };
}

export function LeadFormDialog({ open, onOpenChange }: Props) {
  const { perfil } = useAuth();
  const queryClient = useQueryClient();

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [origem, setOrigem] = useState("");
  const [vendedorId, setVendedorId] = useState("");
  const [valor, setValor] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: vendedores = [] } = useQuery({
    queryKey: ["usuarios-loja", perfil?.loja_id],
    enabled: !!perfil?.loja_id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nome")
        .eq("loja_id", perfil!.loja_id!)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const reset = () => {
    setNome("");
    setTelefone("");
    setEmail("");
    setOrigem("");
    setVendedorId("");
    setValor("");
    setObservacoes("");
    setErrors({});
  };

  const create = useMutation({
    mutationFn: async () => {
      const valorNum = valor ? Number(valor.replace(/\./g, "").replace(",", ".")) : undefined;
      const parsed = schema.safeParse({
        nome,
        telefone,
        email: email || undefined,
        origem,
        vendedor_id: vendedorId,
        valor_estimado: valorNum,
        observacoes: observacoes || undefined,
      });
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        parsed.error.issues.forEach((i) => {
          errs[i.path[0] as string] = i.message;
        });
        setErrors(errs);
        throw new Error("validacao");
      }
      if (!perfil?.loja_id) throw new Error("Sem loja vinculada");

      const { error } = await supabase.from("leads").insert({
        nome: parsed.data.nome,
        contato: parsed.data.telefone,
        email: parsed.data.email || null,
        origem: parsed.data.origem,
        vendedor_id: parsed.data.vendedor_id,
        valor_estimado: valorNum && !isNaN(valorNum) ? valorNum : null,
        observacoes: parsed.data.observacoes || null,
        loja_id: perfil.loja_id,
        status: "novo",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Lead criado", description: "Adicionado ao funil em 'Novo'." });
      queryClient.invalidateQueries({ queryKey: ["leads", perfil?.loja_id] });
      reset();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      if (err.message !== "validacao") {
        toast({ title: "Erro ao criar lead", description: err.message, variant: "destructive" });
      }
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle style={{ fontSize: 16, fontWeight: 600, color: "#0D1117" }}>
            Novo lead
          </DialogTitle>
          <DialogDescription style={{ fontSize: 13, color: "#6B7A90" }}>
            Preencha os dados para iniciar o atendimento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <label style={labelStyle}>Nome completo *</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={120}
              style={fieldStyle(!!errors.nome)}
              className="mt-1"
            />
            {errors.nome && <p className="mt-1" style={{ fontSize: 11, color: "#E53935" }}>{errors.nome}</p>}
          </div>

          <div>
            <label style={labelStyle}>Telefone / WhatsApp *</label>
            <input
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              maxLength={40}
              placeholder="(11) 99999-0000"
              style={fieldStyle(!!errors.telefone)}
              className="mt-1"
            />
            {errors.telefone && <p className="mt-1" style={{ fontSize: 11, color: "#E53935" }}>{errors.telefone}</p>}
          </div>

          <div>
            <label style={labelStyle}>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={120}
              style={fieldStyle(!!errors.email)}
              className="mt-1"
            />
            {errors.email && <p className="mt-1" style={{ fontSize: 11, color: "#E53935" }}>{errors.email}</p>}
          </div>

          <div>
            <label style={labelStyle}>Origem *</label>
            <select
              value={origem}
              onChange={(e) => setOrigem(e.target.value)}
              style={fieldStyle(!!errors.origem)}
              className="mt-1"
            >
              <option value="">Selecione...</option>
              {ORIGENS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            {errors.origem && <p className="mt-1" style={{ fontSize: 11, color: "#E53935" }}>{errors.origem}</p>}
          </div>

          <div>
            <label style={labelStyle}>Vendedor responsável *</label>
            <select
              value={vendedorId}
              onChange={(e) => setVendedorId(e.target.value)}
              style={fieldStyle(!!errors.vendedor_id)}
              className="mt-1"
            >
              <option value="">Selecione...</option>
              {vendedores.map((v) => (
                <option key={v.id} value={v.id}>{v.nome}</option>
              ))}
            </select>
            {errors.vendedor_id && <p className="mt-1" style={{ fontSize: 11, color: "#E53935" }}>{errors.vendedor_id}</p>}
          </div>

          <div>
            <label style={labelStyle}>Valor estimado</label>
            <div className="relative mt-1">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ fontSize: 13, color: "#6B7A90" }}
              >
                R$
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value.replace(/[^\d.,]/g, ""))}
                placeholder="0,00"
                style={{ ...fieldStyle(false), paddingLeft: 32 }}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Observações</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              maxLength={1000}
              rows={3}
              style={{ ...fieldStyle(false), resize: "vertical", fontFamily: "inherit" }}
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 transition-colors hover:bg-[#F5F7FA]"
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#6B7A90",
              background: "#FFFFFF",
              border: "1px solid #E8ECF2",
              borderRadius: 8,
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => create.mutate()}
            disabled={create.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-white transition-colors hover:bg-[#0B4A8A] disabled:opacity-60"
            style={{
              fontSize: 13,
              fontWeight: 500,
              background: "#1E6FBF",
              borderRadius: 8,
            }}
          >
            {create.isPending ? "Salvando..." : "Salvar lead"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
