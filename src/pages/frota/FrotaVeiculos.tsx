import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  disponivel: "bg-green-100 text-green-700",
  em_uso: "bg-blue-100 text-blue-700",
  manutencao: "bg-amber-100 text-amber-700",
  inativo: "bg-slate-100 text-slate-700",
};

export default function FrotaVeiculos() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: veiculos } = useQuery({
    queryKey: ["veiculos"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("veiculos").select("*").order("placa");
      return data || [];
    },
  });

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload: any = {
      placa: (f.get("placa") as string)?.toUpperCase().trim(),
      modelo: f.get("modelo"),
      marca: f.get("marca"),
      ano_fabricacao: Number(f.get("ano_fabricacao")) || null,
      cor: f.get("cor"),
      tipo_combustivel: f.get("tipo_combustivel"),
      capacidade_tanque: Number(f.get("capacidade_tanque")) || null,
      km_atual: Number(f.get("km_atual")) || 0,
      status: f.get("status"),
      proprietario: f.get("proprietario"),
      seguro_numero: f.get("seguro_numero") || null,
      seguro_validade: f.get("seguro_validade") || null,
      licenciamento_vencimento: f.get("licenciamento_vencimento") || null,
      iptu_vencimento: f.get("iptu_vencimento") || null,
    };
    const q = editing
      ? (supabase as any).from("veiculos").update(payload).eq("id", editing.id)
      : (supabase as any).from("veiculos").insert(payload);
    const { error } = await q;
    if (error) return toast.error(error.message);
    toast.success(editing ? "Veículo atualizado" : "Veículo cadastrado");
    setOpen(false);
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["veiculos"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este veículo?")) return;
    const { error } = await (supabase as any).from("veiculos").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["veiculos"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" />
              Novo veículo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar veículo" : "Novo veículo"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
              <Field name="placa" label="Placa *" defaultValue={editing?.placa} required />
              <Field name="modelo" label="Modelo *" defaultValue={editing?.modelo} required />
              <Field name="marca" label="Marca *" defaultValue={editing?.marca} required />
              <Field name="ano_fabricacao" label="Ano" type="number" defaultValue={editing?.ano_fabricacao} />
              <Field name="cor" label="Cor" defaultValue={editing?.cor} />
              <div>
                <Label>Combustível</Label>
                <Select name="tipo_combustivel" defaultValue={editing?.tipo_combustivel || "flex"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gasolina">Gasolina</SelectItem>
                    <SelectItem value="etanol">Etanol</SelectItem>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="flex">Flex</SelectItem>
                    <SelectItem value="eletrico">Elétrico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Field name="capacidade_tanque" label="Tanque (L)" type="number" defaultValue={editing?.capacidade_tanque} />
              <Field name="km_atual" label="KM atual" type="number" defaultValue={editing?.km_atual} />
              <div>
                <Label>Status</Label>
                <Select name="status" defaultValue={editing?.status || "disponivel"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disponivel">Disponível</SelectItem>
                    <SelectItem value="em_uso">Em uso</SelectItem>
                    <SelectItem value="manutencao">Manutenção</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Proprietário</Label>
                <Select name="proprietario" defaultValue={editing?.proprietario || "frota"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frota">Frota</SelectItem>
                    <SelectItem value="terceiro">Terceiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Field name="seguro_numero" label="Nº apólice" defaultValue={editing?.seguro_numero} />
              <Field name="seguro_validade" label="Validade seguro" type="date" defaultValue={editing?.seguro_validade} />
              <Field name="licenciamento_vencimento" label="Licenciamento" type="date" defaultValue={editing?.licenciamento_vencimento} />
              <Field name="iptu_vencimento" label="IPVA / IPTU" type="date" defaultValue={editing?.iptu_vencimento} />
              <DialogFooter className="sm:col-span-2">
                <Button type="submit">Salvar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Placa</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Combustível</TableHead>
                <TableHead>KM</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(veiculos || []).map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono font-semibold">{v.placa}</TableCell>
                  <TableCell>{v.modelo}</TableCell>
                  <TableCell>{v.marca}</TableCell>
                  <TableCell className="capitalize">{v.tipo_combustivel}</TableCell>
                  <TableCell>{Number(v.km_atual || 0).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[v.status] || ""}>{v.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(v); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(v.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(veiculos || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-slate-500">
                    Nenhum veículo cadastrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ name, label, type = "text", defaultValue, required }: any) {
  return (
    <div>
      <Label>{label}</Label>
      <Input name={name} type={type} defaultValue={defaultValue ?? ""} required={required} />
    </div>
  );
}
