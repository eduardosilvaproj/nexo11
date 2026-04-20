import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShoppingCart, Package, ClipboardList, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const sb = supabase as unknown as { from: (t: string) => any };

interface ReqItem {
  id?: string;
  descricao: string;
  quantidade: number;
  unidade?: string | null;
  origem: "comprar" | "almoxarifado";
  status: "pendente" | "concluido";
}

interface Requisicao {
  id: string;
  loja_id: string;
  contrato_id: string;
  ambiente_id: string | null;
  itens_json: ReqItem[];
  status: string;
  created_at: string;
  observacoes: string | null;
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div
      className="rounded-xl bg-white p-5 flex items-center gap-4"
      style={{ border: "0.5px solid #E8ECF2" }}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${color}15`, color }}
      >
        <Icon size={20} />
      </div>
      <div className="flex flex-col">
        <span style={{ fontSize: 12, color: "#6B7A90" }}>{label}</span>
        <span style={{ fontSize: 22, fontWeight: 600, color: "#0D1117" }}>{value}</span>
      </div>
    </div>
  );
}

export default function Compras() {
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: reqs = [], isLoading } = useQuery<Requisicao[]>({
    queryKey: ["compras-requisicoes"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("requisicoes_compra")
        .select("id, loja_id, contrato_id, ambiente_id, itens_json, status, created_at, observacoes")
        .in("status", ["aberta", "em_cotacao", "aprovada"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Requisicao[];
    },
  });

  const contratoIds = [...new Set(reqs.map((r) => r.contrato_id))];
  const ambIds = [...new Set(reqs.map((r) => r.ambiente_id).filter(Boolean) as string[])];

  const { data: contratos = [] } = useQuery({
    queryKey: ["compras-contratos", contratoIds],
    enabled: contratoIds.length > 0,
    queryFn: async () => {
      const { data } = await sb.from("contratos").select("id, cliente_nome").in("id", contratoIds);
      return data ?? [];
    },
  });
  const contratoMap = new Map(contratos.map((c: any) => [c.id, c]));

  const { data: ambs = [] } = useQuery({
    queryKey: ["compras-ambs", ambIds],
    enabled: ambIds.length > 0,
    queryFn: async () => {
      const { data } = await sb.from("contrato_ambientes").select("id, nome").in("id", ambIds);
      return data ?? [];
    },
  });
  const ambMap = new Map(ambs.map((a: any) => [a.id, a]));

  const totals = useMemo(() => {
    let pendentes = 0, comprar = 0, almox = 0;
    for (const r of reqs) {
      if (r.status !== "aberta") continue;
      pendentes++;
      for (const i of r.itens_json || []) {
        if (i.status === "concluido") continue;
        if (i.origem === "almoxarifado") almox++;
        else comprar++;
      }
    }
    return { pendentes, comprar, almox };
  }, [reqs]);

  const aberta = reqs.find((r) => r.id === openId) ?? null;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 style={{ fontSize: 22, fontWeight: 600, color: "#0D1117" }}>NEXO Compras</h1>
        <p style={{ fontSize: 13, color: "#6B7A90" }}>Requisições de itens extras vindas da Conferência técnica.</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard icon={ClipboardList} label="Requisições pendentes" value={totals.pendentes} color="#1E6FBF" />
        <StatCard icon={ShoppingCart} label="Itens a comprar" value={totals.comprar} color="#B45309" />
        <StatCard icon={Package} label="Itens do almoxarifado" value={totals.almox} color="#05873C" />
      </div>

      <div className="rounded-xl bg-white" style={{ border: "0.5px solid #E8ECF2", overflow: "hidden" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: "#F7F9FC" }}>
              <tr>
                {["Nº Req", "Cliente", "Ambiente", "Itens", "Status", "Data", "Ações"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left" style={{ fontSize: 11, color: "#6B7A90", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="p-6 text-center text-sm text-muted-foreground">Carregando…</td></tr>
              )}
              {!isLoading && reqs.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">Nenhuma requisição pendente.</td></tr>
              )}
              {reqs.map((r) => {
                const c: any = contratoMap.get(r.contrato_id);
                const a: any = r.ambiente_id ? ambMap.get(r.ambiente_id) : null;
                const qtd = (r.itens_json || []).length;
                return (
                  <tr key={r.id} style={{ borderTop: "0.5px solid #E8ECF2" }}>
                    <td className="px-4 py-3 text-sm font-mono">#{r.id.slice(0, 6)}</td>
                    <td className="px-4 py-3 text-sm">{c?.cliente_nome ?? "—"}</td>
                    <td className="px-4 py-3 text-sm">{a?.nome ?? "—"}</td>
                    <td className="px-4 py-3 text-sm">{qtd}</td>
                    <td className="px-4 py-3">
                      <span className="rounded px-2 py-0.5" style={{ fontSize: 11, fontWeight: 500, backgroundColor: "#E3F0FB", color: "#1E6FBF" }}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" onClick={() => setOpenId(r.id)}>Abrir</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <RequisicaoDrawer
        requisicao={aberta}
        cliente={aberta ? (contratoMap.get(aberta.contrato_id) as any)?.cliente_nome : ""}
        ambienteNome={aberta?.ambiente_id ? (ambMap.get(aberta.ambiente_id) as any)?.nome : ""}
        onClose={() => setOpenId(null)}
        onChanged={() => qc.invalidateQueries({ queryKey: ["compras-requisicoes"] })}
      />
    </div>
  );
}

function RequisicaoDrawer({
  requisicao,
  cliente,
  ambienteNome,
  onClose,
  onChanged,
}: {
  requisicao: Requisicao | null;
  cliente?: string;
  ambienteNome?: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const open = !!requisicao;
  const [items, setItems] = useState<ReqItem[]>([]);

  // Sync local state when requisicao changes
  useMemo(() => {
    setItems(requisicao?.itens_json ?? []);
  }, [requisicao?.id]);

  if (!requisicao) {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent />
      </Sheet>
    );
  }

  const toggleOrigem = (idx: number) => {
    setItems((arr) =>
      arr.map((it, i) => (i === idx ? { ...it, origem: it.origem === "comprar" ? "almoxarifado" : "comprar" } : it)),
    );
  };

  const toggleStatus = (idx: number) => {
    setItems((arr) =>
      arr.map((it, i) => (i === idx ? { ...it, status: it.status === "pendente" ? "concluido" : "pendente" } : it)),
    );
  };

  const salvar = async () => {
    const { error } = await sb.from("requisicoes_compra").update({ itens_json: items }).eq("id", requisicao.id);
    if (error) return toast.error(error.message);
    // Sync ambiente_itens_extras status
    for (const it of items) {
      if (it.id) {
        await sb
          .from("ambiente_itens_extras")
          .update({
            origem: it.origem,
            status_compra: it.status === "concluido" ? "recebido" : "enviado_compras",
          })
          .eq("id", it.id);
      }
    }
    toast.success("Requisição atualizada");
    onChanged();
  };

  const concluir = async () => {
    if (items.some((i) => i.status !== "concluido")) return toast.error("Há itens pendentes");
    const { error } = await sb
      .from("requisicoes_compra")
      .update({ itens_json: items, status: "recebida" })
      .eq("id", requisicao.id);
    if (error) return toast.error(error.message);

    // Notify logistica via notificacoes (gerentes da loja)
    const { data: roles } = await sb
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "gerente"])
      .eq("loja_id", requisicao.loja_id);
    const userIds = (roles ?? []).map((r: any) => r.user_id);
    if (userIds.length > 0) {
      await sb.from("notificacoes").insert(
        userIds.map((uid: string) => ({
          user_id: uid,
          contrato_id: requisicao.contrato_id,
          tipo: "compras_concluida",
          mensagem: `Requisição de compras concluída — liberar entrega do contrato`,
          link: `/contratos/${requisicao.contrato_id}`,
        })),
      );
    }

    toast.success("Requisição concluída ✓");
    onChanged();
    onClose();
  };

  const allDone = items.length > 0 && items.every((i) => i.status === "concluido");

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Requisição #{requisicao.id.slice(0, 6)}</SheetTitle>
        </SheetHeader>

        <div className="mt-2 mb-4" style={{ fontSize: 12, color: "#6B7A90" }}>
          {cliente} {ambienteNome ? `· ${ambienteNome}` : ""}
        </div>

        <div className="flex flex-col gap-2">
          {items.map((it, idx) => (
            <div key={idx} className="rounded-md p-3" style={{ border: "0.5px solid #E8ECF2" }}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#0D1117" }}>{it.descricao}</span>
                  <span style={{ fontSize: 11, color: "#6B7A90" }}>
                    {it.quantidade} {it.unidade ?? ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={it.origem === "comprar" ? "default" : "outline"}
                    onClick={() => toggleOrigem(idx)}
                  >
                    {it.origem === "comprar" ? "🛒 Comprar" : "📦 Almoxarifado"}
                  </Button>
                  <Button
                    size="sm"
                    variant={it.status === "concluido" ? "default" : "outline"}
                    onClick={() => toggleStatus(idx)}
                  >
                    {it.status === "concluido" ? "✓ Concluído" : "Pendente"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-2">
          <Button variant="outline" onClick={salvar}>Salvar alterações</Button>
          <Button onClick={concluir} disabled={!allDone}>
            <CheckCircle2 size={14} className="mr-1.5" />
            Concluir requisição
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
