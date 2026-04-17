import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";

type ChamadoTipo = Database["public"]["Enums"]["chamado_tipo"];
type ChamadoStatus = Database["public"]["Enums"]["chamado_status"];

interface PosVendaTabProps {
  contratoId: string;
}

const TIPO_LABEL: Record<ChamadoTipo, string> = {
  assistencia: "Assistência",
  reclamacao: "Reclamação",
  garantia: "Garantia",
  solicitacao: "Solicitação",
};

const STATUS_BORDER: Record<ChamadoStatus, string> = {
  aberto: "#E53935",
  em_andamento: "#E8A020",
  resolvido: "#12B76A",
};

const STATUS_LABEL: Record<ChamadoStatus, string> = {
  aberto: "Aberto",
  em_andamento: "Em andamento",
  resolvido: "Resolvido",
};

const Card = ({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="rounded-xl bg-white" style={{ border: "0.5px solid #E8ECF2", padding: 20 }}>
    <div className="mb-4 flex items-center justify-between">
      <h3 style={{ fontSize: 14, fontWeight: 500, color: "#0D1117" }}>{title}</h3>
      {right}
    </div>
    {children}
  </div>
);

const formatBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

const npsColor = (n: number) => (n >= 9 ? "#12B76A" : n >= 7 ? "#E8A020" : "#E53935");

export function ContratoPosVendaTab({ contratoId }: PosVendaTabProps) {
  const qc = useQueryClient();

  // ============ CHAMADOS ============
  const { data: chamados = [] } = useQuery({
    queryKey: ["chamados", contratoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chamados_pos_venda")
        .select("*")
        .eq("contrato_id", contratoId)
        .order("data_abertura", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [chamadoOpen, setChamadoOpen] = useState(false);
  const [chamadoForm, setChamadoForm] = useState<{
    tipo: ChamadoTipo;
    titulo: string;
    descricao: string;
    custo: string;
  }>({ tipo: "assistencia", titulo: "", descricao: "", custo: "" });

  const addChamado = useMutation({
    mutationFn: async () => {
      if (!chamadoForm.descricao && !chamadoForm.titulo)
        throw new Error("Informe o título/descrição");
      const desc = chamadoForm.titulo
        ? `${chamadoForm.titulo}${chamadoForm.descricao ? "\n\n" + chamadoForm.descricao : ""}`
        : chamadoForm.descricao;
      const { error } = await supabase.from("chamados_pos_venda").insert({
        contrato_id: contratoId,
        tipo: chamadoForm.tipo,
        descricao: desc,
        custo: Number(chamadoForm.custo) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Chamado aberto");
      setChamadoOpen(false);
      setChamadoForm({ tipo: "assistencia", titulo: "", descricao: "", custo: "" });
      qc.invalidateQueries({ queryKey: ["chamados", contratoId] });
      qc.invalidateQueries({ queryKey: ["dre", contratoId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resolveChamado = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("chamados_pos_venda")
        .update({ status: "resolvido", data_fechamento: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Chamado resolvido");
      qc.invalidateQueries({ queryKey: ["chamados", contratoId] });
      qc.invalidateQueries({ queryKey: ["dre", contratoId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ============ NPS ============
  const npsRow = chamados.find((c) => c.nps !== null && c.nps !== undefined);

  const [npsOpen, setNpsOpen] = useState(false);
  const [npsNota, setNpsNota] = useState<number | null>(null);
  const [npsComentario, setNpsComentario] = useState("");

  const saveNps = useMutation({
    mutationFn: async () => {
      if (npsNota === null) throw new Error("Selecione uma nota");
      // grava em um chamado existente do tipo solicitação ou cria um
      const target = chamados[0];
      if (target) {
        const { error } = await supabase
          .from("chamados_pos_venda")
          .update({ nps: npsNota, nps_comentario: npsComentario })
          .eq("id", target.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("chamados_pos_venda").insert({
          contrato_id: contratoId,
          tipo: "solicitacao",
          descricao: "Pesquisa NPS",
          status: "resolvido",
          data_fechamento: new Date().toISOString(),
          nps: npsNota,
          nps_comentario: npsComentario,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("NPS registrado");
      setNpsOpen(false);
      qc.invalidateQueries({ queryKey: ["chamados", contratoId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col gap-4">
      <Card
        title="Chamados"
        right={
          <Dialog open={chamadoOpen} onOpenChange={setChamadoOpen}>
            <DialogTrigger asChild>
              <button
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-white"
                style={{ backgroundColor: "#1E6FBF", fontSize: 12 }}
              >
                <Plus className="h-3 w-3" />
                Abrir chamado
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Abrir chamado</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <Label>Tipo</Label>
                  <Select
                    value={chamadoForm.tipo}
                    onValueChange={(v) => setChamadoForm({ ...chamadoForm, tipo: v as ChamadoTipo })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TIPO_LABEL) as ChamadoTipo[]).map((t) => (
                        <SelectItem key={t} value={t}>
                          {TIPO_LABEL[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Título</Label>
                  <Input
                    value={chamadoForm.titulo}
                    onChange={(e) => setChamadoForm({ ...chamadoForm, titulo: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Descrição</Label>
                  <Textarea
                    value={chamadoForm.descricao}
                    onChange={(e) => setChamadoForm({ ...chamadoForm, descricao: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Custo de assistência (R$)</Label>
                  <Input
                    type="number"
                    value={chamadoForm.custo}
                    onChange={(e) => setChamadoForm({ ...chamadoForm, custo: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setChamadoOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => addChamado.mutate()}
                  disabled={addChamado.isPending}
                  style={{ backgroundColor: "#1E6FBF" }}
                >
                  Abrir chamado
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      >
        {chamados.length === 0 ? (
          <span style={{ fontSize: 13, color: "#6B7A90" }}>Nenhum chamado registrado.</span>
        ) : (
          <ul className="flex flex-col gap-2">
            {chamados.map((c) => {
              const titulo = c.descricao.split("\n")[0];
              return (
                <li
                  key={c.id}
                  className="rounded-lg p-3"
                  style={{
                    borderLeft: `3px solid ${STATUS_BORDER[c.status]}`,
                    backgroundColor: "#F7F9FC",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5"
                          style={{
                            backgroundColor: "#E6F3FF",
                            color: "#1E6FBF",
                            fontSize: 10,
                            fontWeight: 500,
                            textTransform: "uppercase",
                          }}
                        >
                          {TIPO_LABEL[c.tipo]}
                        </span>
                        <span style={{ fontSize: 13, color: "#0D1117", fontWeight: 500 }}>
                          {titulo}
                        </span>
                      </div>
                      <div
                        className="mt-1 flex gap-3"
                        style={{ fontSize: 11, color: "#6B7A90" }}
                      >
                        <span>{STATUS_LABEL[c.status]}</span>
                        <span>{new Date(c.data_abertura).toLocaleDateString("pt-BR")}</span>
                        <span>{formatBRL(Number(c.custo ?? 0))}</span>
                      </div>
                    </div>
                    {c.status !== "resolvido" && (
                      <button
                        onClick={() => resolveChamado.mutate(c.id)}
                        className="rounded-md px-2 py-1 text-white"
                        style={{ backgroundColor: "#12B76A", fontSize: 11 }}
                      >
                        Resolver
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card title="NPS">
        {!npsRow ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <span style={{ fontSize: 13, color: "#6B7A90" }}>NPS ainda não registrado</span>
            <Dialog open={npsOpen} onOpenChange={setNpsOpen}>
              <DialogTrigger asChild>
                <button
                  className="rounded-lg px-4 py-2 text-white"
                  style={{ backgroundColor: "#1E6FBF", fontSize: 13 }}
                >
                  Registrar NPS
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar NPS</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-3">
                  <Label>Nota (0–10)</Label>
                  <div className="grid grid-cols-11 gap-1">
                    {Array.from({ length: 11 }, (_, i) => i).map((n) => (
                      <button
                        key={n}
                        onClick={() => setNpsNota(n)}
                        className="rounded-md py-2 transition-colors"
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          backgroundColor: npsNota === n ? npsColor(n) : "#F7F9FC",
                          color: npsNota === n ? "#FFFFFF" : "#0D1117",
                          border: "1px solid #E8ECF2",
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <Label className="mt-2">Comentário</Label>
                  <Textarea
                    value={npsComentario}
                    onChange={(e) => setNpsComentario(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setNpsOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => saveNps.mutate()}
                    disabled={saveNps.isPending}
                    style={{ backgroundColor: "#1E6FBF" }}
                  >
                    Salvar NPS
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4">
            <span
              style={{ fontSize: 56, fontWeight: 600, color: npsColor(npsRow.nps!), lineHeight: 1 }}
            >
              {npsRow.nps}
            </span>
            {npsRow.nps_comentario && (
              <p
                className="max-w-md text-center"
                style={{ fontSize: 13, color: "#0D1117" }}
              >
                “{npsRow.nps_comentario}”
              </p>
            )}
            <span style={{ fontSize: 11, color: "#6B7A90" }}>
              {new Date(npsRow.updated_at).toLocaleDateString("pt-BR")}
            </span>
          </div>
        )}
      </Card>
    </div>
  );
}
