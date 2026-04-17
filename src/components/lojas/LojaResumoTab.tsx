import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Props = { lojaId: string };

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "0.5px solid #E8ECF2", borderRadius: 12, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#0D1117" }}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
      <span style={{ color: "#6B7A90" }}>{label}</span>
      <span style={{ color: "#0D1117", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function Bar({ pct, color }: { pct: number; color: string }) {
  const w = Math.min(100, Math.max(0, pct));
  return (
    <div style={{ height: 6, background: "#E8ECF2", borderRadius: 3, overflow: "hidden", marginTop: 6 }}>
      <div style={{ width: `${w}%`, height: "100%", background: color, transition: "width 200ms" }} />
    </div>
  );
}

export function LojaResumoTab({ lojaId }: Props) {
  const qc = useQueryClient();
  const mes = new Date().toISOString().slice(0, 7);
  const mesData = useMemo(() => {
    const [y, m] = mes.split("-").map(Number);
    return {
      inicio: new Date(y, m - 1, 1).toISOString(),
      fim: new Date(y, m, 1).toISOString(),
      mesRef: new Date(y, m - 1, 1).toISOString().slice(0, 10),
    };
  }, [mes]);

  const [editMetas, setEditMetas] = useState(false);
  const [metaFat, setMetaFat] = useState("");
  const [metaMar, setMetaMar] = useState("");

  const { data: loja } = useQuery({
    queryKey: ["loja-cad", lojaId],
    queryFn: async () => {
      const { data } = await supabase
        .from("lojas")
        .select("cnpj, telefone, email, franqueado_id")
        .eq("id", lojaId)
        .maybeSingle();
      return data as any;
    },
  });

  const { data: responsavel } = useQuery({
    queryKey: ["loja-responsavel", loja?.franqueado_id],
    enabled: !!loja?.franqueado_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("usuarios_publico")
        .select("nome")
        .eq("id", loja.franqueado_id)
        .maybeSingle();
      return data?.nome ?? "—";
    },
  });

  const { data: meta } = useQuery({
    queryKey: ["loja-meta", lojaId, mesData.mesRef],
    queryFn: async () => {
      const { data } = await supabase
        .from("metas_loja")
        .select("meta_faturamento, meta_margem")
        .eq("loja_id", lojaId)
        .eq("mes_referencia", mesData.mesRef)
        .maybeSingle();
      return data ?? { meta_faturamento: 0, meta_margem: 0 };
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["loja-stats", lojaId, mes],
    queryFn: async () => {
      const [{ data: dre }, { data: pe }, { data: parados }, { data: margemBaixa }, { data: chamados }] = await Promise.all([
        supabase
          .from("vw_contratos_dre")
          .select("valor_venda, margem_realizada")
          .eq("loja_id", lojaId)
          .gte("data_criacao", mesData.inicio)
          .lt("data_criacao", mesData.fim),
        supabase
          .from("vw_ponto_equilibrio")
          .select("faturamento_realizado, pe_calculado")
          .eq("loja_id", lojaId)
          .gte("mes", mesData.inicio)
          .lt("mes", mesData.fim)
          .maybeSingle(),
        supabase
          .from("contratos")
          .select("id, cliente_nome")
          .eq("loja_id", lojaId)
          .not("status", "in", "(finalizado)")
          .lt("updated_at", new Date(Date.now() - SEVEN_DAYS).toISOString()),
        supabase
          .from("vw_contratos_dre")
          .select("id, cliente_nome, margem_realizada")
          .eq("loja_id", lojaId)
          .eq("status", "finalizado")
          .lt("margem_realizada", 15)
          .gte("data_criacao", mesData.inicio),
        supabase
          .from("chamados_pos_venda")
          .select("id, descricao, contratos!inner(loja_id)")
          .neq("status", "resolvido")
          .eq("contratos.loja_id", lojaId),
      ]);

      let fat = 0, sumMW = 0, w = 0;
      (dre ?? []).forEach((r: any) => {
        const v = Number(r.valor_venda ?? 0);
        fat += v;
        if (v > 0 && r.margem_realizada != null) {
          sumMW += Number(r.margem_realizada) * v;
          w += v;
        }
      });

      const alertas: { titulo: string; tipo: string }[] = [];
      (parados ?? []).forEach((c: any) =>
        alertas.push({ tipo: "Parado >7d", titulo: c.cliente_nome }),
      );
      (margemBaixa ?? []).forEach((c: any) =>
        alertas.push({ tipo: `Margem ${Number(c.margem_realizada).toFixed(1)}%`, titulo: c.cliente_nome }),
      );
      (chamados ?? []).forEach((c: any) =>
        alertas.push({ tipo: "Chamado aberto", titulo: c.descricao?.slice(0, 60) ?? "—" }),
      );

      return {
        faturamento: fat,
        margem: w > 0 ? sumMW / w : 0,
        pe: Number(pe?.pe_calculado ?? 0),
        peFat: Number(pe?.faturamento_realizado ?? fat),
        alertas,
      };
    },
  });

  const saveMetas = useMutation({
    mutationFn: async () => {
      const parsed = z
        .object({
          meta_faturamento: z.number().min(0),
          meta_margem: z.number().min(0).max(100),
        })
        .parse({
          meta_faturamento: Number(metaFat) || 0,
          meta_margem: Number(metaMar) || 0,
        });
      const { error } = await supabase.from("metas_loja").upsert(
        {
          loja_id: lojaId,
          mes_referencia: mesData.mesRef,
          ...parsed,
        },
        { onConflict: "loja_id,mes_referencia" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Metas salvas");
      qc.invalidateQueries({ queryKey: ["loja-meta", lojaId] });
      setEditMetas(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar"),
  });

  const openMetas = () => {
    setMetaFat(String(meta?.meta_faturamento ?? ""));
    setMetaMar(String(meta?.meta_margem ?? ""));
    setEditMetas(true);
  };

  const fat = stats?.faturamento ?? 0;
  const mar = stats?.margem ?? 0;
  const pe = stats?.pe ?? 0;
  const peFat = stats?.peFat ?? 0;
  const peAt = pe > 0 ? (peFat / pe) * 100 : 0;
  const peColor = peAt < 70 ? "#E53935" : peAt < 100 ? "#1E6FBF" : "#12B76A";

  const fatPct = meta?.meta_faturamento ? (fat / Number(meta.meta_faturamento)) * 100 : 0;
  const marOk = meta?.meta_margem ? mar >= Number(meta.meta_margem) : false;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Esquerda */}
      <div className="flex flex-col gap-4">
        <Card title="Dados cadastrais" action={<Button variant="ghost" size="sm" style={{ color: "#1E6FBF" }}>Editar</Button>}>
          <Row label="CNPJ" value={loja?.cnpj || "—"} />
          <Row label="Telefone" value={loja?.telefone || "—"} />
          <Row label="Email" value={loja?.email || "—"} />
          <Row label="Responsável" value={responsavel || "—"} />
        </Card>

        <Card title="Metas do mês" action={<Button variant="ghost" size="sm" onClick={openMetas} style={{ color: "#1E6FBF" }}>Editar metas</Button>}>
          <div style={{ fontSize: 13, color: "#6B7A90" }}>Meta de faturamento</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 500, color: "#0D1117" }}>
            <span>{fmtBRL(fat)}</span>
            <span style={{ color: "#6B7A90" }}>{fmtBRL(Number(meta?.meta_faturamento ?? 0))}</span>
          </div>
          <Bar pct={fatPct} color={fatPct >= 100 ? "#12B76A" : "#1E6FBF"} />

          <div style={{ marginTop: 14, fontSize: 13, color: "#6B7A90" }}>Meta de margem</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 500 }}>
            <span style={{ color: marOk ? "#12B76A" : "#D92D20" }}>
              {mar.toFixed(1)}% {meta?.meta_margem ? (marOk ? "✓" : "✗") : ""}
            </span>
            <span style={{ color: "#6B7A90" }}>{Number(meta?.meta_margem ?? 0).toFixed(1)}%</span>
          </div>
        </Card>
      </div>

      {/* Direita */}
      <div className="flex flex-col gap-4">
        <Card title="Alertas da loja">
          {stats && stats.alertas.length === 0 ? (
            <div style={{ fontSize: 13, color: "#12B76A", fontWeight: 500 }}>Operação normal ✓</div>
          ) : (
            <div className="flex flex-col" style={{ gap: 8 }}>
              {stats?.alertas.map((a, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#0D1117" }}>{a.titulo}</span>
                  <span style={{ color: "#D92D20", fontSize: 11, fontWeight: 600 }}>{a.tipo}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Ponto de equilíbrio">
          <Row label="PE calculado" value={fmtBRL(pe)} />
          <Row label="Faturamento atual" value={fmtBRL(peFat)} />
          <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7A90" }}>
            <span>{peAt.toFixed(0)}% atingido</span>
          </div>
          <Bar pct={peAt} color={peColor} />
        </Card>
      </div>

      <Dialog open={editMetas} onOpenChange={setEditMetas}>
        <DialogContent style={{ maxWidth: 420 }}>
          <DialogHeader>
            <DialogTitle>Editar metas do mês</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div>
              <Label>Meta de faturamento (R$)</Label>
              <Input type="number" min="0" value={metaFat} onChange={(e) => setMetaFat(e.target.value)} />
            </div>
            <div>
              <Label>Meta de margem (%)</Label>
              <Input type="number" min="0" max="100" step="0.1" value={metaMar} onChange={(e) => setMetaMar(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMetas(false)}>Cancelar</Button>
            <Button onClick={() => saveMetas.mutate()} disabled={saveMetas.isPending} style={{ background: "#1E6FBF" }}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
