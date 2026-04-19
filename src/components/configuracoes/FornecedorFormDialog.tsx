import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface Fornecedor {
  id: string;
  nome: string;
  tipo: string;
  prazo_padrao_dias: number | null;
  contato: string | null;
  email: string | null;
  telefone: string | null;
  observacoes: string | null;
  ativo: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lojaId: string | null;
  fornecedor: Fornecedor | null;
}

export function FornecedorFormDialog({ open, onOpenChange, lojaId, fornecedor }: Props) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"fabrica_xml" | "terceirizado">("terceirizado");
  const [prazo, setPrazo] = useState("30");
  const [contato, setContato] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (open) {
      setNome(fornecedor?.nome ?? "");
      setTipo((fornecedor?.tipo as "fabrica_xml" | "terceirizado") ?? "terceirizado");
      setPrazo(String(fornecedor?.prazo_padrao_dias ?? 30));
      setContato(fornecedor?.contato ?? "");
      setEmail(fornecedor?.email ?? "");
      setTelefone(fornecedor?.telefone ?? "");
      setObservacoes(fornecedor?.observacoes ?? "");
      setAtivo(fornecedor?.ativo ?? true);
    }
  }, [open, fornecedor]);

  const salvar = async () => {
    if (!lojaId) return toast.error("Loja não identificada");
    if (!nome.trim()) return toast.error("Informe o nome");
    setSalvando(true);

    const payload = {
      loja_id: lojaId,
      nome: nome.trim(),
      tipo,
      prazo_padrao_dias: parseInt(prazo, 10) || 0,
      contato: contato.trim() || null,
      email: email.trim() || null,
      telefone: telefone.trim() || null,
      observacoes: observacoes.trim() || null,
      ativo,
    };

    const sb = supabase as unknown as {
      from: (t: string) => {
        insert: (v: unknown) => Promise<{ error: Error | null }>;
        update: (v: unknown) => { eq: (c: string, v: string) => Promise<{ error: Error | null }> };
      };
    };

    const { error } = fornecedor
      ? await sb.from("fornecedores").update(payload).eq("id", fornecedor.id)
      : await sb.from("fornecedores").insert(payload);

    setSalvando(false);
    if (error) return toast.error(error.message);
    toast.success(fornecedor ? "Fornecedor atualizado" : "Fornecedor cadastrado");
    qc.invalidateQueries({ queryKey: ["fornecedores-config"] });
    qc.invalidateQueries({ queryKey: ["fornecedores-ativos"] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{fornecedor ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as "fabrica_xml" | "terceirizado")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fabrica_xml">Fábrica XML</SelectItem>
                  <SelectItem value="terceirizado">Terceirizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prazo padrão (dias)</Label>
              <Input type="number" min="0" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Contato</Label>
            <Input value={contato} onChange={(e) => setContato(e.target.value)} placeholder="Nome do responsável" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label>Ativo</Label>
            <Switch checked={ativo} onCheckedChange={setAtivo} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando} style={{ backgroundColor: "#1E6FBF" }}>
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
