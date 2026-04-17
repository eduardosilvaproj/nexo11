import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, CheckCircle2, Plus, X } from "lucide-react";
import confetti from "canvas-confetti";
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
  assistencia: "Assistência técnica",
  reclamacao: "Reclamação",
  garantia: "Garantia",
  solicitacao: "Solicitação",
};

const TIPO_BADGE: Record<ChamadoTipo, { bg: string; fg: string }> = {
  assistencia: { bg: "#E6F3FF", fg: "#1E6FBF" },
  reclamacao: { bg: "#FDECEA", fg: "#E53935" },
  garantia: { bg: "#EEEDFE", fg: "#534AB7" },
  solicitacao: { bg: "#E8ECF2", fg: "#6B7A90" },
};

const STATUS_BORDER: Record<ChamadoStatus, string> = {
  aberto: "#E53935",
  em_andamento: "#E8A020",
  resolvido: "#12B76A",
};

const STATUS_BADGE: Record<ChamadoStatus, { bg: string; fg: string }> = {
  aberto: { bg: "#FDECEA", fg: "#E53935" },
  em_andamento: { bg: "#FEF3C7", fg: "#E8A020" },
  resolvido: { bg: "#D1FAE5", fg: "#05873C" },
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
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="rounded-xl bg-white" style={{ border: "0.5px solid #E8ECF2", padding: 20 }}>
    {(title || right) && (
      <div className="mb-4 flex items-center justify-between">
        {title && <h3 style={{ fontSize: 14, fontWeight: 500, color: "#0D1117" }}>{title}</h3>}
        {right}
      </div>
    )}
    {children}
  </div>
);

const formatBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

const npsColor = (n: number) => (n >= 9 ? "#12B76A" : n >= 7 ? "#E8A020" : "#E53935");
const npsLabel = (n: number) => (n >= 9 ? "Promotor" : n >= 7 ? "Neutro" : "Detrator");

