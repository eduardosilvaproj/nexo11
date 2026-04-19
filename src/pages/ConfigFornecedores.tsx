import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { FornecedorFormDialog, type Fornecedor } from "@/components/configuracoes/FornecedorFormDialog";

export default function ConfigFornecedores() {
  const qc = useQueryClient();
  const { perfil } = useAuth();
  const lojaId = perfil?.loja_id ?? null;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Fornecedor | null>(null);

  const { data: fornecedores, isLoading } = useQuery({
    queryKey: ["fornecedores-config", lojaId],
    enabled: !!lojaId,
    queryFn: async () => {
      const { data, error } = await (supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (c: string, v: string) => {
              order: (c: string, o: { ascending: boolean }) => Promise<{ data: Fornecedor[] | null; error: Error | null }>;
            };
          };
        };
      })
        .from("fornecedores")
        .select("id, nome, tipo, prazo_padrao_dias, contato, email, telefone, observacoes, ativo")
        .eq("loja_id", lojaId!)
        .order("nome", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggleAtivo = async (f: Fornecedor) => {
    const { error } = await (supabase as unknown as {
      from: (t: string) => { update: (v: unknown) => { eq: (c: string, v: string) => Promise<{ error: Error | null }> } };
    })
      .from("fornecedores")
      .update({ ativo: !f.ativo })
      .eq("id", f.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["fornecedores-config"] });
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: "#0D1117" }}>Fornecedores</h1>
          <p style={{ fontSize: 13, color: "#6B7A90" }}>Cadastro de fábricas (XML) e terceirizados</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} style={{ backgroundColor: "#1E6FBF", color: "#fff" }}>
          <Plus className="mr-2 h-4 w-4" /> Novo Fornecedor
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl bg-white" style={{ border: "0.5px solid #E8ECF2" }}>
        <table className="w-full">
          <thead style={{ backgroundColor: "#F7F9FC" }}>
            <tr>
              {["Nome", "Tipo", "Prazo padrão", "Contato", "Ativo", "Ações"].map((h) => (
                <th key={h} className="px-4 py-3 text-left" style={{ fontSize: 11, color: "#6B7A90", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">Carregando...</td></tr>}
            {!isLoading && (!fornecedores || fornecedores.length === 0) && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum fornecedor cadastrado</td></tr>
            )}
            {fornecedores?.map((f) => {
              const isFabrica = f.tipo === "fabrica_xml";
              return (
                <tr key={f.id} style={{ borderTop: "0.5px solid #E8ECF2" }}>
                  <td className="px-4 py-3 text-sm font-medium">{f.nome}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5" style={{
                      backgroundColor: isFabrica ? "#E6F3FF" : "#EEF1F6",
                      color: isFabrica ? "#1E6FBF" : "#6B7A90",
                      fontSize: 11, fontWeight: 500
                    }}>
                      {isFabrica ? "Fábrica XML" : "Terceirizado"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{f.prazo_padrao_dias ?? 0} dias</td>
                  <td className="px-4 py-3 text-sm">{f.contato ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Switch checked={f.ativo} onCheckedChange={() => toggleAtivo(f)} />
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" onClick={() => { setEditing(f); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <FornecedorFormDialog open={open} onOpenChange={setOpen} lojaId={lojaId} fornecedor={editing} />
    </div>
  );
}