export function ContratoPosVendaTab({ contratoId }: PosVendaTabProps) {
  const qc = useQueryClient();
  const numero = `#${contratoId.slice(0, 4).toUpperCase()}`;

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

  const npsRow = chamados.find((c) => c.nps !== null && c.nps !== undefined);
  const chamadosAbertos = chamados.filter((c) => c.status !== "resolvido").length;
  const npsOk = !!npsRow;
  const travaOk = chamadosAbertos === 0 && npsOk;

  // ============ FINALIZAR ============
  const finalizar = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("avancar_contrato", {
        p_contrato_id: contratoId,
      });
      if (error) throw error;
      const result = data as { ok: boolean; erro?: string };
      if (!result.ok) throw new Error(result.erro || "Erro ao finalizar");
      return result;
    },
    onSuccess: () => {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      toast.success(`Contrato ${numero} finalizado!`);
      qc.invalidateQueries({ queryKey: ["contrato", contratoId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ============ ABRIR CHAMADO ============
  const [chamadoOpen, setChamadoOpen] = useState(false);
  const [chamadoForm, setChamadoForm] = useState<{
    tipo: ChamadoTipo;
    titulo: string;
    descricao: string;
    custo: string;
  }>({ tipo: "assistencia", titulo: "", descricao: "", custo: "" });

  const addChamado = useMutation({
    mutationFn: async () => {
      const tit = chamadoForm.titulo.trim().slice(0, 80);
      if (!tit) throw new Error("Informe um título");
      const desc = `${tit}${chamadoForm.descricao.trim() ? "\n\n" + chamadoForm.descricao.trim() : ""}`;
      const custoNum = chamadoForm.custo === "" ? 0 : Number(chamadoForm.custo);
      if (Number.isNaN(custoNum) || custoNum < 0) throw new Error("Custo inválido");
      const { error } = await supabase.from("chamados_pos_venda").insert({
        contrato_id: contratoId,
        tipo: chamadoForm.tipo,
        descricao: desc,
        custo: custoNum,
      });
      if (error) throw error;
      await supabase.rpc("contrato_log_inserir", {
        _contrato_id: contratoId,
        _acao: "chamado_aberto",
        _titulo: `Chamado aberto: ${tit}`,
        _descricao: TIPO_LABEL[chamadoForm.tipo],
      });
    },
    onSuccess: () => {
      toast.success("Chamado aberto com sucesso");
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
  const [npsOpen, setNpsOpen] = useState(false);
  const [npsNota, setNpsNota] = useState<number | null>(null);
  const [npsComentario, setNpsComentario] = useState("");

  const saveNps = useMutation({
    mutationFn: async () => {
      if (npsNota === null) throw new Error("Selecione uma nota");
      const target = chamados[0];
      if (target) {
        const { error } = await supabase
          .from("chamados_pos_venda")
          .update({ nps: npsNota, nps_comentario: npsComentario.trim() || null })
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
          nps_comentario: npsComentario.trim() || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("NPS salvo ✓");
      setNpsOpen(false);
      setNpsNota(null);
      setNpsComentario("");
      qc.invalidateQueries({ queryKey: ["chamados", contratoId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col gap-4">
      {/* ========== TRAVA ========== */}
      {travaOk ? (
        <div
          style={{
            backgroundColor: "#F0FDF9",
            border: "1px solid #12B76A",
            borderRadius: 8,
            padding: 14,
          }}
          className="flex items-center justify-between gap-4"
        >
          <div style={{ fontSize: 14, color: "#05873C", fontWeight: 500 }}>
            Pós-venda concluído ✓ Contrato pronto para finalização
          </div>
          <button
            onClick={() => finalizar.mutate()}
            disabled={finalizar.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-white"
            style={{ backgroundColor: "#12B76A", fontSize: 13, fontWeight: 500 }}
          >
            Finalizar contrato <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: "#FEF3C7",
            border: "1px solid #E8A020",
            borderRadius: 8,
            padding: 14,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 500, color: "#0D1117", marginBottom: 8 }}>
            Para finalizar este contrato:
          </div>
          <ul className="flex flex-col gap-1.5">
            <li className="flex items-center gap-2" style={{ fontSize: 13 }}>
              {chamadosAbertos === 0 ? (
                <>
                  <Check className="h-4 w-4" style={{ color: "#12B76A" }} />
                  <span style={{ color: "#12B76A" }}>Nenhum chamado em aberto</span>
                </>
              ) : (
                <>
                  <X className="h-4 w-4" style={{ color: "#E53935" }} />
                  <span style={{ color: "#E53935" }}>
                    Chamados em aberto ({chamadosAbertos}{" "}
                    {chamadosAbertos === 1 ? "pendente" : "pendentes"})
                  </span>
                </>
              )}
            </li>
            <li className="flex items-center gap-2" style={{ fontSize: 13 }}>
              {npsOk ? (
                <>
                  <Check className="h-4 w-4" style={{ color: "#12B76A" }} />
                  <span style={{ color: "#12B76A" }}>NPS registrado</span>
                </>
              ) : (
                <>
                  <X className="h-4 w-4" style={{ color: "#E53935" }} />
                  <span style={{ color: "#E53935" }}>NPS não registrado</span>
                </>
              )}
            </li>
          </ul>
        </div>
      )}

      {/* ========== CHAMADOS ========== */}
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
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>Abrir chamado</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Tipo <span style={{ color: "#E53935" }}>*</span></Label>
                  <Select
                    value={chamadoForm.tipo}
                    onValueChange={(v) =>
                      setChamadoForm({ ...chamadoForm, tipo: v as ChamadoTipo })
                    }
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
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Título <span style={{ color: "#E53935" }}>*</span></Label>
                    <span style={{ fontSize: 11, color: "#6B7A90" }}>
                      {chamadoForm.titulo.length}/80
                    </span>
                  </div>
                  <Input
                    maxLength={80}
                    value={chamadoForm.titulo}
                    onChange={(e) =>
                      setChamadoForm({ ...chamadoForm, titulo: e.target.value })
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Descrição</Label>
                  <Textarea
                    rows={4}
                    value={chamadoForm.descricao}
                    onChange={(e) =>
                      setChamadoForm({ ...chamadoForm, descricao: e.target.value })
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Custo de assistência (R$)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={chamadoForm.custo}
                    onChange={(e) =>
                      setChamadoForm({ ...chamadoForm, custo: e.target.value })
                    }
                  />
                  <span style={{ fontSize: 12, color: "#E8A020" }}>
                    Valores acima de R$ 0 serão adicionados ao DRE do contrato
                  </span>
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
          <div className="flex flex-col items-center gap-1 py-6">
            <CheckCircle2 className="h-8 w-8" style={{ color: "#12B76A" }} />
            <span style={{ fontSize: 13, color: "#12B76A", fontWeight: 500 }}>
              Nenhum chamado neste contrato ✓
            </span>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {chamados.map((c) => {
              const titulo = c.descricao.split("\n")[0];
              const restoDesc = c.descricao.split("\n").slice(1).join("\n").trim();
              const tipoBadge = TIPO_BADGE[c.tipo];
              const statusBadge = STATUS_BADGE[c.status];
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
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5"
                          style={{
                            backgroundColor: tipoBadge.bg,
                            color: tipoBadge.fg,
                            fontSize: 10,
                            fontWeight: 500,
                          }}
                        >
                          {TIPO_LABEL[c.tipo]}
                        </span>
                        <span style={{ fontSize: 13, color: "#0D1117", fontWeight: 500 }}>
                          {titulo}
                        </span>
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5"
                          style={{
                            backgroundColor: statusBadge.bg,
                            color: statusBadge.fg,
                            fontSize: 10,
                            fontWeight: 500,
                          }}
                        >
                          {STATUS_LABEL[c.status]}
                        </span>
                      </div>
                      {restoDesc && (
                        <div
                          className="mt-1 truncate"
                          style={{ fontSize: 12, color: "#6B7A90" }}
                        >
                          {restoDesc}
                        </div>
                      )}
                      <div
                        className="mt-1 flex gap-3"
                        style={{ fontSize: 11, color: "#6B7A90" }}
                      >
                        <span>{formatBRL(Number(c.custo ?? 0))}</span>
                        <span>{new Date(c.data_abertura).toLocaleDateString("pt-BR")}</span>
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

      {/* ========== NPS ========== */}
      <Card title="NPS do cliente">
        {!npsRow ? (
          <div
            className="flex flex-col items-center gap-3 py-6"
            style={{
              backgroundColor: "#F5F7FA",
              border: "1px dashed #B0BAC9",
              borderRadius: 8,
            }}
          >
            <span style={{ fontSize: 13, color: "#6B7A90" }}>NPS ainda não coletado</span>
            <Dialog open={npsOpen} onOpenChange={setNpsOpen}>
              <DialogTrigger asChild>
                <button
                  className="rounded-lg px-4 py-2 text-white"
                  style={{ backgroundColor: "#1E6FBF", fontSize: 13 }}
                >
                  Registrar NPS
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                  <DialogTitle>Como foi a experiência do cliente?</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                  <div>
                    <div className="flex justify-center gap-1">
                      {Array.from({ length: 11 }, (_, i) => i).map((n) => {
                        const c = npsColor(n);
                        const selected = npsNota === n;
                        return (
                          <button
                            key={n}
                            onClick={() => setNpsNota(n)}
                            className="rounded-md transition-colors"
                            style={{
                              width: 40,
                              height: 40,
                              fontSize: 14,
                              fontWeight: 500,
                              backgroundColor: selected ? c : "#F7F9FC",
                              color: selected ? "#FFFFFF" : "#0D1117",
                              border: `1px solid ${selected ? c : "#E8ECF2"}`,
                            }}
                          >
                            {n}
                          </button>
                        );
                      })}
                    </div>
                    <div
                      className="mt-2 flex justify-between"
                      style={{ fontSize: 11, color: "#6B7A90" }}
                    >
                      <span>Muito insatisfeito</span>
                      <span>Muito satisfeito</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Comentário</Label>
                    <Textarea
                      rows={3}
                      placeholder="O que o cliente achou? (opcional)"
                      value={npsComentario}
                      onChange={(e) => setNpsComentario(e.target.value)}
                    />
                  </div>
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
              style={{
                fontSize: 56,
                fontWeight: 600,
                color: npsColor(npsRow.nps!),
                lineHeight: 1,
              }}
            >
              {npsRow.nps}
            </span>
            <span
              className="inline-flex items-center rounded-full px-3 py-0.5"
              style={{
                backgroundColor: `${npsColor(npsRow.nps!)}1A`,
                color: npsColor(npsRow.nps!),
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {npsLabel(npsRow.nps!)}
            </span>
            {npsRow.nps_comentario && (
              <p
                className="max-w-md text-center italic"
                style={{ fontSize: 13, color: "#6B7A90" }}
              >
                "{npsRow.nps_comentario}"
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
